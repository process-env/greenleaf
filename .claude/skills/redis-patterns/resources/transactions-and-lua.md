# Transactions and Lua Scripting

Guide to atomic operations in Redis using transactions and Lua scripts.

## Table of Contents

- [MULTI/EXEC Transactions](#multiexec-transactions)
- [Optimistic Locking with WATCH](#optimistic-locking-with-watch)
- [Lua Scripting Basics](#lua-scripting-basics)
- [Common Lua Patterns](#common-lua-patterns)
- [Script Management](#script-management)

---

## MULTI/EXEC Transactions

### Basic Transaction

```typescript
// Pipeline (not a transaction - commands may interleave)
const pipeline = redis.pipeline();
pipeline.set('key1', 'value1');
pipeline.set('key2', 'value2');
pipeline.incr('counter');
const results = await pipeline.exec();

// True transaction with MULTI/EXEC
const multi = redis.multi();
multi.set('key1', 'value1');
multi.set('key2', 'value2');
multi.incr('counter');
const results = await multi.exec();
// results: [[null, 'OK'], [null, 'OK'], [null, 1]]
```

### Transaction with Error Handling

```typescript
async function atomicTransfer(
    from: string,
    to: string,
    amount: number
): Promise<boolean> {
    try {
        const multi = redis.multi();
        multi.decrby(`balance:${from}`, amount);
        multi.incrby(`balance:${to}`, amount);

        const results = await multi.exec();

        // Check for errors
        for (const [err, result] of results || []) {
            if (err) {
                console.error('Transaction error:', err);
                return false;
            }
        }

        return true;
    } catch (error) {
        console.error('Transaction failed:', error);
        return false;
    }
}
```

---

## Optimistic Locking with WATCH

### Basic Pattern

```typescript
async function incrementIfLessThan(
    key: string,
    maxValue: number
): Promise<number | null> {
    while (true) {
        try {
            // Watch the key
            await redis.watch(key);

            const current = parseInt(await redis.get(key) || '0');

            if (current >= maxValue) {
                await redis.unwatch();
                return null; // Already at max
            }

            // Start transaction
            const multi = redis.multi();
            multi.incr(key);

            // Execute - returns null if key changed
            const results = await multi.exec();

            if (results === null) {
                // Key was modified - retry
                continue;
            }

            return results[0][1] as number;
        } catch (error) {
            await redis.unwatch();
            throw error;
        }
    }
}
```

### Check-And-Set Pattern

```typescript
async function updateUserIfVersion(
    userId: string,
    updates: object,
    expectedVersion: number
): Promise<boolean> {
    const key = `user:${userId}`;

    await redis.watch(key);

    const current = await redis.hgetall(key);
    const currentVersion = parseInt(current.version || '0');

    if (currentVersion !== expectedVersion) {
        await redis.unwatch();
        return false; // Version mismatch
    }

    const multi = redis.multi();
    multi.hset(key, {
        ...updates,
        version: String(expectedVersion + 1),
        updatedAt: String(Date.now()),
    });

    const results = await multi.exec();
    return results !== null;
}
```

---

## Lua Scripting Basics

### Why Use Lua?

- **Atomic execution** - Script runs without interruption
- **Reduced round trips** - Multiple operations in one call
- **Complex logic** - Conditionals, loops, calculations
- **No WATCH needed** - Simpler than optimistic locking

### Basic Syntax

```typescript
// Simple script
const result = await redis.eval(
    `return redis.call('get', KEYS[1])`,
    1,                    // Number of keys
    'mykey'              // KEYS[1]
);

// With arguments
const result = await redis.eval(
    `return redis.call('set', KEYS[1], ARGV[1])`,
    1,                    // Number of keys
    'mykey',             // KEYS[1]
    'myvalue'            // ARGV[1]
);
```

### Script Template

```typescript
interface ScriptResult<T> {
    success: boolean;
    data?: T;
    error?: string;
}

async function runScript<T>(
    script: string,
    keys: string[],
    args: (string | number)[]
): Promise<T> {
    return redis.eval(
        script,
        keys.length,
        ...keys,
        ...args.map(String)
    ) as Promise<T>;
}
```

---

## Common Lua Patterns

### Conditional Set

```typescript
// Set only if value is greater
const setIfGreater = `
    local current = tonumber(redis.call('get', KEYS[1]) or 0)
    local newValue = tonumber(ARGV[1])

    if newValue > current then
        redis.call('set', KEYS[1], newValue)
        return 1
    end
    return 0
`;

const updated = await redis.eval(setIfGreater, 1, 'highscore', '100');
```

### Atomic Get-and-Delete

```typescript
const getAndDelete = `
    local value = redis.call('get', KEYS[1])
    if value then
        redis.call('del', KEYS[1])
    end
    return value
`;

const value = await redis.eval(getAndDelete, 1, 'one-time-token');
```

### Rate Limiter

```typescript
const rateLimitScript = `
    local key = KEYS[1]
    local limit = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    -- Remove old entries
    redis.call('zremrangebyscore', key, 0, now - window)

    -- Count current entries
    local count = redis.call('zcard', key)

    if count >= limit then
        return {0, count}
    end

    -- Add new entry
    redis.call('zadd', key, now, now .. '-' .. math.random())
    redis.call('expire', key, math.ceil(window / 1000))

    return {1, count + 1}
`;

async function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): Promise<{ allowed: boolean; count: number }> {
    const [allowed, count] = await redis.eval(
        rateLimitScript,
        1,
        key,
        String(limit),
        String(windowMs),
        String(Date.now())
    ) as [number, number];

    return { allowed: allowed === 1, count };
}
```

### Safe Lock Release

```typescript
const releaseLockScript = `
    if redis.call('get', KEYS[1]) == ARGV[1] then
        return redis.call('del', KEYS[1])
    else
        return 0
    end
`;

async function releaseLock(key: string, lockId: string): Promise<boolean> {
    const result = await redis.eval(releaseLockScript, 1, key, lockId);
    return result === 1;
}
```

### Increment with Bounds

```typescript
const boundedIncrScript = `
    local key = KEYS[1]
    local increment = tonumber(ARGV[1])
    local min = tonumber(ARGV[2])
    local max = tonumber(ARGV[3])

    local current = tonumber(redis.call('get', key) or 0)
    local newValue = current + increment

    -- Clamp to bounds
    if newValue < min then newValue = min end
    if newValue > max then newValue = max end

    redis.call('set', key, newValue)
    return newValue
`;

async function boundedIncrement(
    key: string,
    increment: number,
    min: number,
    max: number
): Promise<number> {
    return redis.eval(
        boundedIncrScript,
        1,
        key,
        String(increment),
        String(min),
        String(max)
    ) as Promise<number>;
}
```

### Leaderboard Update

```typescript
const updateLeaderboardScript = `
    local leaderboard = KEYS[1]
    local player = ARGV[1]
    local score = tonumber(ARGV[2])
    local maxSize = tonumber(ARGV[3])

    -- Update score
    redis.call('zadd', leaderboard, score, player)

    -- Get new rank (0-indexed)
    local rank = redis.call('zrevrank', leaderboard, player)

    -- Trim to max size
    local size = redis.call('zcard', leaderboard)
    if size > maxSize then
        redis.call('zremrangebyrank', leaderboard, 0, size - maxSize - 1)
    end

    return {rank, score}
`;

async function updateLeaderboard(
    player: string,
    score: number,
    maxSize: number = 100
): Promise<{ rank: number; score: number }> {
    const [rank, newScore] = await redis.eval(
        updateLeaderboardScript,
        1,
        'leaderboard',
        player,
        String(score),
        String(maxSize)
    ) as [number, number];

    return { rank, score: newScore };
}
```

---

## Script Management

### Pre-load Scripts

```typescript
class ScriptManager {
    private scripts = new Map<string, string>();

    constructor(private redis: Redis) {}

    async load(name: string, script: string): Promise<string> {
        const sha = await this.redis.script('LOAD', script);
        this.scripts.set(name, sha);
        return sha;
    }

    async run<T>(
        name: string,
        keys: string[],
        args: (string | number)[]
    ): Promise<T> {
        const sha = this.scripts.get(name);
        if (!sha) {
            throw new Error(`Script ${name} not loaded`);
        }

        try {
            return await this.redis.evalsha(
                sha,
                keys.length,
                ...keys,
                ...args.map(String)
            ) as T;
        } catch (error: any) {
            if (error.message?.includes('NOSCRIPT')) {
                // Script not in cache - need to reload
                throw new Error(`Script ${name} needs reload`);
            }
            throw error;
        }
    }

    async exists(name: string): Promise<boolean> {
        const sha = this.scripts.get(name);
        if (!sha) return false;

        const [exists] = await this.redis.script('EXISTS', sha);
        return exists === 1;
    }
}

// Usage
const scripts = new ScriptManager(redis);

await scripts.load('rateLimit', rateLimitScript);
await scripts.load('releaseLock', releaseLockScript);

const result = await scripts.run('rateLimit', ['api:user:123'], [100, 60000, Date.now()]);
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [distributed-locking.md](distributed-locking.md)
- [rate-limiting.md](rate-limiting.md)
