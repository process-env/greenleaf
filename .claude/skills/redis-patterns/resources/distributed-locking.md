# Distributed Locking

Complete guide to implementing distributed locks with Redis.

## Table of Contents

- [Simple Lock](#simple-lock)
- [Lock with Auto-Extension](#lock-with-auto-extension)
- [Redlock Algorithm](#redlock-algorithm)
- [Read-Write Locks](#read-write-locks)
- [Semaphores](#semaphores)
- [Leader Election](#leader-election)

---

## Simple Lock

Basic lock for single Redis instance.

```typescript
class SimpleLock {
    constructor(
        private redis: Redis,
        private resource: string,
        private ttlMs: number = 30000
    ) {}

    async acquire(): Promise<string | null> {
        const lockId = crypto.randomUUID();
        const acquired = await this.redis.set(
            `lock:${this.resource}`,
            lockId,
            'NX',
            'PX',
            this.ttlMs
        );
        return acquired ? lockId : null;
    }

    async release(lockId: string): Promise<boolean> {
        // Atomic check-and-delete using Lua
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        const result = await this.redis.eval(script, 1, `lock:${this.resource}`, lockId);
        return result === 1;
    }

    async extend(lockId: string, additionalMs: number): Promise<boolean> {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("pexpire", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;
        const result = await this.redis.eval(
            script, 1,
            `lock:${this.resource}`,
            lockId,
            String(additionalMs)
        );
        return result === 1;
    }
}

// Usage
const lock = new SimpleLock(redis, 'payment:order:123');
const lockId = await lock.acquire();

if (!lockId) {
    throw new Error('Could not acquire lock');
}

try {
    await processPayment();
} finally {
    await lock.release(lockId);
}
```

---

## Lock with Auto-Extension

Automatically extends lock while work is in progress.

```typescript
class AutoExtendingLock {
    private lockId: string | null = null;
    private extensionTimer: NodeJS.Timer | null = null;

    constructor(
        private redis: Redis,
        private resource: string,
        private ttlMs: number = 30000,
        private extensionIntervalMs: number = 10000
    ) {}

    async acquire(): Promise<boolean> {
        this.lockId = crypto.randomUUID();
        const acquired = await this.redis.set(
            `lock:${this.resource}`,
            this.lockId,
            'NX',
            'PX',
            this.ttlMs
        );

        if (acquired) {
            this.startExtensionTimer();
            return true;
        }

        this.lockId = null;
        return false;
    }

    async release(): Promise<boolean> {
        this.stopExtensionTimer();

        if (!this.lockId) return false;

        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        const result = await this.redis.eval(script, 1, `lock:${this.resource}`, this.lockId);
        this.lockId = null;
        return result === 1;
    }

    private startExtensionTimer(): void {
        this.extensionTimer = setInterval(async () => {
            if (this.lockId) {
                await this.extend();
            }
        }, this.extensionIntervalMs);
    }

    private stopExtensionTimer(): void {
        if (this.extensionTimer) {
            clearInterval(this.extensionTimer);
            this.extensionTimer = null;
        }
    }

    private async extend(): Promise<void> {
        if (!this.lockId) return;

        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("pexpire", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;
        const result = await this.redis.eval(
            script, 1,
            `lock:${this.resource}`,
            this.lockId,
            String(this.ttlMs)
        );

        if (result !== 1) {
            // Lock lost - stop timer
            this.stopExtensionTimer();
            this.lockId = null;
        }
    }
}

// Usage with automatic cleanup
async function withLock<T>(
    resource: string,
    fn: () => Promise<T>
): Promise<T> {
    const lock = new AutoExtendingLock(redis, resource);

    if (!(await lock.acquire())) {
        throw new Error(`Could not acquire lock for ${resource}`);
    }

    try {
        return await fn();
    } finally {
        await lock.release();
    }
}

await withLock('order:123', async () => {
    await processOrder();
});
```

---

## Redlock Algorithm

For high-availability with multiple Redis instances.

```typescript
import Redlock from 'redlock';

const redlock = new Redlock(
    // Array of Redis clients
    [redis1, redis2, redis3],
    {
        // Expected clock drift
        driftFactor: 0.01,
        // Max retries
        retryCount: 10,
        // Time between retries
        retryDelay: 200,
        // Randomize retry delay
        retryJitter: 200,
        // Auto-extend locks
        automaticExtensionThreshold: 500,
    }
);

// Event handlers
redlock.on('clientError', (err) => {
    console.error('Redlock client error:', err);
});

// Acquire lock
async function processWithRedlock(resourceId: string): Promise<void> {
    let lock: Redlock.Lock | null = null;

    try {
        // Acquire lock for 30 seconds
        lock = await redlock.acquire([`locks:${resourceId}`], 30000);

        // Lock acquired - do work
        await doWork(resourceId);

    } catch (error) {
        if (error instanceof Redlock.LockError) {
            console.log('Could not acquire lock');
        } else {
            throw error;
        }
    } finally {
        if (lock) {
            await lock.release();
        }
    }
}

// Using `using` statement (if supported)
async function processWithUsing(resourceId: string): Promise<void> {
    await redlock.using(
        [`locks:${resourceId}`],
        30000,
        async (signal) => {
            // Check if lock is about to expire
            if (signal.aborted) {
                throw new Error('Lock was lost');
            }

            await doWork(resourceId);
        }
    );
}
```

---

## Read-Write Locks

Allow multiple readers or single writer.

```typescript
class ReadWriteLock {
    constructor(
        private redis: Redis,
        private resource: string,
        private ttlMs: number = 30000
    ) {}

    async acquireRead(): Promise<string | null> {
        const lockId = crypto.randomUUID();
        const script = `
            -- Check if write lock exists
            if redis.call("exists", KEYS[2]) == 1 then
                return nil
            end
            -- Add read lock
            redis.call("sadd", KEYS[1], ARGV[1])
            redis.call("pexpire", KEYS[1], ARGV[2])
            return ARGV[1]
        `;

        const result = await this.redis.eval(
            script, 2,
            `rwlock:${this.resource}:readers`,
            `rwlock:${this.resource}:writer`,
            lockId,
            String(this.ttlMs)
        );

        return result as string | null;
    }

    async releaseRead(lockId: string): Promise<boolean> {
        const removed = await this.redis.srem(
            `rwlock:${this.resource}:readers`,
            lockId
        );
        return removed === 1;
    }

    async acquireWrite(): Promise<string | null> {
        const lockId = crypto.randomUUID();
        const script = `
            -- Check if any read locks or write lock exists
            if redis.call("scard", KEYS[1]) > 0 then
                return nil
            end
            if redis.call("exists", KEYS[2]) == 1 then
                return nil
            end
            -- Set write lock
            redis.call("set", KEYS[2], ARGV[1], "PX", ARGV[2])
            return ARGV[1]
        `;

        const result = await this.redis.eval(
            script, 2,
            `rwlock:${this.resource}:readers`,
            `rwlock:${this.resource}:writer`,
            lockId,
            String(this.ttlMs)
        );

        return result as string | null;
    }

    async releaseWrite(lockId: string): Promise<boolean> {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        const result = await this.redis.eval(
            script, 1,
            `rwlock:${this.resource}:writer`,
            lockId
        );
        return result === 1;
    }
}
```

---

## Semaphores

Limit concurrent access to a resource.

```typescript
class Semaphore {
    constructor(
        private redis: Redis,
        private resource: string,
        private maxConcurrent: number,
        private ttlMs: number = 30000
    ) {}

    async acquire(): Promise<string | null> {
        const lockId = crypto.randomUUID();
        const now = Date.now();

        const script = `
            -- Clean up expired entries
            redis.call("zremrangebyscore", KEYS[1], 0, ARGV[3])

            -- Check capacity
            local count = redis.call("zcard", KEYS[1])
            if count >= tonumber(ARGV[1]) then
                return nil
            end

            -- Add entry with expiration as score
            redis.call("zadd", KEYS[1], ARGV[3] + ARGV[4], ARGV[2])
            return ARGV[2]
        `;

        const result = await this.redis.eval(
            script, 1,
            `semaphore:${this.resource}`,
            String(this.maxConcurrent),
            lockId,
            String(now),
            String(this.ttlMs)
        );

        return result as string | null;
    }

    async release(lockId: string): Promise<boolean> {
        const removed = await this.redis.zrem(
            `semaphore:${this.resource}`,
            lockId
        );
        return removed === 1;
    }

    async getAvailable(): Promise<number> {
        const now = Date.now();
        await this.redis.zremrangebyscore(`semaphore:${this.resource}`, 0, now);
        const count = await this.redis.zcard(`semaphore:${this.resource}`);
        return this.maxConcurrent - count;
    }
}

// Usage
const semaphore = new Semaphore(redis, 'api-calls', 10);
const lockId = await semaphore.acquire();

if (!lockId) {
    throw new Error('Too many concurrent requests');
}

try {
    await makeApiCall();
} finally {
    await semaphore.release(lockId);
}
```

---

## Leader Election

Elect a single leader among multiple instances.

```typescript
class LeaderElection {
    private isLeader = false;
    private heartbeatTimer: NodeJS.Timer | null = null;

    constructor(
        private redis: Redis,
        private electionKey: string,
        private instanceId: string,
        private ttlMs: number = 30000,
        private heartbeatMs: number = 10000
    ) {}

    async start(): Promise<void> {
        await this.tryBecomeLeader();

        // Keep trying to become leader
        this.heartbeatTimer = setInterval(async () => {
            await this.tryBecomeLeader();
        }, this.heartbeatMs);
    }

    async stop(): Promise<void> {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }

        if (this.isLeader) {
            await this.abdicate();
        }
    }

    private async tryBecomeLeader(): Promise<void> {
        const script = `
            local currentLeader = redis.call("get", KEYS[1])
            if currentLeader == ARGV[1] then
                -- We are leader, extend TTL
                redis.call("pexpire", KEYS[1], ARGV[2])
                return 1
            elseif currentLeader == false then
                -- No leader, try to become one
                redis.call("set", KEYS[1], ARGV[1], "PX", ARGV[2])
                return 1
            else
                -- Someone else is leader
                return 0
            end
        `;

        const result = await this.redis.eval(
            script, 1,
            this.electionKey,
            this.instanceId,
            String(this.ttlMs)
        );

        const wasLeader = this.isLeader;
        this.isLeader = result === 1;

        if (!wasLeader && this.isLeader) {
            console.log(`${this.instanceId} became leader`);
            this.onBecomeLeader();
        } else if (wasLeader && !this.isLeader) {
            console.log(`${this.instanceId} lost leadership`);
            this.onLoseLeadership();
        }
    }

    private async abdicate(): Promise<void> {
        const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        await this.redis.eval(script, 1, this.electionKey, this.instanceId);
        this.isLeader = false;
    }

    getIsLeader(): boolean {
        return this.isLeader;
    }

    // Override these in subclass
    protected onBecomeLeader(): void {}
    protected onLoseLeadership(): void {}
}

// Usage
const election = new LeaderElection(
    redis,
    'leader:scheduler',
    process.env.INSTANCE_ID || crypto.randomUUID()
);

await election.start();

if (election.getIsLeader()) {
    runScheduledJobs();
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [transactions-and-lua.md](transactions-and-lua.md)
- [rate-limiting.md](rate-limiting.md)
