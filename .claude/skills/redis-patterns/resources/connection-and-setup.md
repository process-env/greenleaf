# Connection and Setup - Redis Configuration

Complete guide to Redis connection management, clustering, and configuration with ioredis.

## Table of Contents

- [Single Instance Connection](#single-instance-connection)
- [Connection Pooling](#connection-pooling)
- [Cluster Configuration](#cluster-configuration)
- [Sentinel Setup](#sentinel-setup)
- [Error Handling](#error-handling)
- [Environment Configuration](#environment-configuration)

---

## Single Instance Connection

### Basic Connection

```typescript
import Redis from 'ioredis';

const redis = new Redis({
    host: 'localhost',
    port: 6379,
    password: undefined,
    db: 0,
});
```

### With All Options

```typescript
const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),

    // Connection behavior
    lazyConnect: true,              // Don't connect until first command
    connectTimeout: 10000,          // 10 seconds
    disconnectTimeout: 2000,

    // Retry configuration
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    retryDelayOnClusterDown: 100,

    // Keep-alive
    keepAlive: 10000,               // 10 seconds

    // TLS (for Redis Cloud, etc.)
    tls: process.env.REDIS_TLS === 'true' ? {} : undefined,

    // Command timeout
    commandTimeout: 5000,
});

// Connect manually when using lazyConnect
await redis.connect();
```

### Connection URL

```typescript
// Redis URL format: redis://[:password@]host[:port][/db]
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379/0');

// With TLS
const redis = new Redis('rediss://user:password@host:6379/0');
```

---

## Connection Pooling

### Generic Pool Pattern

```typescript
import Redis from 'ioredis';
import genericPool from 'generic-pool';

const factory = {
    create: async () => {
        const client = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
        });
        await new Promise((resolve) => client.once('ready', resolve));
        return client;
    },
    destroy: async (client: Redis) => {
        await client.quit();
    },
};

const pool = genericPool.createPool(factory, {
    max: 10,           // Maximum connections
    min: 2,            // Minimum connections
    acquireTimeoutMillis: 3000,
    idleTimeoutMillis: 30000,
});

// Usage
async function withRedis<T>(fn: (redis: Redis) => Promise<T>): Promise<T> {
    const client = await pool.acquire();
    try {
        return await fn(client);
    } finally {
        await pool.release(client);
    }
}
```

### Singleton Pattern (Recommended for most apps)

```typescript
// lib/redis.ts
import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
    if (!redis) {
        redis = new Redis({
            host: process.env.REDIS_HOST,
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            maxRetriesPerRequest: 3,
        });

        redis.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
    }
    return redis;
}

export async function closeRedis(): Promise<void> {
    if (redis) {
        await redis.quit();
        redis = null;
    }
}
```

---

## Cluster Configuration

### Basic Cluster

```typescript
import Redis from 'ioredis';

const cluster = new Redis.Cluster([
    { host: 'node1.redis.example.com', port: 6379 },
    { host: 'node2.redis.example.com', port: 6379 },
    { host: 'node3.redis.example.com', port: 6379 },
], {
    redisOptions: {
        password: process.env.REDIS_PASSWORD,
        tls: {},
    },
    scaleReads: 'slave',           // Read from replicas
    maxRedirections: 16,           // Max MOVED/ASK redirections
    retryDelayOnFailover: 100,
    retryDelayOnClusterDown: 100,
    enableReadyCheck: true,
});
```

### Cluster with NAT/Docker

```typescript
const cluster = new Redis.Cluster([
    { host: 'localhost', port: 7000 },
    { host: 'localhost', port: 7001 },
    { host: 'localhost', port: 7002 },
], {
    natMap: {
        '172.17.0.2:7000': { host: 'localhost', port: 7000 },
        '172.17.0.3:7001': { host: 'localhost', port: 7001 },
        '172.17.0.4:7002': { host: 'localhost', port: 7002 },
    },
});
```

---

## Sentinel Setup

### High Availability with Sentinel

```typescript
const redis = new Redis({
    sentinels: [
        { host: 'sentinel1.example.com', port: 26379 },
        { host: 'sentinel2.example.com', port: 26379 },
        { host: 'sentinel3.example.com', port: 26379 },
    ],
    name: 'mymaster',              // Sentinel master name
    password: process.env.REDIS_PASSWORD,
    sentinelPassword: process.env.SENTINEL_PASSWORD,
    role: 'master',                // 'master' or 'slave'
});
```

---

## Error Handling

### Connection Events

```typescript
const redis = new Redis();

redis.on('connect', () => {
    console.log('Redis: Connecting...');
});

redis.on('ready', () => {
    console.log('Redis: Ready to accept commands');
});

redis.on('error', (err) => {
    console.error('Redis: Error', err);
    // Don't exit - ioredis will attempt reconnection
});

redis.on('close', () => {
    console.log('Redis: Connection closed');
});

redis.on('reconnecting', (delay: number) => {
    console.log(`Redis: Reconnecting in ${delay}ms`);
});

redis.on('end', () => {
    console.log('Redis: Connection ended (no more reconnections)');
});
```

### Graceful Shutdown

```typescript
async function gracefulShutdown(): Promise<void> {
    console.log('Shutting down Redis connection...');

    // Wait for pending commands
    await redis.quit();

    console.log('Redis connection closed');
    process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
```

### Command Error Handling

```typescript
try {
    await redis.set('key', 'value');
} catch (error) {
    if (error instanceof Redis.ReplyError) {
        // Redis returned an error response
        console.error('Redis reply error:', error.message);
    } else if (error.code === 'ECONNREFUSED') {
        // Connection refused
        console.error('Cannot connect to Redis');
    } else if (error.code === 'ETIMEDOUT') {
        // Connection timed out
        console.error('Redis connection timed out');
    } else {
        throw error;
    }
}
```

---

## Environment Configuration

### Recommended .env Structure

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

# Connection Pool
REDIS_POOL_MIN=2
REDIS_POOL_MAX=10

# Cluster (comma-separated nodes)
REDIS_CLUSTER_NODES=node1:6379,node2:6379,node3:6379

# Sentinel
REDIS_SENTINEL_HOSTS=sentinel1:26379,sentinel2:26379
REDIS_SENTINEL_MASTER=mymaster
```

### Config Factory

```typescript
interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    db: number;
    tls?: boolean;
}

function getRedisConfig(): RedisConfig {
    return {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        db: parseInt(process.env.REDIS_DB || '0'),
        tls: process.env.REDIS_TLS === 'true',
    };
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [performance-tuning.md](performance-tuning.md)
