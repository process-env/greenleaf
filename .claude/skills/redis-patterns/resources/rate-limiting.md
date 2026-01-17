# Rate Limiting

Comprehensive guide to implementing rate limiting with Redis.

## Table of Contents

- [Fixed Window](#fixed-window)
- [Sliding Window Log](#sliding-window-log)
- [Sliding Window Counter](#sliding-window-counter)
- [Token Bucket](#token-bucket)
- [Leaky Bucket](#leaky-bucket)
- [Distributed Rate Limiting](#distributed-rate-limiting)

---

## Fixed Window

Simplest approach. Count requests in fixed time windows.

```typescript
async function fixedWindowRateLimit(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const windowKey = `ratelimit:${key}:${Math.floor(Date.now() / 1000 / windowSeconds)}`;

    const pipeline = redis.pipeline();
    pipeline.incr(windowKey);
    pipeline.expire(windowKey, windowSeconds);

    const results = await pipeline.exec();
    const count = results?.[0]?.[1] as number;

    const resetAt = Math.ceil(Date.now() / 1000 / windowSeconds) * windowSeconds;

    return {
        allowed: count <= limit,
        remaining: Math.max(0, limit - count),
        resetAt,
    };
}

// Usage
const result = await fixedWindowRateLimit(`user:${userId}`, 100, 60);
if (!result.allowed) {
    throw new TooManyRequestsError(`Rate limit exceeded. Reset at ${result.resetAt}`);
}
```

**Pros**: Simple, low memory
**Cons**: Burst at window boundaries (can allow 2x limit)

---

## Sliding Window Log

Track each request timestamp. Most accurate but uses more memory.

```typescript
async function slidingWindowLog(
    key: string,
    limit: number,
    windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const windowStart = now - windowMs;
    const member = `${now}-${Math.random().toString(36).slice(2)}`;

    const pipeline = redis.pipeline();
    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart);
    // Add current request
    pipeline.zadd(key, now, member);
    // Count requests in window
    pipeline.zcard(key);
    // Set expiry
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    const count = results?.[2]?.[1] as number;

    if (count > limit) {
        // Remove the request we just added (denied)
        await redis.zrem(key, member);
        return { allowed: false, remaining: 0 };
    }

    return {
        allowed: true,
        remaining: limit - count,
    };
}

// Usage
const result = await slidingWindowLog(`api:${userId}`, 100, 60000);
```

**Pros**: Accurate, no burst issues
**Cons**: Higher memory usage, O(n) cleanup

---

## Sliding Window Counter

Weighted average between current and previous window.

```typescript
async function slidingWindowCounter(
    key: string,
    limit: number,
    windowSeconds: number
): Promise<{ allowed: boolean; remaining: number }> {
    const now = Date.now();
    const currentWindow = Math.floor(now / 1000 / windowSeconds);
    const previousWindow = currentWindow - 1;

    const currentKey = `ratelimit:${key}:${currentWindow}`;
    const previousKey = `ratelimit:${key}:${previousWindow}`;

    // Get counts from both windows
    const [currentCount, previousCount] = await redis.mget(currentKey, previousKey);

    // Calculate weighted count
    const elapsedInWindow = (now / 1000) % windowSeconds;
    const previousWeight = 1 - (elapsedInWindow / windowSeconds);

    const weightedCount =
        (parseInt(previousCount || '0') * previousWeight) +
        parseInt(currentCount || '0');

    if (weightedCount >= limit) {
        return { allowed: false, remaining: 0 };
    }

    // Increment current window
    const pipeline = redis.pipeline();
    pipeline.incr(currentKey);
    pipeline.expire(currentKey, windowSeconds * 2);
    await pipeline.exec();

    return {
        allowed: true,
        remaining: Math.floor(limit - weightedCount - 1),
    };
}
```

**Pros**: Good balance of accuracy and memory
**Cons**: Slightly complex calculation

---

## Token Bucket

Tokens regenerate over time. Allows controlled bursts.

```typescript
interface TokenBucket {
    tokens: number;
    lastRefill: number;
}

async function tokenBucketRateLimit(
    key: string,
    capacity: number,           // Max tokens
    refillRate: number,         // Tokens per second
    tokensRequired: number = 1
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
    const now = Date.now();
    const bucketKey = `bucket:${key}`;

    // Lua script for atomic operation
    const script = `
        local bucket = redis.call('HGETALL', KEYS[1])
        local tokens = tonumber(bucket[2]) or ${capacity}
        local lastRefill = tonumber(bucket[4]) or ${now}

        -- Calculate tokens to add
        local elapsed = (${now} - lastRefill) / 1000
        local refill = elapsed * ${refillRate}
        tokens = math.min(${capacity}, tokens + refill)

        -- Try to consume tokens
        if tokens >= ${tokensRequired} then
            tokens = tokens - ${tokensRequired}
            redis.call('HSET', KEYS[1], 'tokens', tokens, 'lastRefill', ${now})
            redis.call('EXPIRE', KEYS[1], ${Math.ceil(capacity / refillRate) + 1})
            return {1, tokens}
        else
            return {0, tokens}
        end
    `;

    const result = await redis.eval(script, 1, bucketKey) as [number, number];
    const [allowed, remaining] = result;

    if (!allowed) {
        const tokensNeeded = tokensRequired - remaining;
        const retryAfter = Math.ceil(tokensNeeded / refillRate * 1000);
        return { allowed: false, remaining: 0, retryAfter };
    }

    return { allowed: true, remaining: Math.floor(remaining) };
}

// Usage: 100 requests per minute, can burst up to 10
const result = await tokenBucketRateLimit(`api:${userId}`, 10, 100/60);
```

**Pros**: Allows controlled bursts, smooth rate limiting
**Cons**: More complex, requires Lua for atomicity

---

## Leaky Bucket

Requests processed at constant rate. Queue overflow rejected.

```typescript
async function leakyBucketRateLimit(
    key: string,
    capacity: number,           // Queue size
    leakRate: number            // Requests per second
): Promise<{ allowed: boolean; queuePosition?: number }> {
    const now = Date.now();
    const bucketKey = `leaky:${key}`;

    const script = `
        local bucket = redis.call('LRANGE', KEYS[1], 0, -1)
        local leaked = 0

        -- Leak old requests
        for i, timestamp in ipairs(bucket) do
            if (${now} - tonumber(timestamp)) >= (1000 / ${leakRate}) then
                leaked = leaked + 1
            else
                break
            end
        end

        if leaked > 0 then
            redis.call('LTRIM', KEYS[1], leaked, -1)
        end

        -- Check capacity
        local currentSize = redis.call('LLEN', KEYS[1])
        if currentSize >= ${capacity} then
            return {0, currentSize}
        end

        -- Add to queue
        redis.call('RPUSH', KEYS[1], ${now})
        redis.call('EXPIRE', KEYS[1], ${Math.ceil(capacity / leakRate) + 1})
        return {1, currentSize + 1}
    `;

    const result = await redis.eval(script, 1, bucketKey) as [number, number];
    const [allowed, queuePosition] = result;

    return {
        allowed: allowed === 1,
        queuePosition: allowed === 1 ? queuePosition : undefined,
    };
}
```

**Pros**: Constant output rate, predictable
**Cons**: Doesn't handle bursts well

---

## Distributed Rate Limiting

### Per-Instance with Sync

```typescript
class DistributedRateLimiter {
    private localCount = 0;
    private syncInterval = 1000; // Sync every second

    constructor(
        private key: string,
        private limit: number,
        private windowMs: number
    ) {
        setInterval(() => this.syncToRedis(), this.syncInterval);
    }

    async check(): Promise<boolean> {
        // Quick local check
        if (this.localCount >= this.limit * 0.8) {
            // Near limit - check Redis
            const globalCount = await this.getGlobalCount();
            return globalCount < this.limit;
        }

        this.localCount++;
        return true;
    }

    private async syncToRedis(): Promise<void> {
        if (this.localCount > 0) {
            await redis.incrby(`ratelimit:${this.key}`, this.localCount);
            this.localCount = 0;
        }
    }

    private async getGlobalCount(): Promise<number> {
        const count = await redis.get(`ratelimit:${this.key}`);
        return parseInt(count || '0');
    }
}
```

### Multi-Region Rate Limiting

```typescript
async function multiRegionRateLimit(
    key: string,
    globalLimit: number,
    regions: string[]
): Promise<boolean> {
    const regionKey = `ratelimit:${key}:${process.env.REGION}`;
    const regionLimit = Math.floor(globalLimit / regions.length);

    // Check local region first
    const localAllowed = await slidingWindowCounter(regionKey, regionLimit, 60);

    if (!localAllowed.allowed) {
        // Try to borrow from other regions
        for (const region of regions) {
            if (region === process.env.REGION) continue;

            const otherKey = `ratelimit:${key}:${region}`;
            const otherCount = parseInt(await redis.get(otherKey) || '0');

            if (otherCount < regionLimit * 0.5) {
                // Region has capacity - allow
                return true;
            }
        }
        return false;
    }

    return true;
}
```

---

## Middleware Example

```typescript
import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
    windowMs: number;
    max: number;
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response) => void;
}

function createRateLimiter(options: RateLimitOptions) {
    const {
        windowMs,
        max,
        keyGenerator = (req) => req.ip || 'unknown',
        handler = (req, res) => {
            res.status(429).json({ error: 'Too many requests' });
        },
    } = options;

    return async (req: Request, res: Response, next: NextFunction) => {
        const key = keyGenerator(req);
        const result = await slidingWindowLog(key, max, windowMs);

        // Set rate limit headers
        res.set('X-RateLimit-Limit', String(max));
        res.set('X-RateLimit-Remaining', String(result.remaining));

        if (!result.allowed) {
            return handler(req, res);
        }

        next();
    };
}

// Usage
app.use('/api', createRateLimiter({
    windowMs: 60000,  // 1 minute
    max: 100,         // 100 requests per minute
    keyGenerator: (req) => req.user?.id || req.ip,
}));
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [distributed-locking.md](distributed-locking.md)
- [transactions-and-lua.md](transactions-and-lua.md)
