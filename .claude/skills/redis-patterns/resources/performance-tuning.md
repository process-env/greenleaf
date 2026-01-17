# Performance Tuning

Guide to optimizing Redis performance in Node.js applications.

## Table of Contents

- [Pipelining](#pipelining)
- [Connection Optimization](#connection-optimization)
- [Memory Management](#memory-management)
- [Serialization](#serialization)
- [Monitoring](#monitoring)
- [Benchmarking](#benchmarking)

---

## Pipelining

Batch multiple commands to reduce round-trip latency.

### Basic Pipeline

```typescript
// Without pipeline - N round trips
for (const key of keys) {
    await redis.get(key);  // Each is a separate round trip
}

// With pipeline - 1 round trip
const pipeline = redis.pipeline();
for (const key of keys) {
    pipeline.get(key);
}
const results = await pipeline.exec();
// results: [[null, 'value1'], [null, 'value2'], ...]
```

### Batch Helper

```typescript
async function batchGet(keys: string[]): Promise<Map<string, string | null>> {
    if (keys.length === 0) return new Map();

    const pipeline = redis.pipeline();
    for (const key of keys) {
        pipeline.get(key);
    }

    const results = await pipeline.exec();
    const map = new Map<string, string | null>();

    results?.forEach(([err, value], index) => {
        map.set(keys[index], err ? null : (value as string | null));
    });

    return map;
}

async function batchSet(
    entries: Map<string, string>,
    ttl?: number
): Promise<void> {
    const pipeline = redis.pipeline();

    for (const [key, value] of entries) {
        if (ttl) {
            pipeline.set(key, value, 'EX', ttl);
        } else {
            pipeline.set(key, value);
        }
    }

    await pipeline.exec();
}
```

### Chunked Pipeline

```typescript
async function batchGetChunked(
    keys: string[],
    chunkSize: number = 1000
): Promise<Map<string, string | null>> {
    const map = new Map<string, string | null>();

    // Process in chunks to avoid memory issues
    for (let i = 0; i < keys.length; i += chunkSize) {
        const chunk = keys.slice(i, i + chunkSize);
        const chunkResults = await batchGet(chunk);

        for (const [key, value] of chunkResults) {
            map.set(key, value);
        }
    }

    return map;
}
```

---

## Connection Optimization

### Connection Pool Settings

```typescript
const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: 6379,

    // Retry strategy
    retryStrategy: (times) => {
        if (times > 10) return null; // Stop retrying
        return Math.min(times * 100, 3000); // Exponential backoff, max 3s
    },

    // Connection timeouts
    connectTimeout: 10000,
    commandTimeout: 5000,

    // Keep-alive
    keepAlive: 10000,
    noDelay: true,

    // Reconnect on certain errors
    reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET'];
        return targetErrors.some((e) => err.message.includes(e));
    },

    // Lazy connect (don't connect until first command)
    lazyConnect: true,

    // Enable offline queue (queue commands while reconnecting)
    enableOfflineQueue: true,
    offlineQueue: true,
});
```

### Connection Events Monitoring

```typescript
let connectionStatus = 'disconnected';
let commandsInFlight = 0;

redis.on('connect', () => {
    connectionStatus = 'connecting';
});

redis.on('ready', () => {
    connectionStatus = 'ready';
});

redis.on('error', (err) => {
    console.error('Redis error:', err.message);
});

redis.on('close', () => {
    connectionStatus = 'closed';
});

// Monitor command latency
const originalCall = redis.call.bind(redis);
redis.call = async (...args) => {
    commandsInFlight++;
    const start = process.hrtime.bigint();

    try {
        return await originalCall(...args);
    } finally {
        commandsInFlight--;
        const end = process.hrtime.bigint();
        const latencyMs = Number(end - start) / 1_000_000;

        if (latencyMs > 100) {
            console.warn(`Slow Redis command: ${args[0]} took ${latencyMs}ms`);
        }
    }
};
```

---

## Memory Management

### Key Expiration Strategies

```typescript
// Always set TTL on cache keys
await redis.set('cache:user:123', data, 'EX', 3600);

// Use SCAN instead of KEYS for cleanup
async function cleanupOldKeys(pattern: string, maxAge: number): Promise<number> {
    let cleaned = 0;
    let cursor = '0';

    do {
        const [newCursor, keys] = await redis.scan(
            cursor,
            'MATCH', pattern,
            'COUNT', 100
        );
        cursor = newCursor;

        for (const key of keys) {
            const ttl = await redis.ttl(key);
            if (ttl === -1) { // No expiration
                await redis.expire(key, maxAge);
                cleaned++;
            }
        }
    } while (cursor !== '0');

    return cleaned;
}
```

### Memory-Efficient Data Structures

```typescript
// Use Hashes for small objects (more memory efficient)
// Redis uses ziplist encoding for small hashes
await redis.hset('user:123', {
    name: 'John',
    email: 'john@example.com',
    age: '30',
});

// vs multiple keys (less efficient)
await redis.set('user:123:name', 'John');
await redis.set('user:123:email', 'john@example.com');
await redis.set('user:123:age', '30');

// Use HyperLogLog for cardinality (unique counts)
await redis.pfadd('unique:visitors', visitorId);
const uniqueCount = await redis.pfcount('unique:visitors');
// Uses ~12KB regardless of count

// Use Bitmaps for boolean flags
await redis.setbit('users:online', userId, 1);
const isOnline = await redis.getbit('users:online', userId);
```

### Compression

```typescript
import { compress, decompress } from 'lz4';

class CompressedCache {
    private readonly threshold = 1024; // Compress if > 1KB

    constructor(private redis: Redis) {}

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        const json = JSON.stringify(value);

        let stored: string | Buffer;
        let compressed = false;

        if (json.length > this.threshold) {
            stored = compress(Buffer.from(json));
            compressed = true;
        } else {
            stored = json;
        }

        const finalKey = compressed ? `c:${key}` : key;

        if (ttl) {
            await this.redis.set(finalKey, stored, 'EX', ttl);
        } else {
            await this.redis.set(finalKey, stored);
        }
    }

    async get<T>(key: string): Promise<T | null> {
        // Try compressed first
        let data = await this.redis.getBuffer(`c:${key}`);
        let compressed = true;

        if (!data) {
            const strData = await this.redis.get(key);
            if (!strData) return null;
            data = Buffer.from(strData);
            compressed = false;
        }

        const json = compressed ? decompress(data).toString() : data.toString();
        return JSON.parse(json);
    }
}
```

---

## Serialization

### Fast JSON Alternatives

```typescript
// Using fast-json-stringify for schema-based serialization
import fastJson from 'fast-json-stringify';

const stringifyUser = fastJson({
    type: 'object',
    properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
        createdAt: { type: 'number' },
    },
});

// 2-5x faster than JSON.stringify for known schemas
const json = stringifyUser(user);
await redis.set(`user:${user.id}`, json);
```

### MessagePack for Binary

```typescript
import { encode, decode } from '@msgpack/msgpack';

class MsgPackCache {
    constructor(private redis: Redis) {}

    async set(key: string, value: unknown, ttl?: number): Promise<void> {
        const packed = encode(value);

        if (ttl) {
            await this.redis.set(key, Buffer.from(packed), 'EX', ttl);
        } else {
            await this.redis.set(key, Buffer.from(packed));
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.redis.getBuffer(key);
        if (!data) return null;
        return decode(data) as T;
    }
}
```

---

## Monitoring

### Built-in Metrics

```typescript
async function getRedisMetrics(): Promise<Record<string, unknown>> {
    const info = await redis.info();

    // Parse INFO output
    const metrics: Record<string, string> = {};
    for (const line of info.split('\r\n')) {
        if (line && !line.startsWith('#')) {
            const [key, value] = line.split(':');
            if (key && value) {
                metrics[key] = value;
            }
        }
    }

    return {
        // Memory
        usedMemory: parseInt(metrics.used_memory),
        usedMemoryPeak: parseInt(metrics.used_memory_peak),
        usedMemoryLua: parseInt(metrics.used_memory_lua),

        // Clients
        connectedClients: parseInt(metrics.connected_clients),
        blockedClients: parseInt(metrics.blocked_clients),

        // Stats
        totalCommands: parseInt(metrics.total_commands_processed),
        opsPerSecond: parseInt(metrics.instantaneous_ops_per_sec),
        hitRate: parseInt(metrics.keyspace_hits) /
            (parseInt(metrics.keyspace_hits) + parseInt(metrics.keyspace_misses)),

        // Replication
        role: metrics.role,
        connectedSlaves: parseInt(metrics.connected_slaves || '0'),

        // Keys
        expiredKeys: parseInt(metrics.expired_keys),
        evictedKeys: parseInt(metrics.evicted_keys),
    };
}
```

### Slow Log

```typescript
async function getSlowQueries(count: number = 10): Promise<{
    id: number;
    timestamp: number;
    duration: number;
    command: string[];
}[]> {
    const logs = await redis.slowlog('GET', count);

    return logs.map((log: any) => ({
        id: log[0],
        timestamp: log[1],
        duration: log[2], // microseconds
        command: log[3],
    }));
}

// Configure slow log threshold (microseconds)
await redis.config('SET', 'slowlog-log-slower-than', '10000'); // 10ms
await redis.config('SET', 'slowlog-max-len', '128');
```

---

## Benchmarking

### Local Benchmark

```typescript
async function benchmark(
    name: string,
    fn: () => Promise<void>,
    iterations: number = 1000
): Promise<{ name: string; avgMs: number; opsPerSec: number }> {
    // Warmup
    for (let i = 0; i < 100; i++) {
        await fn();
    }

    const start = process.hrtime.bigint();

    for (let i = 0; i < iterations; i++) {
        await fn();
    }

    const end = process.hrtime.bigint();
    const totalMs = Number(end - start) / 1_000_000;
    const avgMs = totalMs / iterations;
    const opsPerSec = Math.round(1000 / avgMs);

    return { name, avgMs, opsPerSec };
}

// Usage
const results = await Promise.all([
    benchmark('GET', () => redis.get('test-key')),
    benchmark('SET', () => redis.set('test-key', 'value')),
    benchmark('HGETALL', () => redis.hgetall('test-hash')),
    benchmark('Pipeline 10', async () => {
        const p = redis.pipeline();
        for (let i = 0; i < 10; i++) p.get(`key-${i}`);
        await p.exec();
    }),
]);

console.table(results);
```

### Memory Usage Check

```typescript
async function analyzeMemoryUsage(pattern: string): Promise<{
    keyCount: number;
    totalMemory: number;
    avgMemory: number;
    largestKeys: { key: string; memory: number }[];
}> {
    const keys: { key: string; memory: number }[] = [];
    let cursor = '0';

    do {
        const [newCursor, foundKeys] = await redis.scan(
            cursor,
            'MATCH', pattern,
            'COUNT', 100
        );
        cursor = newCursor;

        for (const key of foundKeys) {
            const memory = await redis.memory('USAGE', key);
            keys.push({ key, memory: memory || 0 });
        }
    } while (cursor !== '0');

    keys.sort((a, b) => b.memory - a.memory);
    const totalMemory = keys.reduce((sum, k) => sum + k.memory, 0);

    return {
        keyCount: keys.length,
        totalMemory,
        avgMemory: keys.length > 0 ? totalMemory / keys.length : 0,
        largestKeys: keys.slice(0, 10),
    };
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [connection-and-setup.md](connection-and-setup.md)
- [caching-strategies.md](caching-strategies.md)
