# Window Functions

Complete guide to PostgreSQL window functions for analytics and reporting.

## Table of Contents

- [Window Function Basics](#window-function-basics)
- [Ranking Functions](#ranking-functions)
- [Offset Functions](#offset-functions)
- [Aggregate Windows](#aggregate-windows)
- [Frame Specifications](#frame-specifications)
- [Performance Tips](#performance-tips)

---

## Window Function Basics

### Syntax

```sql
function_name(args) OVER (
    [PARTITION BY partition_expression]
    [ORDER BY sort_expression [ASC|DESC]]
    [frame_clause]
)
```

### Simple Example

```sql
SELECT
    employee_id,
    department,
    salary,
    AVG(salary) OVER (PARTITION BY department) as dept_avg,
    salary - AVG(salary) OVER (PARTITION BY department) as diff_from_avg
FROM employees;
```

### Named Windows

```sql
SELECT
    employee_id,
    salary,
    RANK() OVER w as rank,
    DENSE_RANK() OVER w as dense_rank,
    ROW_NUMBER() OVER w as row_num
FROM employees
WINDOW w AS (ORDER BY salary DESC);
```

---

## Ranking Functions

### ROW_NUMBER

Sequential numbers, no gaps, no ties.

```sql
-- Number all orders per user
SELECT
    user_id,
    order_id,
    created_at,
    ROW_NUMBER() OVER (
        PARTITION BY user_id
        ORDER BY created_at
    ) as order_sequence
FROM orders;

-- Get first order per user
WITH numbered AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as rn
    FROM orders
)
SELECT * FROM numbered WHERE rn = 1;

-- Get latest N per group
WITH numbered AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY category ORDER BY created_at DESC) as rn
    FROM products
)
SELECT * FROM numbered WHERE rn <= 5;
```

### RANK

Same rank for ties, gaps after ties.

```sql
SELECT
    player_id,
    score,
    RANK() OVER (ORDER BY score DESC) as rank
FROM game_scores;
-- Result: 1, 2, 2, 4, 5 (gap after tie)
```

### DENSE_RANK

Same rank for ties, no gaps.

```sql
SELECT
    player_id,
    score,
    DENSE_RANK() OVER (ORDER BY score DESC) as rank
FROM game_scores;
-- Result: 1, 2, 2, 3, 4 (no gap)
```

### NTILE

Divide into N buckets.

```sql
-- Divide customers into quartiles by total spend
SELECT
    customer_id,
    total_spent,
    NTILE(4) OVER (ORDER BY total_spent DESC) as quartile
FROM customer_totals;
-- 1 = top 25%, 2 = 26-50%, etc.
```

### PERCENT_RANK and CUME_DIST

```sql
SELECT
    employee_id,
    salary,
    PERCENT_RANK() OVER (ORDER BY salary) as percentile,    -- 0 to 1
    CUME_DIST() OVER (ORDER BY salary) as cumulative_dist   -- > 0 to 1
FROM employees;
```

---

## Offset Functions

### LAG - Previous Row Value

```sql
-- Compare to previous month
SELECT
    month,
    revenue,
    LAG(revenue, 1) OVER (ORDER BY month) as prev_month,
    revenue - LAG(revenue, 1) OVER (ORDER BY month) as change
FROM monthly_revenue;

-- With default for first row
SELECT
    date,
    value,
    LAG(value, 1, 0) OVER (ORDER BY date) as prev_value
FROM metrics;
```

### LEAD - Next Row Value

```sql
-- Time to next event
SELECT
    event_id,
    event_time,
    LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time) as next_event,
    LEAD(event_time) OVER (PARTITION BY user_id ORDER BY event_time) - event_time as time_to_next
FROM user_events;
```

### FIRST_VALUE and LAST_VALUE

```sql
SELECT
    employee_id,
    department,
    salary,
    FIRST_VALUE(salary) OVER (
        PARTITION BY department
        ORDER BY salary DESC
    ) as highest_in_dept,
    LAST_VALUE(salary) OVER (
        PARTITION BY department
        ORDER BY salary DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as lowest_in_dept
FROM employees;
```

### NTH_VALUE

```sql
-- Get 2nd highest salary per department
SELECT
    department,
    employee_id,
    salary,
    NTH_VALUE(salary, 2) OVER (
        PARTITION BY department
        ORDER BY salary DESC
        ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
    ) as second_highest
FROM employees;
```

---

## Aggregate Windows

### Running Totals

```sql
SELECT
    date,
    amount,
    SUM(amount) OVER (ORDER BY date) as running_total,
    SUM(amount) OVER (PARTITION BY category ORDER BY date) as category_running
FROM transactions;
```

### Moving Averages

```sql
-- 7-day moving average
SELECT
    date,
    value,
    AVG(value) OVER (
        ORDER BY date
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) as moving_avg_7
FROM daily_metrics;

-- Centered moving average
SELECT
    date,
    value,
    AVG(value) OVER (
        ORDER BY date
        ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    ) as centered_avg
FROM daily_metrics;
```

### Cumulative Statistics

```sql
SELECT
    date,
    value,
    SUM(value) OVER w as cumulative_sum,
    AVG(value) OVER w as cumulative_avg,
    MIN(value) OVER w as cumulative_min,
    MAX(value) OVER w as cumulative_max,
    COUNT(*) OVER w as cumulative_count
FROM daily_metrics
WINDOW w AS (ORDER BY date);
```

### Percentage of Total

```sql
SELECT
    category,
    amount,
    SUM(amount) OVER () as total,
    ROUND(100.0 * amount / SUM(amount) OVER (), 2) as percentage
FROM category_totals;

-- Per group percentage
SELECT
    region,
    category,
    amount,
    SUM(amount) OVER (PARTITION BY region) as region_total,
    ROUND(100.0 * amount / SUM(amount) OVER (PARTITION BY region), 2) as pct_of_region
FROM regional_sales;
```

---

## Frame Specifications

### Frame Types

```sql
-- ROWS: Physical row count
ROWS BETWEEN 3 PRECEDING AND CURRENT ROW

-- RANGE: Logical value range (requires ORDER BY)
RANGE BETWEEN 3 PRECEDING AND CURRENT ROW

-- GROUPS: Group count (PG 11+)
GROUPS BETWEEN 1 PRECEDING AND 1 FOLLOWING
```

### Frame Boundaries

```sql
UNBOUNDED PRECEDING    -- First row of partition
N PRECEDING           -- N rows/values before current
CURRENT ROW           -- Current row
N FOLLOWING           -- N rows/values after current
UNBOUNDED FOLLOWING   -- Last row of partition
```

### Examples

```sql
-- Running total (default frame)
SUM(amount) OVER (ORDER BY date)
-- Same as: RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- All rows in partition
SUM(amount) OVER (
    PARTITION BY category
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
)

-- 3 rows before to 3 rows after
AVG(value) OVER (
    ORDER BY date
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
)

-- Current row to end
SUM(amount) OVER (
    ORDER BY date
    ROWS BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING
)
```

### EXCLUDE Clause (PG 11+)

```sql
-- Exclude current row from calculation
AVG(value) OVER (
    ORDER BY date
    ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING
    EXCLUDE CURRENT ROW
)

-- Options: EXCLUDE CURRENT ROW, EXCLUDE GROUP, EXCLUDE TIES, EXCLUDE NO OTHERS
```

---

## Performance Tips

### Index for ORDER BY

```sql
-- This window function:
SELECT *, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
FROM orders;

-- Benefits from:
CREATE INDEX idx_orders_created ON orders(created_at DESC);
```

### Partition + Order Index

```sql
-- For:
ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at)

-- Create:
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);
```

### Avoid Multiple Passes

```sql
-- Bad: Multiple window calculations with different sorts
SELECT
    ROW_NUMBER() OVER (ORDER BY a) as rn1,
    ROW_NUMBER() OVER (ORDER BY b) as rn2
FROM table;

-- Better: Same window when possible
SELECT
    ROW_NUMBER() OVER w as rn,
    SUM(amount) OVER w as running
FROM orders
WINDOW w AS (ORDER BY created_at);
```

### Materialize Before Windowing

```sql
-- If filtering on window results, use CTE
WITH windowed AS (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
    FROM orders
)
SELECT * FROM windowed WHERE rn = 1;
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [query-analysis.md](query-analysis.md)
- [aggregation-patterns.md](aggregation-patterns.md)
