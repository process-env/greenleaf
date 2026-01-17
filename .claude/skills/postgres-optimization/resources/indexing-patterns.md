# Indexing Patterns

Complete guide to PostgreSQL index types and optimization strategies.

## Table of Contents

- [Index Types](#index-types)
- [B-tree Patterns](#b-tree-patterns)
- [GIN Indexes](#gin-indexes)
- [Partial Indexes](#partial-indexes)
- [Covering Indexes](#covering-indexes)
- [Index Maintenance](#index-maintenance)

---

## Index Types

### Overview

| Type | Best For | Operators |
|------|----------|-----------|
| B-tree | Equality, range, sorting | =, <, >, <=, >=, BETWEEN |
| Hash | Equality only | = |
| GIN | Arrays, JSONB, full-text | @>, ?, ?&, ?\|, @@ |
| GiST | Geometric, range, full-text | &&, @>, <@, ~ |
| BRIN | Large tables with ordering | <, <=, =, >=, > |

### When to Use Each

```sql
-- B-tree (default, most common)
CREATE INDEX idx_users_email ON users(email);

-- GIN for JSONB
CREATE INDEX idx_data_gin ON events USING GIN (data);

-- GiST for geometry/ranges
CREATE INDEX idx_locations ON places USING GIST (location);

-- BRIN for very large append-only tables
CREATE INDEX idx_logs_time ON logs USING BRIN (created_at);
```

---

## B-tree Patterns

### Single Column

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Useful for:
-- WHERE user_id = ?
-- WHERE user_id IN (?, ?, ?)
-- ORDER BY user_id
```

### Composite Index

Column order matters! Index is useful for leftmost columns.

```sql
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Useful for:
-- WHERE user_id = ?
-- WHERE user_id = ? AND status = ?
-- WHERE user_id = ? ORDER BY status

-- NOT useful for:
-- WHERE status = ?  (can't use, not leftmost)
```

### Order for Composite Indexes

1. Equality columns first
2. Range columns next
3. ORDER BY columns last

```sql
-- Query:
SELECT * FROM orders
WHERE user_id = 123
  AND status = 'pending'
  AND created_at > '2024-01-01'
ORDER BY created_at;

-- Optimal index:
CREATE INDEX idx_orders_optimal ON orders(user_id, status, created_at);
```

### Descending Indexes

```sql
-- For queries with DESC ordering
CREATE INDEX idx_orders_created_desc ON orders(created_at DESC);

-- Mixed ordering
CREATE INDEX idx_orders_mixed ON orders(user_id ASC, created_at DESC);
```

### Expression Indexes

```sql
-- Index on function result
CREATE INDEX idx_users_email_lower ON users(LOWER(email));

-- Now this uses index:
SELECT * FROM users WHERE LOWER(email) = 'john@example.com';

-- Computed column
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));
```

---

## GIN Indexes

### JSONB Indexing

```sql
-- Full document index (all keys)
CREATE INDEX idx_data_gin ON events USING GIN (data);

-- Supports:
-- WHERE data @> '{"type": "click"}'
-- WHERE data ? 'user_id'
-- WHERE data ?& ARRAY['type', 'timestamp']

-- Path-optimized (smaller, faster for @>)
CREATE INDEX idx_data_path ON events USING GIN (data jsonb_path_ops);

-- Supports only:
-- WHERE data @> '{"type": "click"}'
```

### Specific JSONB Path

```sql
-- Index specific key
CREATE INDEX idx_data_type ON events((data->>'type'));

-- Now this uses B-tree index:
SELECT * FROM events WHERE data->>'type' = 'click';
```

### Array Indexing

```sql
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);

-- Supports:
-- WHERE tags @> ARRAY['postgres']
-- WHERE tags && ARRAY['postgres', 'mysql']
-- WHERE 'postgres' = ANY(tags)
```

### Full-Text Search

```sql
-- Index on tsvector column
CREATE INDEX idx_documents_search ON documents USING GIN (search_vector);

-- Or computed
CREATE INDEX idx_posts_fts ON posts
    USING GIN (to_tsvector('english', title || ' ' || body));
```

---

## Partial Indexes

Index only rows matching a condition. Smaller and faster.

### Basic Partial Index

```sql
-- Only index pending orders
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Query must include the condition:
SELECT * FROM orders
WHERE status = 'pending' AND created_at > '2024-01-01';
```

### Common Patterns

```sql
-- Active records only
CREATE INDEX idx_users_active ON users(email)
WHERE is_active = true;

-- Non-null values only
CREATE INDEX idx_orders_shipped ON orders(shipped_at)
WHERE shipped_at IS NOT NULL;

-- Recent data only
CREATE INDEX idx_logs_recent ON logs(level, message)
WHERE created_at > '2024-01-01';
```

### Unique Partial Index

```sql
-- Unique email only for active users
CREATE UNIQUE INDEX idx_users_email_unique ON users(email)
WHERE is_active = true;
```

---

## Covering Indexes

Include extra columns to enable index-only scans.

### INCLUDE Clause (PG 11+)

```sql
-- Index for lookup, include columns for retrieval
CREATE INDEX idx_orders_user_covering ON orders(user_id)
INCLUDE (status, total, created_at);

-- Index-only scan for:
SELECT status, total, created_at
FROM orders WHERE user_id = 123;
```

### Composite as Covering

```sql
-- All columns in index (older method)
CREATE INDEX idx_orders_full ON orders(user_id, status, total);

-- Less flexible than INCLUDE but works on older PG versions
```

### Checking Index-Only Scans

```sql
EXPLAIN ANALYZE
SELECT status, total FROM orders WHERE user_id = 123;

-- Look for:
-- Index Only Scan using idx_orders_user_covering
-- Heap Fetches: 0   <-- This means true index-only
```

---

## Index Maintenance

### Check Index Usage

```sql
-- Most used indexes
SELECT
    schemaname,
    relname as table,
    indexrelname as index,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Unused indexes (candidates for removal)
SELECT
    schemaname,
    relname as table,
    indexrelname as index,
    pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Index Size

```sql
-- Size of all indexes on a table
SELECT
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as size
FROM pg_indexes
WHERE tablename = 'orders';

-- Total index size
SELECT
    pg_size_pretty(pg_indexes_size('orders')) as total_index_size;
```

### Rebuild Indexes

```sql
-- Rebuild single index (locks table)
REINDEX INDEX idx_orders_user_id;

-- Rebuild concurrently (PG 12+)
REINDEX INDEX CONCURRENTLY idx_orders_user_id;

-- Rebuild all indexes on table
REINDEX TABLE orders;
REINDEX TABLE CONCURRENTLY orders;
```

### Create Index Concurrently

```sql
-- Doesn't lock table for writes
CREATE INDEX CONCURRENTLY idx_orders_new ON orders(new_column);

-- Note: Takes longer, requires more resources
-- If it fails, drop the invalid index:
DROP INDEX CONCURRENTLY idx_orders_new;
```

### Index Bloat

```sql
-- Check bloat (requires pgstattuple extension)
CREATE EXTENSION IF NOT EXISTS pgstattuple;

SELECT
    indexrelname,
    pg_size_pretty(pg_relation_size(indexrelid)) as size,
    avg_leaf_density
FROM pg_stat_user_indexes
JOIN pgstatindex(indexrelname) ON true
WHERE avg_leaf_density < 50;  -- Less than 50% full = bloated
```

---

## Index Selection Decision Tree

```
Need to query column X?
├── Equality only?
│   ├── High cardinality → B-tree
│   └── Low cardinality → Consider partial
├── Range queries?
│   └── B-tree
├── JSONB?
│   ├── Query all keys → GIN
│   └── Specific path → B-tree on expression
├── Array?
│   └── GIN
├── Full-text search?
│   └── GIN on tsvector
├── Very large table, ordered inserts?
│   └── BRIN
└── Geometric/range types?
    └── GiST
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [query-analysis.md](query-analysis.md)
- [vacuum-and-maintenance.md](vacuum-and-maintenance.md)
