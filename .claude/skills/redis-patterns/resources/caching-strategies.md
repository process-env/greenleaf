# Caching Strategies

Comprehensive guide to implementing effective caching with Redis.

## Table of Contents

- [Cache-Aside Pattern](#cache-aside-pattern)
- [Write-Through](#write-through)
- [Write-Behind](#write-behind)
- [Cache Invalidation](#cache-invalidation)
- [Cache Stampede Prevention](#cache-stampede-prevention)
- [TTL Strategies](#ttl-strategies)
- [Key Naming Conventions](#key-naming-conventions)

---

## Cache-Aside Pattern

Most common pattern. Application manages cache explicitly.

### Basic Implementation

```typescript
async function getUserById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // 1. Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // 2. Cache miss - fetch from database
    const user = await db.user.findUnique({ where: { id } });

    // 3. Store in cache
    if (user) {
        await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    }

    return user;
}
```

### With Error Handling

```typescript
async function getCachedData<T>(
    key: string,
    fetcher: () => Promise<T | null>,
    ttl: number = 3600
): Promise<T | null> {
    try {
        // Try cache first
        const cached = await redis.get(key);
        if (cached) {
            return JSON.parse(cached);
        }
    } catch (error) {
        // Cache error - proceed without cache
        console.error('Cache read error:', error);
    }

    // Fetch from source
    const data = await fetcher();

    // Store in cache (fire and forget)
    if (data) {
        redis.set(key, JSON.stringify(data), 'EX', ttl).catch((err) => {
            console.error('Cache write error:', err);
        });
    }

    return data;
}
```

---

## Write-Through

Write to cache and database simultaneously.

```typescript
async function updateUser(id: string, data: Partial<User>): Promise<User> {
    // 1. Update database
    const user = await db.user.update({
        where: { id },
        data,
    });

    // 2. Update cache
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

    return user;
}

async function createUser(data: CreateUserInput): Promise<User> {
    // 1. Create in database
    const user = await db.user.create({ data });

    // 2. Add to cache
    await redis.set(`user:${user.id}`, JSON.stringify(user), 'EX', 3600);

    return user;
}
```

---

## Write-Behind

Queue writes and batch update database asynchronously.

```typescript
// Write to cache immediately, queue database write
async function updateUserAsync(id: string, data: Partial<User>): Promise<void> {
    const cacheKey = `user:${id}`;

    // 1. Update cache immediately
    const current = await redis.get(cacheKey);
    const updated = { ...JSON.parse(current || '{}'), ...data };
    await redis.set(cacheKey, JSON.stringify(updated), 'EX', 3600);

    // 2. Queue for database write
    await redis.rpush('write:queue:users', JSON.stringify({ id, data }));
}

// Background worker processes queue
async function processWriteQueue(): Promise<void> {
    while (true) {
        const item = await redis.blpop('write:queue:users', 0);
        if (item) {
            const { id, data } = JSON.parse(item[1]);
            await db.user.update({ where: { id }, data });
        }
    }
}
```

---

## Cache Invalidation

### Single Key

```typescript
async function deleteUser(id: string): Promise<void> {
    await db.user.delete({ where: { id } });
    await redis.del(`user:${id}`);
}
```

### Pattern-Based (Use SCAN)

```typescript
async function invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
        `user:${userId}`,
        `user:${userId}:*`,
        `*:user:${userId}`,
    ];

    for (const pattern of patterns) {
        await deleteByPattern(pattern);
    }
}

async function deleteByPattern(pattern: string): Promise<number> {
    let deleted = 0;
    let cursor = '0';

    do {
        const [newCursor, keys] = await redis.scan(
            cursor,
            'MATCH', pattern,
            'COUNT', 100
        );
        cursor = newCursor;

        if (keys.length > 0) {
            deleted += await redis.del(...keys);
        }
    } while (cursor !== '0');

    return deleted;
}
```

### Tag-Based Invalidation

```typescript
// Store cache entry with tags
async function setCacheWithTags(
    key: string,
    value: unknown,
    tags: string[],
    ttl: number
): Promise<void> {
    const pipeline = redis.pipeline();

    // Store the value
    pipeline.set(key, JSON.stringify(value), 'EX', ttl);

    // Add key to each tag set
    for (const tag of tags) {
        pipeline.sadd(`tag:${tag}`, key);
        pipeline.expire(`tag:${tag}`, ttl);
    }

    await pipeline.exec();
}

// Invalidate by tag
async function invalidateByTag(tag: string): Promise<void> {
    const keys = await redis.smembers(`tag:${tag}`);
    if (keys.length > 0) {
        await redis.del(...keys, `tag:${tag}`);
    }
}

// Usage
await setCacheWithTags('product:123', product, ['products', 'category:electronics'], 3600);
await invalidateByTag('products'); // Invalidates all product caches
```

---

## Cache Stampede Prevention

### Locking Pattern

```typescript
async function getCachedWithLock<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600
): Promise<T> {
    // Try cache
    const cached = await redis.get(key);
    if (cached) {
        return JSON.parse(cached);
    }

    // Try to acquire lock
    const lockKey = `lock:${key}`;
    const lockId = crypto.randomUUID();
    const acquired = await redis.set(lockKey, lockId, 'NX', 'EX', 30);

    if (acquired) {
        try {
            // We have the lock - fetch and cache
            const data = await fetcher();
            await redis.set(key, JSON.stringify(data), 'EX', ttl);
            return data;
        } finally {
            // Release lock
            await redis.eval(
                `if redis.call("get", KEYS[1]) == ARGV[1] then return redis.call("del", KEYS[1]) else return 0 end`,
                1, lockKey, lockId
            );
        }
    } else {
        // Wait and retry
        await new Promise((resolve) => setTimeout(resolve, 100));
        return getCachedWithLock(key, fetcher, ttl);
    }
}
```

### Probabilistic Early Expiration

```typescript
async function getCachedWithProbabilisticRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = 3600,
    beta: number = 1
): Promise<T> {
    const cached = await redis.get(key);

    if (cached) {
        const data = JSON.parse(cached);
        const remaining = await redis.ttl(key);

        // Probabilistically refresh before expiration
        const delta = ttl - remaining;
        const random = Math.random();
        const xfetch = delta * beta * Math.log(random);

        if (remaining + xfetch <= 0) {
            // Refresh in background
            fetcher().then((newData) => {
                redis.set(key, JSON.stringify(newData), 'EX', ttl);
            });
        }

        return data;
    }

    // Cache miss
    const data = await fetcher();
    await redis.set(key, JSON.stringify(data), 'EX', ttl);
    return data;
}
```

---

## TTL Strategies

### By Data Type

```typescript
const TTL = {
    SESSION: 86400,        // 24 hours
    USER_PROFILE: 3600,    // 1 hour
    PRODUCT_LIST: 300,     // 5 minutes
    SEARCH_RESULTS: 60,    // 1 minute
    RATE_LIMIT: 60,        // 1 minute window
    FEATURE_FLAGS: 300,    // 5 minutes
};
```

### Stale-While-Revalidate

```typescript
interface CacheEntry<T> {
    data: T;
    staleAt: number;
    expireAt: number;
}

async function getWithStaleWhileRevalidate<T>(
    key: string,
    fetcher: () => Promise<T>,
    freshFor: number = 300,   // 5 minutes fresh
    staleFor: number = 3600   // 1 hour stale
): Promise<T> {
    const cached = await redis.get(key);

    if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        const now = Date.now();

        if (now < entry.staleAt) {
            // Fresh - return immediately
            return entry.data;
        }

        if (now < entry.expireAt) {
            // Stale but usable - return and refresh in background
            fetcher().then((data) => {
                const newEntry: CacheEntry<T> = {
                    data,
                    staleAt: Date.now() + freshFor * 1000,
                    expireAt: Date.now() + staleFor * 1000,
                };
                redis.set(key, JSON.stringify(newEntry), 'EX', staleFor);
            });
            return entry.data;
        }
    }

    // Expired or miss - fetch fresh
    const data = await fetcher();
    const entry: CacheEntry<T> = {
        data,
        staleAt: Date.now() + freshFor * 1000,
        expireAt: Date.now() + staleFor * 1000,
    };
    await redis.set(key, JSON.stringify(entry), 'EX', staleFor);
    return data;
}
```

---

## Key Naming Conventions

### Recommended Format

```
{entity}:{id}:{subresource}

Examples:
user:123
user:123:profile
user:123:settings
product:456
product:456:reviews
cache:search:q=redis&page=1
session:abc123
ratelimit:api:user:123
lock:payment:order:789
```

### Key Generation Helper

```typescript
function cacheKey(...parts: (string | number)[]): string {
    return parts.join(':');
}

// Usage
const key = cacheKey('user', userId, 'profile');
// => "user:123:profile"
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [data-structures.md](data-structures.md)
- [performance-tuning.md](performance-tuning.md)
