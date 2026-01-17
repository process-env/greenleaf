# Complete Examples

Real-world PostgreSQL optimization case studies.

## Table of Contents

- [Slow Dashboard Query](#slow-dashboard-query)
- [Time-Series Aggregation](#time-series-aggregation)
- [Search Optimization](#search-optimization)
- [Batch Processing](#batch-processing)

---

## Slow Dashboard Query

### Problem

Dashboard showing user activity takes 15+ seconds.

```sql
-- Original query (15s)
SELECT
    u.id,
    u.name,
    u.email,
    (SELECT COUNT(*) FROM orders WHERE user_id = u.id) as total_orders,
    (SELECT SUM(total) FROM orders WHERE user_id = u.id) as total_spent,
    (SELECT MAX(created_at) FROM orders WHERE user_id = u.id) as last_order
FROM users u
WHERE u.is_active = true
ORDER BY last_order DESC
LIMIT 50;
```

### Analysis

```sql
EXPLAIN ANALYZE ...

-- Problems:
-- 1. Three correlated subqueries (N+1 pattern)
-- 2. No index on orders.user_id
-- 3. Sort on computed column
```

### Solution

```sql
-- Step 1: Add index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Step 2: Rewrite with JOIN
WITH user_stats AS (
    SELECT
        user_id,
        COUNT(*) as total_orders,
        SUM(total) as total_spent,
        MAX(created_at) as last_order
    FROM orders
    GROUP BY user_id
)
SELECT
    u.id,
    u.name,
    u.email,
    COALESCE(us.total_orders, 0) as total_orders,
    COALESCE(us.total_spent, 0) as total_spent,
    us.last_order
FROM users u
LEFT JOIN user_stats us ON us.user_id = u.id
WHERE u.is_active = true
ORDER BY us.last_order DESC NULLS LAST
LIMIT 50;

-- Result: 15s → 200ms
```

### Further Optimization

```sql
-- Add covering index for orders aggregation
CREATE INDEX idx_orders_user_stats ON orders(user_id, created_at, total);

-- Add partial index for active users
CREATE INDEX idx_users_active ON users(id) WHERE is_active = true;
```

---

## Time-Series Aggregation

### Problem

Monthly revenue report is slow on 100M+ row table.

```sql
-- Original (45s)
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as orders,
    SUM(total) as revenue
FROM orders
WHERE created_at >= '2023-01-01'
GROUP BY 1
ORDER BY 1;
```

### Solution 1: Partitioning

```sql
-- Create partitioned table
CREATE TABLE orders_partitioned (
    id BIGSERIAL,
    created_at TIMESTAMPTZ NOT NULL,
    total DECIMAL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE orders_2024_01 PARTITION OF orders_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- ... more partitions

-- Now only relevant partitions are scanned
EXPLAIN ANALYZE
SELECT DATE_TRUNC('month', created_at), SUM(total)
FROM orders_partitioned
WHERE created_at >= '2024-01-01'
GROUP BY 1;

-- Result: 45s → 3s (partition pruning)
```

### Solution 2: Materialized View

```sql
-- Pre-aggregate data
CREATE MATERIALIZED VIEW monthly_revenue AS
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as orders,
    SUM(total) as revenue
FROM orders
GROUP BY 1;

CREATE UNIQUE INDEX idx_monthly_revenue_month ON monthly_revenue(month);

-- Refresh periodically
REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_revenue;

-- Query is instant
SELECT * FROM monthly_revenue WHERE month >= '2023-01-01';

-- Result: 45s → <10ms
```

### Solution 3: Summary Table

```sql
-- Daily summary table (updated by trigger or job)
CREATE TABLE daily_stats (
    date DATE PRIMARY KEY,
    orders INTEGER,
    revenue DECIMAL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregate from daily stats
SELECT
    DATE_TRUNC('month', date) as month,
    SUM(orders) as orders,
    SUM(revenue) as revenue
FROM daily_stats
WHERE date >= '2023-01-01'
GROUP BY 1
ORDER BY 1;

-- Result: 45s → 50ms
```

---

## Search Optimization

### Problem

Text search across multiple fields is slow.

```sql
-- Original (5s)
SELECT * FROM products
WHERE
    name ILIKE '%laptop%'
    OR description ILIKE '%laptop%'
    OR category ILIKE '%laptop%'
ORDER BY popularity DESC
LIMIT 20;
```

### Solution: Full-Text Search

```sql
-- Add tsvector column
ALTER TABLE products ADD COLUMN search_vector tsvector;

-- Populate and index
UPDATE products SET search_vector =
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(category, '')), 'C');

CREATE INDEX idx_products_search ON products USING GIN (search_vector);

-- Trigger to keep updated
CREATE OR REPLACE FUNCTION products_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(NEW.category, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_search_update
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION products_search_trigger();

-- Search query
SELECT
    id,
    name,
    ts_rank(search_vector, query) as rank
FROM products,
     to_tsquery('english', 'laptop') query
WHERE search_vector @@ query
ORDER BY rank DESC, popularity DESC
LIMIT 20;

-- Result: 5s → 20ms
```

### Adding Fuzzy Search

```sql
-- Install extension
CREATE EXTENSION pg_trgm;

-- Trigram index
CREATE INDEX idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Fuzzy search
SELECT * FROM products
WHERE name % 'laptpo'  -- Handles typos
ORDER BY similarity(name, 'laptpo') DESC
LIMIT 20;
```

---

## Batch Processing

### Problem

Updating millions of rows causes locks and performance issues.

```sql
-- Bad: Single huge transaction
UPDATE orders SET status = 'archived'
WHERE created_at < '2023-01-01';
-- Locks table, fills WAL, may timeout
```

### Solution: Batch Updates

```sql
-- Process in batches
DO $$
DECLARE
    batch_size INTEGER := 10000;
    rows_updated INTEGER;
BEGIN
    LOOP
        WITH batch AS (
            SELECT id FROM orders
            WHERE created_at < '2023-01-01'
              AND status != 'archived'
            LIMIT batch_size
            FOR UPDATE SKIP LOCKED
        )
        UPDATE orders
        SET status = 'archived'
        WHERE id IN (SELECT id FROM batch);

        GET DIAGNOSTICS rows_updated = ROW_COUNT;

        -- Commit each batch
        COMMIT;

        -- Exit when done
        EXIT WHEN rows_updated = 0;

        -- Optional: throttle
        PERFORM pg_sleep(0.1);
    END LOOP;
END $$;
```

### Batch Delete with Archive

```sql
-- Archive and delete in batches
CREATE OR REPLACE FUNCTION archive_old_orders(
    cutoff_date DATE,
    batch_size INTEGER DEFAULT 10000
) RETURNS INTEGER AS $$
DECLARE
    total_archived INTEGER := 0;
    batch_count INTEGER;
BEGIN
    LOOP
        WITH deleted AS (
            DELETE FROM orders
            WHERE id IN (
                SELECT id FROM orders
                WHERE created_at < cutoff_date
                LIMIT batch_size
            )
            RETURNING *
        )
        INSERT INTO orders_archive SELECT * FROM deleted;

        GET DIAGNOSTICS batch_count = ROW_COUNT;
        total_archived := total_archived + batch_count;

        EXIT WHEN batch_count = 0;

        -- Allow other transactions
        PERFORM pg_sleep(0.05);
    END LOOP;

    RETURN total_archived;
END;
$$ LANGUAGE plpgsql;

-- Run
SELECT archive_old_orders('2023-01-01', 5000);
```

### Parallel Processing

```sql
-- Using advisory locks for parallel workers
CREATE OR REPLACE FUNCTION process_orders_worker(worker_id INTEGER, total_workers INTEGER)
RETURNS INTEGER AS $$
DECLARE
    processed INTEGER := 0;
    order_record RECORD;
BEGIN
    FOR order_record IN
        SELECT id FROM orders
        WHERE id % total_workers = worker_id
          AND needs_processing = true
    LOOP
        -- Try to get lock
        IF pg_try_advisory_xact_lock(order_record.id) THEN
            -- Process order
            UPDATE orders
            SET processed = true, processed_at = NOW()
            WHERE id = order_record.id;

            processed := processed + 1;
        END IF;
    END LOOP;

    RETURN processed;
END;
$$ LANGUAGE plpgsql;

-- Run multiple workers in parallel (from application)
-- Worker 0: SELECT process_orders_worker(0, 4);
-- Worker 1: SELECT process_orders_worker(1, 4);
-- Worker 2: SELECT process_orders_worker(2, 4);
-- Worker 3: SELECT process_orders_worker(3, 4);
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- All other resource files
