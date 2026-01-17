---
name: redis-patterns
description: Redis caching strategies, pub/sub messaging, rate limiting, distributed locks, session management, and data structure patterns using ioredis. Covers cache-aside, write-through, TTL management, cache invalidation, Redlock algorithm, sliding window rate limiting, Lua scripting, streams, auto pipelining, and cluster configuration.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  ioredis: "5.9+"
---

# Redis Patterns

> **Updated 2026-01-11:** ioredis 5.9+ patterns. Added ESM import pattern notes and auto pipelining optimization section.

## Purpose

Comprehensive guide for implementing Redis-based solutions including caching, pub/sub messaging, rate limiting, distributed locks, and session management using Node.js and ioredis.

## When to Use This Skill

Automatically activates when working on:
- Implementing caching layers
- Setting up pub/sub messaging
- Building rate limiters
- Creating distributed locks
- Managing user sessions
- Working with Redis data structures
- Configuring Redis clusters

---

## Quick Start

### New Cache Implementation Checklist

- [ ] Choose caching strategy (cache-aside, write-through, write-behind)
- [ ] Define TTL policy for different data types
- [ ] Plan cache key naming convention
- [ ] Implement cache invalidation strategy
- [ ] Add error handling for Redis failures
- [ ] Consider cache stampede prevention
- [ ] Add monitoring/metrics

### Connection Setup

```typescript
import Redis from 'ioredis';

// Single instance
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
});

// With connection events
redis.on('connect', () => console.log('Redis connected'));
redis.on('error', (err) => console.error('Redis error:', err));
redis.on('close', () => console.log('Redis connection closed'));

// Cluster mode
const cluster = new Redis.Cluster([
    { host: 'node1', port: 6379 },
    { host: 'node2', port: 6379 },
    { host: 'node3', port: 6379 },
], {
    redisOptions: { password: process.env.REDIS_PASSWORD },
    scaleReads: 'slave',
});
```

---

## Core Data Structures

### When to Use Each Type

| Structure | Use Case | Example |
|-----------|----------|---------|
| **String** | Simple key-value, counters | Session data, page views |
| **Hash** | Object-like data | User profiles, settings |
| **List** | Ordered collections, queues | Recent activity, job queue |
| **Set** | Unique collections | Tags, online users |
| **Sorted Set** | Ranked data | Leaderboards, time-series |
| **Stream** | Event logs, messaging | Activity feeds, audit logs |

### String Operations

```typescript
// Basic get/set with TTL
await redis.set('user:123', JSON.stringify(userData), 'EX', 3600);
const user = JSON.parse(await redis.get('user:123') || 'null');

// Atomic increment
await redis.incr('page:views:home');
await redis.incrby('user:123:score', 10);

// Set if not exists (for locks)
const acquired = await redis.set('lock:resource', 'owner', 'NX', 'EX', 30);
```

### Hash Operations

```typescript
// Store object fields
await redis.hset('user:123', {
    name: 'John',
    email: 'john@example.com',
    role: 'admin',
});

// Get single field or all
const name = await redis.hget('user:123', 'name');
const user = await redis.hgetall('user:123');

// Increment field
await redis.hincrby('user:123', 'loginCount', 1);
```

### Sorted Set Operations

```typescript
// Leaderboard
await redis.zadd('leaderboard', score, 'player:123');

// Get top 10
const top10 = await redis.zrevrange('leaderboard', 0, 9, 'WITHSCORES');

// Get rank
const rank = await redis.zrevrank('leaderboard', 'player:123');

// Time-based (using timestamp as score)
await redis.zadd('events', Date.now(), JSON.stringify(event));
```

See [data-structures.md](resources/data-structures.md) for complete patterns.

---

## Caching Strategies

### Cache-Aside (Lazy Loading)

```typescript
async function getUser(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;

    // Try cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Cache miss - fetch from database
    const user = await db.user.findUnique({ where: { id } });

    if (user) {
        // Store in cache with TTL
        await redis.set(cacheKey, JSON.stringify(user), 'EX', 3600);
    }

    return user;
}
```

### Write-Through

```typescript
async function updateUser(id: string, data: Partial<User>): Promise<User> {
    // Update database first
    const user = await db.user.update({ where: { id }, data });

    // Then update cache
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);

    return user;
}
```

### Cache Invalidation

```typescript
// Single key
await redis.del(`user:${id}`);

// Pattern-based (use with caution in production)
const keys = await redis.keys('user:*:settings');
if (keys.length > 0) {
    await redis.del(...keys);
}

// Better: Use SCAN for large datasets
async function deleteByPattern(pattern: string): Promise<void> {
    let cursor = '0';
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    } while (cursor !== '0');
}
```

See [caching-strategies.md](resources/caching-strategies.md) for advanced patterns.

---

## Rate Limiting

### Sliding Window (Recommended)

```typescript
async function isRateLimited(
    key: string,
    limit: number,
    windowMs: number
): Promise<boolean> {
    const now = Date.now();
    const windowStart = now - windowMs;

    const pipeline = redis.pipeline();

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Add current request
    pipeline.zadd(key, now, `${now}-${Math.random()}`);
    // Count requests in window
    pipeline.zcard(key);
    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;

    return count > limit;
}

// Usage
if (await isRateLimited(`ratelimit:${userId}`, 100, 60000)) {
    throw new TooManyRequestsError();
}
```

See [rate-limiting.md](resources/rate-limiting.md) for token bucket and other algorithms.

---

## Distributed Locking

### Simple Lock

```typescript
async function acquireLock(
    resource: string,
    ttlMs: number
): Promise<string | null> {
    const lockId = crypto.randomUUID();
    const acquired = await redis.set(
        `lock:${resource}`,
        lockId,
        'NX',
        'PX',
        ttlMs
    );
    return acquired ? lockId : null;
}

async function releaseLock(resource: string, lockId: string): Promise<boolean> {
    // Lua script ensures atomic check-and-delete
    const script = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
        else
            return 0
        end
    `;
    const result = await redis.eval(script, 1, `lock:${resource}`, lockId);
    return result === 1;
}

// Usage
const lockId = await acquireLock('payment:123', 30000);
if (!lockId) {
    throw new Error('Could not acquire lock');
}

try {
    await processPayment();
} finally {
    await releaseLock('payment:123', lockId);
}
```

See [distributed-locking.md](resources/distributed-locking.md) for Redlock and advanced patterns.

---

## Pub/Sub Messaging

### Basic Pattern

```typescript
// Publisher
const publisher = new Redis();
await publisher.publish('notifications', JSON.stringify({
    type: 'NEW_MESSAGE',
    userId: '123',
    data: { ... },
}));

// Subscriber
const subscriber = new Redis();
subscriber.subscribe('notifications', (err) => {
    if (err) console.error('Subscribe error:', err);
});

subscriber.on('message', (channel, message) => {
    const event = JSON.parse(message);
    handleNotification(event);
});
```

See [pub-sub-patterns.md](resources/pub-sub-patterns.md) for pattern subscriptions and Redis Streams.

---

## Session Management

### Session Store

```typescript
interface Session {
    userId: string;
    email: string;
    roles: string[];
    createdAt: number;
    lastAccess: number;
}

class RedisSessionStore {
    private readonly prefix = 'session:';
    private readonly ttl = 86400; // 24 hours

    async create(sessionId: string, data: Session): Promise<void> {
        await redis.set(
            `${this.prefix}${sessionId}`,
            JSON.stringify(data),
            'EX',
            this.ttl
        );
    }

    async get(sessionId: string): Promise<Session | null> {
        const data = await redis.get(`${this.prefix}${sessionId}`);
        if (!data) return null;

        // Extend TTL on access
        await redis.expire(`${this.prefix}${sessionId}`, this.ttl);

        return JSON.parse(data);
    }

    async destroy(sessionId: string): Promise<void> {
        await redis.del(`${this.prefix}${sessionId}`);
    }
}
```

See [session-management.md](resources/session-management.md) for JWT blacklisting and multi-device sessions.

---

## Common Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `SET` | Set key with optional TTL | `SET key value EX 3600` |
| `GET` | Get value | `GET key` |
| `DEL` | Delete key(s) | `DEL key1 key2` |
| `EXPIRE` | Set TTL | `EXPIRE key 3600` |
| `TTL` | Get remaining TTL | `TTL key` |
| `INCR` | Increment by 1 | `INCR counter` |
| `HSET` | Set hash field(s) | `HSET user name "John"` |
| `HGETALL` | Get all hash fields | `HGETALL user` |
| `LPUSH/RPUSH` | Add to list | `LPUSH queue item` |
| `LPOP/RPOP` | Remove from list | `RPOP queue` |
| `SADD` | Add to set | `SADD tags "redis"` |
| `SMEMBERS` | Get all set members | `SMEMBERS tags` |
| `ZADD` | Add to sorted set | `ZADD leaderboard 100 "player1"` |
| `ZRANGE` | Get range by rank | `ZRANGE leaderboard 0 9` |

---

## Gotchas & Real-World Warnings

### Redis Is Single-Threaded

**One slow command blocks everything:**

```typescript
// DANGER: KEYS blocks Redis for ALL clients
const keys = await redis.keys('user:*');  // 1M keys = seconds of blocking

// BETTER: Use SCAN (non-blocking iteration)
async function* scanKeys(pattern: string) {
    let cursor = '0';
    do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = newCursor;
        for (const key of keys) yield key;
    } while (cursor !== '0');
}
```

**Other blocking commands to avoid in production:**
- `KEYS *` - Use `SCAN` instead
- `SMEMBERS` on large sets - Use `SSCAN`
- `HGETALL` on large hashes - Use `HSCAN`
- `LRANGE 0 -1` on large lists - Paginate

### Connection Pool Exhaustion

**ioredis creates connections lazily. Under load, you might exhaust limits:**

```typescript
// DANGER: No connection limit = potential exhaustion
const redis = new Redis();

// BETTER: Explicit connection management
const redis = new Redis({
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    lazyConnect: true,  // Don't connect until first command
});

// CLUSTER: Set connection pool size
const cluster = new Redis.Cluster(nodes, {
    scaleReads: 'slave',
    redisOptions: {
        maxRetriesPerRequest: 3,
    },
    // Each node gets its own pool
    clusterRetryStrategy: (times) => Math.min(times * 100, 3000),
});
```

### Cache Stampede Is Real

**When cache expires, hundreds of requests hit the database simultaneously:**

```typescript
// DANGER: Classic cache-aside with stampede vulnerability
async function getUser(id: string) {
    const cached = await redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    // 100 concurrent requests all miss cache simultaneously
    const user = await db.user.findUnique({ where: { id } });  // DB crushed
    await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
    return user;
}

// BETTER: Lock to prevent stampede
async function getUserWithLock(id: string) {
    const cached = await redis.get(`user:${id}`);
    if (cached) return JSON.parse(cached);

    const lockKey = `lock:user:${id}`;
    const locked = await redis.set(lockKey, '1', 'NX', 'EX', 10);

    if (!locked) {
        // Another request is fetching, wait and retry
        await new Promise(r => setTimeout(r, 100));
        return getUserWithLock(id);
    }

    try {
        const user = await db.user.findUnique({ where: { id } });
        await redis.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
        return user;
    } finally {
        await redis.del(lockKey);
    }
}
```

### Pub/Sub Subscribers Block

**Subscriber connections can't do anything else:**

```typescript
// DANGER: Using same connection for pub/sub AND commands
const redis = new Redis();
redis.subscribe('channel');  // This connection is now ONLY for pub/sub
await redis.get('key');  // ERROR: Connection in subscriber mode

// CORRECT: Separate connections
const publisher = new Redis();
const subscriber = new Redis();

subscriber.subscribe('channel');
subscriber.on('message', (channel, message) => { ... });

// Publisher can still run normal commands
await publisher.get('key');  // Works fine
```

### Distributed Lock Pitfalls

**Simple locks have race conditions:**

```typescript
// DANGER: Check-then-set is not atomic
const locked = await redis.get('lock:resource');
if (!locked) {
    await redis.set('lock:resource', 'me');  // Race condition!
}

// DANGER: Lock without owner verification
await redis.del('lock:resource');  // Might delete someone else's lock!

// CORRECT: Atomic acquire with owner ID
const lockId = crypto.randomUUID();
const acquired = await redis.set('lock:resource', lockId, 'NX', 'PX', 30000);

// CORRECT: Lua script for atomic release
const releaseScript = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
    else
        return 0
    end
`;
await redis.eval(releaseScript, 1, 'lock:resource', lockId);
```

### Memory Can Disappear Instantly

**Redis eviction policies can delete your data without warning:**

```typescript
// maxmemory-policy: allkeys-lru (common in managed Redis)
// When memory is full, Redis deletes LEAST RECENTLY USED keys

// DANGER: Assuming cache will always have data
const user = await redis.get('user:123');
doSomething(user);  // user might be null even if you just set it!

// Your "permanent" data can be evicted too
await redis.set('config:settings', JSON.stringify(settings));  // No TTL
// If memory pressure, this gets evicted like any other key

// SAFER: Always handle cache misses gracefully
const user = await redis.get('user:123');
if (!user) {
    // Cache miss OR eviction - fetch from source of truth
}
```

### What These Patterns Don't Tell You

1. **Persistence trade-offs** - RDB vs AOF. RDB loses recent data on crash, AOF is slower
2. **Replication lag** - Reading from replicas can return stale data
3. **Cluster slot migrations** - During resharding, some keys are temporarily unavailable
4. **Lua script atomicity** - Scripts block everything; long scripts = problems
5. **Memory fragmentation** - RSS can be much higher than used memory
6. **Sentinel failover** - Automatic failover takes seconds, clients need reconnection logic

---

## Anti-Patterns to Avoid

- Using `KEYS *` in production (blocks Redis)
- Storing large objects (>100KB) without compression
- Not setting TTL on cache entries
- Using Redis as primary database
- Ignoring connection errors
- Not using pipelines for batch operations
- Hardcoding connection strings

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand data structures | [data-structures.md](resources/data-structures.md) |
| Implement caching | [caching-strategies.md](resources/caching-strategies.md) |
| Set up pub/sub | [pub-sub-patterns.md](resources/pub-sub-patterns.md) |
| Build rate limiter | [rate-limiting.md](resources/rate-limiting.md) |
| Create distributed locks | [distributed-locking.md](resources/distributed-locking.md) |
| Manage sessions | [session-management.md](resources/session-management.md) |
| Use transactions/Lua | [transactions-and-lua.md](resources/transactions-and-lua.md) |
| Optimize performance | [performance-tuning.md](resources/performance-tuning.md) |
| Configure connection | [connection-and-setup.md](resources/connection-and-setup.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [connection-and-setup.md](resources/connection-and-setup.md)
Connection pooling, cluster configuration, Sentinel, error handling

### [data-structures.md](resources/data-structures.md)
Deep dive into Strings, Hashes, Lists, Sets, Sorted Sets, Streams

### [caching-strategies.md](resources/caching-strategies.md)
Cache-aside, write-through, cache stampede prevention, invalidation

### [pub-sub-patterns.md](resources/pub-sub-patterns.md)
Pub/Sub, pattern subscriptions, Redis Streams, event broadcasting

### [session-management.md](resources/session-management.md)
Session storage, JWT blacklisting, multi-device sessions

### [rate-limiting.md](resources/rate-limiting.md)
Sliding window, token bucket, distributed rate limiting

### [distributed-locking.md](resources/distributed-locking.md)
Redlock algorithm, mutex patterns, leader election

### [transactions-and-lua.md](resources/transactions-and-lua.md)
MULTI/EXEC, Lua scripting, atomic operations

### [performance-tuning.md](resources/performance-tuning.md)
Memory optimization, pipelining, benchmarking, monitoring

### [complete-examples.md](resources/complete-examples.md)
Full implementation examples and real-world patterns

---

**Skill Status**: COMPLETE
**Line Count**: < 450
**Progressive Disclosure**: 10 resource files
