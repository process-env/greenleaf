---
name: postgres-optimization
description: PostgreSQL query optimization, window functions (ROW_NUMBER, RANK, LEAD/LAG), table partitioning, indexing strategies, EXPLAIN ANALYZE interpretation, CTEs, recursive queries, JSON_TABLE (PG17), and performance tuning. Covers query plan analysis, index selection, partition pruning, vacuum/analyze, and connection pooling.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  postgresql: "17.x"
---

# PostgreSQL Optimization

> **Updated 2026-01-11:** Added PostgreSQL 17 features: JSON_TABLE() function, incremental backup patterns, MERGE RETURNING clause, identity columns on partitioned tables.

## Purpose

Comprehensive guide for optimizing PostgreSQL queries and database performance, including window functions, partitioning strategies, indexing patterns, and query plan analysis.

## When to Use This Skill

Automatically activates when working on:
- Analyzing slow queries with EXPLAIN ANALYZE
- Implementing window functions (ROW_NUMBER, RANK, LEAD/LAG)
- Designing table partitioning strategies
- Creating and optimizing indexes
- Writing CTEs and recursive queries
- Performance tuning and monitoring

---

## Quick Start

### Query Optimization Checklist

- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Check for sequential scans on large tables
- [ ] Verify indexes exist for WHERE/JOIN columns
- [ ] Look for index-only scans opportunities
- [ ] Check for N+1 query patterns
- [ ] Review JOIN order and types
- [ ] Consider query rewrites
- [ ] Check table statistics are current

### Performance Investigation Flow

```
1. Identify slow query
         ↓
2. EXPLAIN ANALYZE
         ↓
3. Check for Seq Scans → Add indexes
         ↓
4. Check row estimates → ANALYZE table
         ↓
5. Check join types → Rewrite query
         ↓
6. Consider partitioning → Large tables
```

---

## EXPLAIN ANALYZE Essentials

### Basic Usage

```sql
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE created_at > '2024-01-01'
  AND status = 'pending';
```

### Key Metrics to Watch

| Metric | What It Means |
|--------|---------------|
| **Seq Scan** | Full table scan - often needs index |
| **Index Scan** | Using index - good |
| **Index Only Scan** | Best - uses covering index |
| **Bitmap Scan** | Multiple index conditions |
| **Nested Loop** | O(n*m) - watch row counts |
| **Hash Join** | Good for large datasets |
| **actual rows** vs **rows** | Estimate accuracy |

### Reading Output

```
Seq Scan on orders  (cost=0.00..1520.00 rows=50000 width=100)
                     ^^^^^^^^^^^^^^^^^^^^^
                     startup..total cost (arbitrary units)

                                         ^^^^^^^^^^^
                                         estimated rows

(actual time=0.015..45.123 rows=48532 loops=1)
            ^^^^^^^^^^^^^^
            actual execution time (ms)

                                 ^^^^^^^^^^^
                                 actual rows returned
```

See [query-analysis.md](resources/query-analysis.md) for complete EXPLAIN interpretation.

---

## Window Functions Overview

### Common Window Functions

```sql
-- Row numbering
SELECT *,
    ROW_NUMBER() OVER (ORDER BY created_at DESC) as row_num,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as user_row_num
FROM orders;

-- Ranking (handles ties)
SELECT *,
    RANK() OVER (ORDER BY score DESC) as rank,        -- 1,2,2,4
    DENSE_RANK() OVER (ORDER BY score DESC) as dense  -- 1,2,2,3
FROM players;

-- Previous/Next values
SELECT *,
    LAG(amount, 1) OVER (ORDER BY date) as prev_amount,
    LEAD(amount, 1) OVER (ORDER BY date) as next_amount
FROM transactions;

-- Running totals
SELECT *,
    SUM(amount) OVER (ORDER BY date) as running_total,
    SUM(amount) OVER (PARTITION BY category ORDER BY date) as category_total
FROM transactions;
```

### Window Frame Syntax

```sql
-- Default: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
SUM(amount) OVER (ORDER BY date)

-- Explicit frame
SUM(amount) OVER (
    ORDER BY date
    ROWS BETWEEN 3 PRECEDING AND CURRENT ROW
) as moving_avg_4

-- All rows in partition
SUM(amount) OVER (
    PARTITION BY category
    ORDER BY date
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
) as total_in_category
```

See [window-functions.md](resources/window-functions.md) for advanced patterns.

---

## Partitioning Quick Reference

### When to Partition

- Tables > 100GB
- Time-series data with retention
- Queries filter on partition key
- Need to drop old data efficiently

### Partition Types

```sql
-- Range partitioning (time-series)
CREATE TABLE events (
    id SERIAL,
    event_time TIMESTAMPTZ NOT NULL,
    data JSONB
) PARTITION BY RANGE (event_time);

CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- List partitioning (categories)
CREATE TABLE orders (
    id SERIAL,
    region TEXT NOT NULL,
    amount DECIMAL
) PARTITION BY LIST (region);

CREATE TABLE orders_us PARTITION OF orders
    FOR VALUES IN ('US', 'CA');

-- Hash partitioning (even distribution)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT
) PARTITION BY HASH (id);

CREATE TABLE users_0 PARTITION OF users
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
```

See [partitioning-strategies.md](resources/partitioning-strategies.md) for maintenance and optimization.

---

## Index Selection Guide

### Index Types

| Type | Use Case |
|------|----------|
| **B-tree** | Default, equality and range queries |
| **Hash** | Equality only, rarely better than B-tree |
| **GIN** | Arrays, JSONB, full-text search |
| **GiST** | Geometric, full-text, range types |
| **BRIN** | Very large tables with natural ordering |

### Index Patterns

```sql
-- Basic index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Composite index (column order matters!)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- Good for: WHERE user_id = ? AND status = ?
-- Good for: WHERE user_id = ?
-- Bad for: WHERE status = ?

-- Partial index
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Covering index (index-only scans)
CREATE INDEX idx_orders_covering ON orders(user_id)
INCLUDE (total, status);

-- Expression index
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- JSONB index
CREATE INDEX idx_data_gin ON events USING GIN (data);
CREATE INDEX idx_data_path ON events USING GIN (data jsonb_path_ops);
```

See [indexing-patterns.md](resources/indexing-patterns.md) for optimization strategies.

---

## CTE and Subquery Patterns

### Basic CTE

```sql
WITH active_users AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT u.*, au.order_count
FROM users u
JOIN active_users au ON u.id = au.user_id;
```

### Recursive CTE

```sql
-- Hierarchical data (org chart, categories)
WITH RECURSIVE org_tree AS (
    -- Base case
    SELECT id, name, manager_id, 1 as level
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive case
    SELECT e.id, e.name, e.manager_id, ot.level + 1
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
)
SELECT * FROM org_tree ORDER BY level, name;
```

See [cte-and-subqueries.md](resources/cte-and-subqueries.md) for optimization tips.

---

## Common Performance Killers

### 1. Missing Indexes

```sql
-- Before: Seq Scan (slow)
SELECT * FROM orders WHERE user_id = 123;

-- Fix: Add index
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

### 2. Wrong Column Order in Composite Index

```sql
-- Index: (status, user_id)
-- Query: WHERE user_id = ?  -- Won't use index efficiently!

-- Fix: Create index with correct order
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
```

### 3. Function on Indexed Column

```sql
-- Won't use index on created_at
SELECT * FROM orders WHERE DATE(created_at) = '2024-01-01';

-- Fix: Use range
SELECT * FROM orders
WHERE created_at >= '2024-01-01'
  AND created_at < '2024-01-02';
```

### 4. Implicit Type Casting

```sql
-- user_id is INTEGER, but string comparison
SELECT * FROM orders WHERE user_id = '123';

-- Fix: Use correct type
SELECT * FROM orders WHERE user_id = 123;
```

### 5. SELECT *

```sql
-- Fetches all columns, prevents index-only scans
SELECT * FROM orders WHERE user_id = 123;

-- Fix: Select only needed columns
SELECT id, status, total FROM orders WHERE user_id = 123;
```

---

## Quick Commands

```sql
-- Update statistics
ANALYZE orders;
ANALYZE;  -- All tables

-- Check table size
SELECT pg_size_pretty(pg_total_relation_size('orders'));

-- Check index usage
SELECT schemaname, relname, idx_scan, seq_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Find unused indexes
SELECT schemaname, relname, indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Check table bloat
SELECT schemaname, relname, n_dead_tup, last_vacuum, last_autovacuum
FROM pg_stat_user_tables;

-- Kill long-running queries
SELECT pg_cancel_backend(pid)
FROM pg_stat_activity
WHERE state = 'active'
  AND query_start < NOW() - INTERVAL '5 minutes';
```

---

## Gotchas & Real-World Warnings

### EXPLAIN ANALYZE Changes Query Behavior

**Running EXPLAIN ANALYZE actually executes the query:**

```sql
-- DANGER: This DELETE runs!
EXPLAIN ANALYZE DELETE FROM orders WHERE created_at < '2020-01-01';

-- SAFER: Wrap in transaction and rollback
BEGIN;
EXPLAIN ANALYZE DELETE FROM orders WHERE created_at < '2020-01-01';
ROLLBACK;
```

### Index Creation Locks Tables

**CREATE INDEX blocks writes in production:**

```sql
-- DANGER: Table locked for writes during index creation
CREATE INDEX idx_orders_user ON orders(user_id);
-- On 100M rows, this could take hours of downtime

-- CORRECT: Use CONCURRENTLY (slower but non-blocking)
CREATE INDEX CONCURRENTLY idx_orders_user ON orders(user_id);
```

### Indexes Have Maintenance Costs

**Every index slows down writes:**

| Operation | With 0 indexes | With 10 indexes |
|-----------|---------------|-----------------|
| INSERT | 1x | 3-5x slower |
| UPDATE | 1x | 2-4x slower |
| DELETE | 1x | 2-3x slower |

```sql
-- DANGER: Indexing everything
CREATE INDEX idx_orders_a ON orders(a);
CREATE INDEX idx_orders_b ON orders(b);
CREATE INDEX idx_orders_c ON orders(c);
CREATE INDEX idx_orders_ab ON orders(a, b);
CREATE INDEX idx_orders_bc ON orders(b, c);
-- Write performance tanks, most indexes unused

-- CHECK: Find unused indexes
SELECT indexrelname, idx_scan FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

### Partitioning Isn't Magic

**Partition pruning only works with literal values:**

```sql
-- Partition key: created_at
-- DANGER: No partition pruning
SELECT * FROM events WHERE created_at > NOW() - INTERVAL '7 days';
-- Postgres can't know which partitions to skip at plan time

-- BETTER: Calculate the date before the query
-- In application code:
const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
-- Then query with literal value
SELECT * FROM events WHERE created_at > '2024-01-15';
```

### Window Functions Can Be Slow

**Window functions process entire result sets in memory:**

```sql
-- DANGER: Processing 10M rows in memory
SELECT *, ROW_NUMBER() OVER (ORDER BY created_at) FROM huge_table;

-- BETTER: Filter first, window second
WITH recent AS (
    SELECT * FROM huge_table WHERE created_at > NOW() - INTERVAL '1 day'
)
SELECT *, ROW_NUMBER() OVER (ORDER BY created_at) FROM recent;
```

### CTEs Can Prevent Optimization

**Pre-PG12, CTEs were optimization fences:**

```sql
-- PostgreSQL < 12: CTE always materializes
WITH filtered AS (
    SELECT * FROM orders WHERE status = 'pending'
)
SELECT * FROM filtered WHERE user_id = 123;
-- Scans ALL pending orders, then filters by user_id

-- PostgreSQL 12+: Use MATERIALIZED/NOT MATERIALIZED to control
WITH filtered AS NOT MATERIALIZED (
    SELECT * FROM orders WHERE status = 'pending'
)
SELECT * FROM filtered WHERE user_id = 123;
-- Can push down the user_id filter
```

### Statistics Get Stale

**Postgres uses statistics to plan queries. Old stats = bad plans:**

```sql
-- After bulk load, stats are outdated
COPY orders FROM '/data/million_orders.csv';
-- Planner thinks table is small, chooses wrong plan

-- FIX: Update statistics
ANALYZE orders;

-- For critical queries after big changes
ANALYZE VERBOSE orders;  -- Shows what it's doing
```

### What These Patterns Don't Tell You

1. **Connection limits** - 100 connections is usually the max; use pooling (PgBouncer)
2. **VACUUM tuning** - Autovacuum defaults are conservative; tune for write-heavy workloads
3. **pg_stat_statements** - Essential for finding slow queries; install it
4. **Query plan caching** - Prepared statements can get stuck with bad plans
5. **Table bloat** - Deleted rows take space until VACUUM; monitor bloat
6. **Disk space for indexes** - Indexes can be larger than the table; plan storage

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Understand query plans | [query-analysis.md](resources/query-analysis.md) |
| Use window functions | [window-functions.md](resources/window-functions.md) |
| Design partitions | [partitioning-strategies.md](resources/partitioning-strategies.md) |
| Create indexes | [indexing-patterns.md](resources/indexing-patterns.md) |
| Optimize CTEs | [cte-and-subqueries.md](resources/cte-and-subqueries.md) |
| Use aggregations | [aggregation-patterns.md](resources/aggregation-patterns.md) |
| Manage connections | [connection-pooling.md](resources/connection-pooling.md) |
| Maintain database | [vacuum-and-maintenance.md](resources/vacuum-and-maintenance.md) |
| Advanced SQL | [advanced-sql.md](resources/advanced-sql.md) |
| See examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [query-analysis.md](resources/query-analysis.md)
EXPLAIN ANALYZE deep dive, cost estimation, plan nodes, statistics

### [window-functions.md](resources/window-functions.md)
ROW_NUMBER, RANK, LEAD/LAG, running totals, moving averages

### [partitioning-strategies.md](resources/partitioning-strategies.md)
Range/List/Hash partitioning, pruning, maintenance, migration

### [indexing-patterns.md](resources/indexing-patterns.md)
B-tree, GIN, GiST, partial, covering, expression indexes

### [cte-and-subqueries.md](resources/cte-and-subqueries.md)
WITH clauses, recursive CTEs, materialization, optimization

### [aggregation-patterns.md](resources/aggregation-patterns.md)
GROUP BY, ROLLUP, CUBE, GROUPING SETS, FILTER

### [connection-pooling.md](resources/connection-pooling.md)
PgBouncer, connection management, pooling modes

### [vacuum-and-maintenance.md](resources/vacuum-and-maintenance.md)
VACUUM, ANALYZE, bloat, autovacuum tuning, REINDEX

### [advanced-sql.md](resources/advanced-sql.md)
LATERAL joins, array operations, JSON functions, UPSERT

### [complete-examples.md](resources/complete-examples.md)
Full optimization case studies, before/after examples

---

**Skill Status**: COMPLETE
**Line Count**: < 420
**Progressive Disclosure**: 10 resource files
