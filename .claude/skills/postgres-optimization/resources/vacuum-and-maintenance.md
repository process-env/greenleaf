# Vacuum and Maintenance

Guide to PostgreSQL maintenance operations for optimal performance.

## Table of Contents

- [Understanding MVCC](#understanding-mvcc)
- [VACUUM Operations](#vacuum-operations)
- [ANALYZE](#analyze)
- [Autovacuum Tuning](#autovacuum-tuning)
- [Table Bloat](#table-bloat)
- [REINDEX](#reindex)

---

## Understanding MVCC

### How Dead Tuples Accumulate

```
PostgreSQL uses MVCC (Multi-Version Concurrency Control):

UPDATE users SET name = 'John' WHERE id = 1;
├── Old row marked as dead (not deleted immediately)
├── New row created
└── Dead tuple remains until VACUUM

DELETE FROM orders WHERE id = 1;
├── Row marked as dead
└── Space not reclaimed until VACUUM
```

### Why VACUUM is Needed

1. Reclaim space from dead tuples
2. Update visibility map (for index-only scans)
3. Prevent transaction ID wraparound
4. Update free space map

---

## VACUUM Operations

### Basic VACUUM

```sql
-- Vacuum single table (doesn't reclaim space to OS)
VACUUM orders;

-- Vacuum with verbose output
VACUUM VERBOSE orders;

-- Vacuum entire database
VACUUM;
```

### VACUUM FULL

```sql
-- Reclaims space to OS, rewrites entire table
-- LOCKS TABLE! Use with caution
VACUUM FULL orders;

-- Better alternative: pg_repack (no lock)
-- pg_repack -t orders mydb
```

### VACUUM ANALYZE

```sql
-- Vacuum + update statistics
VACUUM ANALYZE orders;

-- Most common maintenance command
VACUUM (VERBOSE, ANALYZE) orders;
```

### Check Vacuum Status

```sql
-- Last vacuum/analyze times
SELECT
    schemaname,
    relname,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze,
    n_dead_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Tables needing vacuum
SELECT
    schemaname,
    relname,
    n_dead_tup,
    n_live_tup,
    round(100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0), 2) as dead_pct
FROM pg_stat_user_tables
WHERE n_dead_tup > 1000
ORDER BY n_dead_tup DESC;
```

---

## ANALYZE

Updates table statistics for query planner.

### Basic ANALYZE

```sql
-- Single table
ANALYZE orders;

-- Specific columns
ANALYZE orders(user_id, status);

-- Entire database
ANALYZE;

-- With verbose output
ANALYZE VERBOSE orders;
```

### Statistics Settings

```sql
-- Check current statistics target
SELECT attname, attstattarget
FROM pg_attribute
WHERE attrelid = 'orders'::regclass AND attnum > 0;

-- Increase statistics for specific column
ALTER TABLE orders ALTER COLUMN user_id SET STATISTICS 1000;
ANALYZE orders(user_id);

-- Default is 100, range is 0-10000
-- Higher = more accurate estimates but slower ANALYZE
```

### View Statistics

```sql
-- Table statistics
SELECT * FROM pg_stats WHERE tablename = 'orders';

-- Most common values
SELECT
    attname,
    n_distinct,
    most_common_vals,
    most_common_freqs
FROM pg_stats
WHERE tablename = 'orders';
```

---

## Autovacuum Tuning

### Global Settings (postgresql.conf)

```ini
# Enable autovacuum (should always be on)
autovacuum = on

# How often to check for tables needing vacuum
autovacuum_naptime = 60s

# Number of autovacuum workers
autovacuum_max_workers = 3

# Vacuum threshold: vacuum when dead tuples > threshold + scale_factor * tuples
autovacuum_vacuum_threshold = 50
autovacuum_vacuum_scale_factor = 0.2  # 20%

# Analyze threshold
autovacuum_analyze_threshold = 50
autovacuum_analyze_scale_factor = 0.1  # 10%

# Cost limiting (prevent autovacuum from consuming too much I/O)
autovacuum_vacuum_cost_limit = 200
autovacuum_vacuum_cost_delay = 20ms
```

### Per-Table Settings

```sql
-- More aggressive vacuum for high-churn table
ALTER TABLE orders SET (
    autovacuum_vacuum_scale_factor = 0.05,    -- 5% instead of 20%
    autovacuum_vacuum_threshold = 100,
    autovacuum_analyze_scale_factor = 0.02    -- 2%
);

-- Less aggressive for append-only table
ALTER TABLE logs SET (
    autovacuum_vacuum_scale_factor = 0.5,     -- 50%
    autovacuum_enabled = false                -- Disable completely
);

-- Check per-table settings
SELECT relname, reloptions
FROM pg_class
WHERE reloptions IS NOT NULL;
```

### Monitor Autovacuum

```sql
-- Currently running autovacuum
SELECT
    pid,
    relid::regclass as table,
    phase,
    heap_blks_total,
    heap_blks_scanned,
    heap_blks_vacuumed,
    index_vacuum_count,
    max_dead_tuples,
    num_dead_tuples
FROM pg_stat_progress_vacuum;

-- Autovacuum activity log
SELECT * FROM pg_stat_user_tables
WHERE last_autovacuum IS NOT NULL
ORDER BY last_autovacuum DESC;
```

---

## Table Bloat

### Detecting Bloat

```sql
-- Simple bloat check
SELECT
    schemaname,
    relname,
    n_live_tup,
    n_dead_tup,
    pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;

-- Detailed bloat estimation (requires pgstattuple)
CREATE EXTENSION IF NOT EXISTS pgstattuple;

SELECT
    relname,
    pg_size_pretty(pg_relation_size(relname::regclass)) as size,
    (pgstattuple(relname::regclass)).dead_tuple_percent as dead_pct,
    (pgstattuple(relname::regclass)).free_percent as free_pct
FROM pg_stat_user_tables
ORDER BY (pgstattuple(relname::regclass)).dead_tuple_percent DESC;
```

### Fixing Bloat

```sql
-- Option 1: VACUUM FULL (locks table!)
VACUUM FULL orders;

-- Option 2: CLUSTER (also locks, but reorders by index)
CLUSTER orders USING orders_pkey;

-- Option 3: pg_repack (no lock, requires extension)
-- Install: CREATE EXTENSION pg_repack;
-- Run: pg_repack -t orders mydb

-- Option 4: Create new table and swap
BEGIN;
CREATE TABLE orders_new (LIKE orders INCLUDING ALL);
INSERT INTO orders_new SELECT * FROM orders;
DROP TABLE orders;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;
```

---

## REINDEX

Rebuild indexes to fix bloat or corruption.

### Basic REINDEX

```sql
-- Single index
REINDEX INDEX idx_orders_user_id;

-- All indexes on table
REINDEX TABLE orders;

-- All indexes in schema
REINDEX SCHEMA public;

-- Entire database
REINDEX DATABASE mydb;
```

### Concurrent REINDEX (PG 12+)

```sql
-- Doesn't lock table for writes
REINDEX INDEX CONCURRENTLY idx_orders_user_id;
REINDEX TABLE CONCURRENTLY orders;

-- Note: Takes longer, requires more disk space
```

### Check Index Health

```sql
-- Index bloat (requires pgstattuple)
SELECT
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    (pgstatindex(indexrelname)).avg_leaf_density as density
FROM pg_stat_user_indexes
WHERE pg_stat_user_indexes.idx_scan > 0
ORDER BY (pgstatindex(indexrelname)).avg_leaf_density;

-- Low density (<50%) suggests bloat
```

---

## Maintenance Schedule

### Daily

```sql
-- Check for tables needing vacuum
SELECT relname, n_dead_tup
FROM pg_stat_user_tables
WHERE n_dead_tup > 10000
ORDER BY n_dead_tup DESC;
```

### Weekly

```sql
-- Full ANALYZE on all tables
ANALYZE VERBOSE;

-- Check bloat
SELECT relname, n_dead_tup, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 20;
```

### Monthly

```sql
-- Check index usage and bloat
SELECT
    indexrelname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Consider REINDEX CONCURRENTLY for bloated indexes
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [indexing-patterns.md](indexing-patterns.md)
- [query-analysis.md](query-analysis.md)
