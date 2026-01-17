# Query Analysis

Deep dive into EXPLAIN ANALYZE and query plan interpretation.

## Table of Contents

- [EXPLAIN Basics](#explain-basics)
- [Reading Query Plans](#reading-query-plans)
- [Scan Types](#scan-types)
- [Join Types](#join-types)
- [Cost Estimation](#cost-estimation)
- [Common Problems](#common-problems)

---

## EXPLAIN Basics

### EXPLAIN Options

```sql
-- Basic plan (estimated only)
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- With actual execution (runs the query!)
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- Additional details
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 123;

-- JSON output for tooling
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders WHERE user_id = 123;

-- Verbose shows output columns
EXPLAIN (VERBOSE)
SELECT * FROM orders WHERE user_id = 123;
```

### Key Output Fields

```
Seq Scan on orders  (cost=0.00..1520.00 rows=50 width=200)
                          ^^^^  ^^^^^^^  ^^^^ ^^^^^
                          |     |        |    Avg row size (bytes)
                          |     |        Estimated rows
                          |     Total cost
                          Startup cost

  Filter: (user_id = 123)
  Rows Removed by Filter: 99950
                          ^^^^^
                          Rows that didn't match filter

(actual time=0.015..45.123 rows=48 loops=1)
            ^^^^^  ^^^^^^  ^^^^  ^^^^^
            |      |       |     Times this node executed
            |      |       Actual rows returned
            |      Time to get all rows (ms)
            Time to first row (ms)
```

---

## Reading Query Plans

### Plan Structure

Plans are trees read **bottom-up, inside-out**:

```
HashAggregate  (3rd - aggregate)
  -> Hash Join  (2nd - join results)
       -> Seq Scan on orders  (1st - scan orders)
       -> Hash
            -> Index Scan on users  (1st - scan users)
```

### Example Analysis

```sql
EXPLAIN ANALYZE
SELECT u.name, COUNT(o.id)
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.name;
```

```
HashAggregate  (cost=2500.00..2510.00 rows=100 width=40)
               (actual time=125.234..125.456 rows=95 loops=1)
  Group Key: u.name
  ->  Hash Join  (cost=50.00..2400.00 rows=10000 width=40)
                 (actual time=1.234..100.567 rows=9876 loops=1)
        Hash Cond: (o.user_id = u.id)
        ->  Seq Scan on orders o  (cost=0.00..1500.00 rows=50000 width=8)
                                  (actual time=0.012..50.234 rows=50000 loops=1)
        ->  Hash  (cost=40.00..40.00 rows=100 width=40)
                  (actual time=0.567..0.567 rows=95 loops=1)
              ->  Index Scan using idx_users_created on users u
                                  (cost=0.00..40.00 rows=100 width=40)
                                  (actual time=0.034..0.456 rows=95 loops=1)
                    Index Cond: (created_at > '2024-01-01')
```

**Analysis:**
1. Index Scan on users - using index, good (95 rows)
2. Seq Scan on orders - full scan, might need index (50000 rows)
3. Hash Join - efficient for these sizes
4. HashAggregate - grouping results

**Potential optimization:** Add index on orders(user_id) if this query is frequent.

---

## Scan Types

### Sequential Scan

```
Seq Scan on orders  (cost=0.00..1520.00 rows=50000 width=100)
```

- Reads entire table
- Bad for small result sets on large tables
- OK for small tables or when reading >5-10% of rows

### Index Scan

```
Index Scan using idx_orders_user_id on orders
  Index Cond: (user_id = 123)
```

- Uses index to find rows
- Then fetches row data from table (heap)
- Good for selective queries

### Index Only Scan

```
Index Only Scan using idx_orders_covering on orders
  Index Cond: (user_id = 123)
  Heap Fetches: 0
```

- All needed data is in index
- No table (heap) access needed
- Best performance - requires covering index

### Bitmap Scan

```
Bitmap Heap Scan on orders
  Recheck Cond: (status = 'pending')
  ->  Bitmap Index Scan on idx_orders_status
        Index Cond: (status = 'pending')
```

- Creates bitmap of matching rows
- Then fetches from table in order
- Good for multiple conditions or moderate selectivity

---

## Join Types

### Nested Loop

```
Nested Loop  (cost=0.00..500.00 rows=100 width=200)
  ->  Seq Scan on users  (rows=10)
  ->  Index Scan on orders  (rows=10 loops=10)
```

- For each row in outer, scan inner
- O(n * m) worst case
- Good when outer is small AND inner has index

### Hash Join

```
Hash Join  (cost=100.00..2500.00 rows=10000 width=200)
  Hash Cond: (orders.user_id = users.id)
  ->  Seq Scan on orders
  ->  Hash
        ->  Seq Scan on users
```

- Build hash table from smaller relation
- Probe with larger relation
- Good for larger joins, needs memory

### Merge Join

```
Merge Join  (cost=500.00..1500.00 rows=10000 width=200)
  Merge Cond: (orders.user_id = users.id)
  ->  Index Scan on orders
  ->  Index Scan on users
```

- Both inputs must be sorted
- Efficient when already sorted (index)
- Good for very large joins

---

## Cost Estimation

### Cost Formula

```
Total Cost = (disk pages * seq_page_cost) +
             (rows * cpu_tuple_cost) +
             (rows * cpu_operator_cost)

Default values:
- seq_page_cost = 1.0
- random_page_cost = 4.0
- cpu_tuple_cost = 0.01
- cpu_operator_cost = 0.0025
```

### Why Estimates Are Wrong

1. **Stale statistics** - Run ANALYZE
2. **Correlation** - Planner assumes independence
3. **Skewed data** - Most common values not tracked
4. **Complex expressions** - Hard to estimate

```sql
-- Check statistics
SELECT attname, n_distinct, most_common_vals, most_common_freqs
FROM pg_stats
WHERE tablename = 'orders';

-- Update statistics
ANALYZE orders;

-- More detailed statistics
ALTER TABLE orders ALTER COLUMN status SET STATISTICS 1000;
ANALYZE orders;
```

---

## Common Problems

### Problem: Wrong Row Estimate

```
Index Scan on orders (cost=... rows=100)
                      (actual ... rows=50000)
                                   ^^^^^ Much higher!
```

**Solution:**
```sql
ANALYZE orders;
-- Or increase statistics target
ALTER TABLE orders ALTER COLUMN user_id SET STATISTICS 1000;
ANALYZE orders;
```

### Problem: Seq Scan Instead of Index

```
Seq Scan on orders
  Filter: (user_id = 123)
```

**Possible causes:**
1. No index exists
2. Table too small (index not worth it)
3. Statistics say most rows match
4. Random I/O cost too high

**Solutions:**
```sql
-- Create index
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Lower random page cost for SSDs
SET random_page_cost = 1.1;

-- Force index (debugging only!)
SET enable_seqscan = off;
```

### Problem: Inefficient Join Order

```
Hash Join
  ->  Seq Scan on large_table (rows=1000000)
  ->  Hash
        ->  Seq Scan on small_table (rows=100)
```

**Solution:** Planner usually gets this right with good statistics.
```sql
ANALYZE large_table;
ANALYZE small_table;
```

### Problem: Sort Spilling to Disk

```
Sort (actual ... Sort Method: external merge  Disk: 50000kB)
```

**Solution:**
```sql
-- Increase work_mem
SET work_mem = '256MB';

-- Or add index to avoid sort
CREATE INDEX idx_orders_date ON orders(created_at);
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [indexing-patterns.md](indexing-patterns.md)
- [vacuum-and-maintenance.md](vacuum-and-maintenance.md)
