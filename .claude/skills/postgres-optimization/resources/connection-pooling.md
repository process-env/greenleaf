# Connection Pooling

Guide to PostgreSQL connection management and pooling.

## Table of Contents

- [Why Connection Pooling](#why-connection-pooling)
- [PgBouncer](#pgbouncer)
- [Application-Level Pooling](#application-level-pooling)
- [Connection Settings](#connection-settings)
- [Monitoring](#monitoring)

---

## Why Connection Pooling

### The Problem

```
Each PostgreSQL connection:
- Spawns a new process (~10MB RAM)
- Has connection overhead (~100-200ms)
- Limited by max_connections (default: 100)
```

### Benefits of Pooling

- Reduces connection overhead
- Limits server resource usage
- Handles connection spikes
- Maintains warm connections

---

## PgBouncer

### Installation

```bash
# Ubuntu/Debian
apt install pgbouncer

# macOS
brew install pgbouncer
```

### Configuration (pgbouncer.ini)

```ini
[databases]
mydb = host=localhost port=5432 dbname=mydb

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3

# Timeouts
server_connect_timeout = 15
server_idle_timeout = 60
server_lifetime = 3600
client_idle_timeout = 0
query_timeout = 0
```

### Pool Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| **session** | Connection held for session | Long-lived connections |
| **transaction** | Connection held for transaction | Most applications |
| **statement** | Connection per statement | Simple queries only |

```ini
# Transaction mode (recommended)
pool_mode = transaction

# Doesn't work with transaction mode:
# - SET/session variables
# - LISTEN/NOTIFY
# - Prepared statements
# - Advisory locks
```

### User Authentication

```bash
# userlist.txt format
"username" "password"
"myapp" "md5d4e8e8..."  # MD5 hash

# Generate MD5 hash
echo -n "password" | md5sum
# Or use: SELECT concat('md5', md5('passwordusername'));
```

### Connecting Through PgBouncer

```typescript
// Application connects to PgBouncer port (6432)
const pool = new Pool({
    host: 'localhost',
    port: 6432,  // PgBouncer, not PostgreSQL
    database: 'mydb',
    user: 'myapp',
    password: 'password',
});
```

---

## Application-Level Pooling

### Node.js with pg

```typescript
import { Pool } from 'pg';

const pool = new Pool({
    host: process.env.DB_HOST,
    port: 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,

    // Pool settings
    max: 20,                    // Max connections
    min: 5,                     // Min connections
    idleTimeoutMillis: 30000,   // Close idle after 30s
    connectionTimeoutMillis: 5000,
    maxUses: 7500,              // Close after N queries
});

// Error handling
pool.on('error', (err) => {
    console.error('Pool error:', err);
});

// Usage
async function query(sql: string, params?: unknown[]) {
    const client = await pool.connect();
    try {
        return await client.query(sql, params);
    } finally {
        client.release();
    }
}

// Graceful shutdown
async function shutdown() {
    await pool.end();
}
```

### Prisma Connection Pooling

```typescript
// prisma/schema.prisma
datasource db {
    provider = "postgresql"
    url      = env("DATABASE_URL")
}

// DATABASE_URL with pool settings
// postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
```

### Drizzle/Better-SQLite

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
});

const db = drizzle(pool);
```

---

## Connection Settings

### PostgreSQL Settings

```sql
-- postgresql.conf
max_connections = 200          -- Max direct connections
superuser_reserved_connections = 3

-- Check current connections
SELECT count(*) FROM pg_stat_activity;

-- Per-connection memory settings
shared_buffers = 256MB         -- Shared across connections
work_mem = 16MB                -- Per operation (sort, hash)
maintenance_work_mem = 256MB   -- For maintenance ops
```

### Recommended Settings

```
Application servers: 5-10
├── Each with pool of 20 connections
└── Total: 100-200 connections to DB

PgBouncer settings:
├── max_client_conn: 1000 (handle app connection spikes)
├── default_pool_size: 20-50 (actual DB connections)
└── reserve_pool_size: 5 (extra for spikes)

PostgreSQL:
└── max_connections: 100-300
```

---

## Monitoring

### PgBouncer Stats

```sql
-- Connect to PgBouncer admin
psql -p 6432 pgbouncer

-- Show pools
SHOW POOLS;
-- database | user | cl_active | cl_waiting | sv_active | sv_idle

-- Show clients
SHOW CLIENTS;

-- Show servers
SHOW SERVERS;

-- Show stats
SHOW STATS;
```

### PostgreSQL Connection Stats

```sql
-- Current connections by state
SELECT
    state,
    COUNT(*) as count
FROM pg_stat_activity
GROUP BY state;

-- Connections by application
SELECT
    application_name,
    COUNT(*) as connections,
    COUNT(*) FILTER (WHERE state = 'active') as active,
    COUNT(*) FILTER (WHERE state = 'idle') as idle
FROM pg_stat_activity
GROUP BY application_name;

-- Long-running queries
SELECT
    pid,
    now() - query_start as duration,
    state,
    query
FROM pg_stat_activity
WHERE state != 'idle'
  AND query_start < now() - interval '5 minutes'
ORDER BY duration DESC;

-- Kill connection
SELECT pg_terminate_backend(pid);
```

### Connection Limits

```sql
-- Check limits
SHOW max_connections;

-- Current usage
SELECT
    (SELECT count(*) FROM pg_stat_activity) as current,
    (SELECT setting::int FROM pg_settings WHERE name = 'max_connections') as max;

-- Per-user limits
ALTER ROLE myapp CONNECTION LIMIT 50;
```

### Troubleshooting

```sql
-- "too many connections" error
-- 1. Check current connections
SELECT count(*) FROM pg_stat_activity;

-- 2. Find idle connections
SELECT pid, usename, application_name, state, query_start
FROM pg_stat_activity
WHERE state = 'idle'
ORDER BY query_start;

-- 3. Terminate old idle connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
  AND query_start < now() - interval '1 hour';

-- 4. Check for connection leaks (high sv_idle in PgBouncer)
SHOW POOLS;
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [vacuum-and-maintenance.md](vacuum-and-maintenance.md)
