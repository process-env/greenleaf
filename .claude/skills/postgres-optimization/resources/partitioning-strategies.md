# Partitioning Strategies

Guide to table partitioning in PostgreSQL for performance and manageability.

## Table of Contents

- [When to Partition](#when-to-partition)
- [Partition Types](#partition-types)
- [Creating Partitions](#creating-partitions)
- [Partition Pruning](#partition-pruning)
- [Maintenance](#maintenance)
- [Migration Strategies](#migration-strategies)

---

## When to Partition

### Good Candidates

- Tables > 100GB
- Time-series data with retention policies
- Queries consistently filter on partition key
- Need to efficiently delete old data (DROP vs DELETE)
- Insert-heavy workloads with time-based data

### Bad Candidates

- Small tables (< 10GB)
- Queries rarely filter on partition key
- Need to query across all partitions frequently
- OLTP workloads with random access patterns

### Decision Matrix

| Scenario | Partition? |
|----------|------------|
| 500GB events table, query by date | Yes |
| 1GB users table, query by id | No |
| 50GB logs, delete after 30 days | Yes |
| 20GB orders, join with other tables | Maybe |

---

## Partition Types

### Range Partitioning

Best for: Time-series, sequential data

```sql
CREATE TABLE events (
    id BIGSERIAL,
    event_time TIMESTAMPTZ NOT NULL,
    event_type TEXT,
    data JSONB,
    PRIMARY KEY (id, event_time)
) PARTITION BY RANGE (event_time);

-- Monthly partitions
CREATE TABLE events_2024_01 PARTITION OF events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE events_2024_02 PARTITION OF events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- Default partition for out-of-range data
CREATE TABLE events_default PARTITION OF events DEFAULT;
```

### List Partitioning

Best for: Categorical data, regions, tenants

```sql
CREATE TABLE orders (
    id BIGSERIAL,
    region TEXT NOT NULL,
    customer_id BIGINT,
    total DECIMAL,
    PRIMARY KEY (id, region)
) PARTITION BY LIST (region);

CREATE TABLE orders_americas PARTITION OF orders
    FOR VALUES IN ('US', 'CA', 'MX', 'BR');

CREATE TABLE orders_europe PARTITION OF orders
    FOR VALUES IN ('UK', 'DE', 'FR', 'ES');

CREATE TABLE orders_asia PARTITION OF orders
    FOR VALUES IN ('JP', 'CN', 'KR', 'IN');

CREATE TABLE orders_other PARTITION OF orders DEFAULT;
```

### Hash Partitioning

Best for: Even distribution, no natural partition key

```sql
CREATE TABLE user_data (
    user_id BIGINT NOT NULL,
    data JSONB,
    PRIMARY KEY (user_id)
) PARTITION BY HASH (user_id);

-- 4 partitions
CREATE TABLE user_data_0 PARTITION OF user_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE user_data_1 PARTITION OF user_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE user_data_2 PARTITION OF user_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE user_data_3 PARTITION OF user_data
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### Multi-Level Partitioning

```sql
-- First level: by year
CREATE TABLE sales (
    id BIGSERIAL,
    sale_date DATE NOT NULL,
    region TEXT NOT NULL,
    amount DECIMAL
) PARTITION BY RANGE (sale_date);

-- Second level: by region
CREATE TABLE sales_2024 PARTITION OF sales
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01')
    PARTITION BY LIST (region);

CREATE TABLE sales_2024_us PARTITION OF sales_2024
    FOR VALUES IN ('US');
CREATE TABLE sales_2024_eu PARTITION OF sales_2024
    FOR VALUES IN ('EU');
```

---

## Creating Partitions

### Automated Partition Creation

```sql
-- Function to create monthly partitions
CREATE OR REPLACE FUNCTION create_monthly_partition(
    parent_table TEXT,
    partition_date DATE
) RETURNS VOID AS $$
DECLARE
    partition_name TEXT;
    start_date DATE;
    end_date DATE;
BEGIN
    start_date := DATE_TRUNC('month', partition_date);
    end_date := start_date + INTERVAL '1 month';
    partition_name := parent_table || '_' || TO_CHAR(start_date, 'YYYY_MM');

    EXECUTE format(
        'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I
         FOR VALUES FROM (%L) TO (%L)',
        partition_name, parent_table, start_date, end_date
    );
END;
$$ LANGUAGE plpgsql;

-- Create next 12 months
DO $$
BEGIN
    FOR i IN 0..11 LOOP
        PERFORM create_monthly_partition(
            'events',
            CURRENT_DATE + (i || ' months')::INTERVAL
        );
    END LOOP;
END $$;
```

### Indexes on Partitions

```sql
-- Index on parent (automatically created on all partitions)
CREATE INDEX idx_events_type ON events(event_type);

-- Index on specific partition only
CREATE INDEX idx_events_2024_01_data ON events_2024_01 USING GIN (data);
```

---

## Partition Pruning

### How It Works

PostgreSQL eliminates partitions that can't contain matching rows.

```sql
-- Only scans events_2024_01 partition
EXPLAIN ANALYZE
SELECT * FROM events
WHERE event_time >= '2024-01-15' AND event_time < '2024-01-20';
```

### Enable Pruning

```sql
-- Should be ON by default
SET enable_partition_pruning = ON;

-- Runtime pruning (PG 11+)
SET enable_partitionwise_aggregate = ON;
SET enable_partitionwise_join = ON;
```

### Pruning Requirements

1. Filter must use partition key
2. Filter must be compatible (=, <, >, BETWEEN, IN)
3. No functions on partition key column

```sql
-- Good: Pruning works
WHERE event_time >= '2024-01-01'
WHERE event_time BETWEEN '2024-01-01' AND '2024-01-31'
WHERE DATE_TRUNC('month', '2024-01-15'::date) = event_time  -- NO! Function on column

-- Bad: No pruning
WHERE EXTRACT(MONTH FROM event_time) = 1
WHERE event_time::date = '2024-01-15'
```

---

## Maintenance

### Dropping Old Partitions

```sql
-- Fast! No row-by-row deletion
DROP TABLE events_2023_01;

-- Detach first if you need to keep data
ALTER TABLE events DETACH PARTITION events_2023_01;
-- Then drop or archive
DROP TABLE events_2023_01;
```

### Automated Retention

```sql
CREATE OR REPLACE FUNCTION drop_old_partitions(
    parent_table TEXT,
    retention_months INTEGER
) RETURNS VOID AS $$
DECLARE
    partition_record RECORD;
    cutoff_date DATE;
BEGIN
    cutoff_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;

    FOR partition_record IN
        SELECT inhrelid::regclass::text as partition_name
        FROM pg_inherits
        WHERE inhparent = parent_table::regclass
    LOOP
        -- Extract date from partition name (assumes YYYY_MM format)
        IF partition_record.partition_name ~ '_\d{4}_\d{2}$' THEN
            IF TO_DATE(
                RIGHT(partition_record.partition_name, 7),
                'YYYY_MM'
            ) < cutoff_date THEN
                EXECUTE 'DROP TABLE ' || partition_record.partition_name;
                RAISE NOTICE 'Dropped partition: %', partition_record.partition_name;
            END IF;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop partitions older than 12 months
SELECT drop_old_partitions('events', 12);
```

### Monitoring Partition Sizes

```sql
SELECT
    parent.relname as parent_table,
    child.relname as partition,
    pg_size_pretty(pg_relation_size(child.oid)) as size,
    pg_stat_user_tables.n_live_tup as rows
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
LEFT JOIN pg_stat_user_tables ON child.relname = pg_stat_user_tables.relname
WHERE parent.relname = 'events'
ORDER BY child.relname;
```

---

## Migration Strategies

### Creating Partitioned Version of Existing Table

```sql
-- 1. Create new partitioned table
CREATE TABLE orders_new (
    LIKE orders INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 2. Create partitions
CREATE TABLE orders_new_2024_01 PARTITION OF orders_new
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- ... more partitions

-- 3. Copy data (in batches for large tables)
INSERT INTO orders_new
SELECT * FROM orders
WHERE created_at >= '2024-01-01' AND created_at < '2024-02-01';

-- 4. Swap tables
BEGIN;
ALTER TABLE orders RENAME TO orders_old;
ALTER TABLE orders_new RENAME TO orders;
COMMIT;

-- 5. Drop old table after verification
DROP TABLE orders_old;
```

### Attaching Existing Table as Partition

```sql
-- 1. Add constraint matching partition bounds
ALTER TABLE orders_2024_01
    ADD CONSTRAINT orders_2024_01_check
    CHECK (created_at >= '2024-01-01' AND created_at < '2024-02-01');

-- 2. Attach as partition (validates constraint)
ALTER TABLE orders ATTACH PARTITION orders_2024_01
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [indexing-patterns.md](indexing-patterns.md)
- [vacuum-and-maintenance.md](vacuum-and-maintenance.md)
