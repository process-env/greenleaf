# Aggregation Patterns

Advanced GROUP BY, ROLLUP, CUBE, and GROUPING SETS patterns.

## Table of Contents

- [Basic Aggregations](#basic-aggregations)
- [ROLLUP](#rollup)
- [CUBE](#cube)
- [GROUPING SETS](#grouping-sets)
- [FILTER Clause](#filter-clause)
- [Performance Tips](#performance-tips)

---

## Basic Aggregations

### Common Functions

```sql
SELECT
    category,
    COUNT(*) as total_count,
    COUNT(DISTINCT user_id) as unique_users,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount,
    MIN(amount) as min_amount,
    MAX(amount) as max_amount,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY amount) as median,
    ARRAY_AGG(DISTINCT status) as statuses,
    STRING_AGG(name, ', ' ORDER BY name) as names
FROM orders
GROUP BY category;
```

### Conditional Aggregation

```sql
SELECT
    user_id,
    COUNT(*) FILTER (WHERE status = 'completed') as completed,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    SUM(amount) FILTER (WHERE status = 'completed') as completed_amount
FROM orders
GROUP BY user_id;
```

---

## ROLLUP

Creates subtotals and grand total. Hierarchical aggregation.

### Basic ROLLUP

```sql
SELECT
    region,
    category,
    SUM(amount) as total
FROM sales
GROUP BY ROLLUP (region, category)
ORDER BY region NULLS LAST, category NULLS LAST;
```

Result:
```
region   | category | total
---------|----------|-------
US       | A        | 1000
US       | B        | 2000
US       | NULL     | 3000   <- subtotal for US
EU       | A        | 500
EU       | B        | 1500
EU       | NULL     | 2000   <- subtotal for EU
NULL     | NULL     | 5000   <- grand total
```

### Multiple Column Groups

```sql
SELECT
    year,
    quarter,
    month,
    SUM(revenue) as revenue
FROM sales
GROUP BY ROLLUP (year, quarter, month);
-- Produces: year/quarter/month, year/quarter, year, grand total
```

### Partial ROLLUP

```sql
SELECT
    region,
    year,
    category,
    SUM(amount) as total
FROM sales
GROUP BY region, ROLLUP (year, category);
-- Region is not rolled up, only year and category
```

---

## CUBE

Creates all possible combinations of grouping columns.

### Basic CUBE

```sql
SELECT
    region,
    category,
    SUM(amount) as total
FROM sales
GROUP BY CUBE (region, category)
ORDER BY region NULLS LAST, category NULLS LAST;
```

Result:
```
region   | category | total
---------|----------|-------
US       | A        | 1000
US       | B        | 2000
US       | NULL     | 3000   <- US subtotal
EU       | A        | 500
EU       | B        | 1500
EU       | NULL     | 2000   <- EU subtotal
NULL     | A        | 1500   <- Category A subtotal
NULL     | B        | 3500   <- Category B subtotal
NULL     | NULL     | 5000   <- Grand total
```

### CUBE vs ROLLUP

```sql
-- ROLLUP: n+1 grouping sets for n columns
GROUP BY ROLLUP (a, b, c)
-- Produces: (a,b,c), (a,b), (a), ()

-- CUBE: 2^n grouping sets for n columns
GROUP BY CUBE (a, b, c)
-- Produces: (a,b,c), (a,b), (a,c), (b,c), (a), (b), (c), ()
```

---

## GROUPING SETS

Explicit control over which groupings to compute.

### Basic GROUPING SETS

```sql
SELECT
    region,
    category,
    SUM(amount) as total
FROM sales
GROUP BY GROUPING SETS (
    (region, category),  -- Detail
    (region),            -- By region
    (category),          -- By category
    ()                   -- Grand total
);
```

### Equivalent Expressions

```sql
-- These are equivalent:
GROUP BY ROLLUP (a, b)
GROUP BY GROUPING SETS ((a, b), (a), ())

GROUP BY CUBE (a, b)
GROUP BY GROUPING SETS ((a, b), (a), (b), ())
```

### Complex Grouping

```sql
SELECT
    year,
    region,
    category,
    SUM(amount) as total
FROM sales
GROUP BY GROUPING SETS (
    (year, region, category),  -- Full detail
    (year, region),            -- By year and region
    (year, category),          -- By year and category
    (year)                     -- By year only
);
```

---

## FILTER Clause

Conditional aggregation within a single query.

### Basic FILTER

```sql
SELECT
    category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE year = 2024) as count_2024,
    COUNT(*) FILTER (WHERE year = 2023) as count_2023,
    SUM(amount) FILTER (WHERE status = 'completed') as completed_amount,
    AVG(amount) FILTER (WHERE amount > 100) as avg_large_orders
FROM orders
GROUP BY category;
```

### FILTER with ROLLUP

```sql
SELECT
    region,
    category,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as active,
    SUM(amount) FILTER (WHERE year = 2024) as amount_2024
FROM sales
GROUP BY ROLLUP (region, category);
```

### Pivot with FILTER

```sql
-- Transform rows to columns
SELECT
    user_id,
    SUM(amount) FILTER (WHERE month = 1) as jan,
    SUM(amount) FILTER (WHERE month = 2) as feb,
    SUM(amount) FILTER (WHERE month = 3) as mar,
    -- ... more months
    SUM(amount) as total
FROM monthly_sales
GROUP BY user_id;
```

---

## GROUPING Function

Identify which columns are aggregated in each row.

### Basic Usage

```sql
SELECT
    region,
    category,
    SUM(amount) as total,
    GROUPING(region) as region_is_total,
    GROUPING(category) as category_is_total
FROM sales
GROUP BY ROLLUP (region, category);
```

Result:
```
region   | category | total | region_is_total | category_is_total
---------|----------|-------|-----------------|------------------
US       | A        | 1000  | 0               | 0
US       | NULL     | 3000  | 0               | 1  <- category rolled up
NULL     | NULL     | 5000  | 1               | 1  <- both rolled up
```

### Using GROUPING for Labels

```sql
SELECT
    CASE WHEN GROUPING(region) = 1 THEN 'All Regions'
         ELSE region END as region,
    CASE WHEN GROUPING(category) = 1 THEN 'All Categories'
         ELSE category END as category,
    SUM(amount) as total
FROM sales
GROUP BY ROLLUP (region, category);
```

### GROUPING_ID

```sql
SELECT
    region,
    category,
    SUM(amount),
    GROUPING(region, category) as grouping_id
FROM sales
GROUP BY CUBE (region, category);
-- grouping_id: 0=detail, 1=category total, 2=region total, 3=grand total
```

---

## Performance Tips

### Index for GROUP BY

```sql
-- Create index matching GROUP BY columns
CREATE INDEX idx_sales_region_category ON sales(region, category);

-- For GROUP BY with aggregate
CREATE INDEX idx_sales_covering ON sales(region, category)
INCLUDE (amount);
```

### Hash vs Group Aggregate

```sql
-- Check query plan
EXPLAIN ANALYZE
SELECT category, SUM(amount) FROM orders GROUP BY category;

-- HashAggregate: Builds hash table (needs work_mem)
-- GroupAggregate: Requires sorted input (uses index)
```

### Limit Groups

```sql
-- If only need top N groups
SELECT category, SUM(amount) as total
FROM orders
GROUP BY category
ORDER BY total DESC
LIMIT 10;
```

### Parallel Aggregation

```sql
-- PostgreSQL can parallelize aggregation
SET max_parallel_workers_per_gather = 4;

EXPLAIN ANALYZE
SELECT category, COUNT(*), SUM(amount)
FROM large_table
GROUP BY category;

-- Look for "Parallel Seq Scan" and "Partial Aggregate"
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [window-functions.md](window-functions.md)
- [query-analysis.md](query-analysis.md)
