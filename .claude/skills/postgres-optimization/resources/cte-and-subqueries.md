# CTEs and Subqueries

Guide to Common Table Expressions and subquery optimization.

## Table of Contents

- [CTE Basics](#cte-basics)
- [Recursive CTEs](#recursive-ctes)
- [CTE Materialization](#cte-materialization)
- [Subquery Patterns](#subquery-patterns)
- [Performance Optimization](#performance-optimization)

---

## CTE Basics

### Simple CTE

```sql
WITH active_users AS (
    SELECT user_id, COUNT(*) as order_count
    FROM orders
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY user_id
    HAVING COUNT(*) >= 5
)
SELECT
    u.id,
    u.email,
    au.order_count
FROM users u
JOIN active_users au ON u.id = au.user_id;
```

### Multiple CTEs

```sql
WITH
monthly_sales AS (
    SELECT
        DATE_TRUNC('month', created_at) as month,
        SUM(total) as total
    FROM orders
    GROUP BY 1
),
monthly_avg AS (
    SELECT AVG(total) as avg_total
    FROM monthly_sales
)
SELECT
    ms.month,
    ms.total,
    ma.avg_total,
    ms.total - ma.avg_total as diff_from_avg
FROM monthly_sales ms
CROSS JOIN monthly_avg ma
ORDER BY ms.month;
```

### CTEs Referencing Each Other

```sql
WITH
orders_summary AS (
    SELECT user_id, COUNT(*) as orders, SUM(total) as total
    FROM orders
    GROUP BY user_id
),
users_with_orders AS (
    SELECT u.*, os.orders, os.total
    FROM users u
    JOIN orders_summary os ON u.id = os.user_id
),
top_users AS (
    SELECT *
    FROM users_with_orders
    WHERE total > 1000
    ORDER BY total DESC
    LIMIT 100
)
SELECT * FROM top_users;
```

---

## Recursive CTEs

### Basic Structure

```sql
WITH RECURSIVE cte_name AS (
    -- Base case (non-recursive term)
    SELECT initial_columns
    FROM initial_table
    WHERE initial_condition

    UNION [ALL]

    -- Recursive case
    SELECT derived_columns
    FROM table
    JOIN cte_name ON join_condition
    WHERE termination_condition
)
SELECT * FROM cte_name;
```

### Hierarchical Data (Org Chart)

```sql
WITH RECURSIVE org_tree AS (
    -- Base: top-level managers
    SELECT
        id,
        name,
        manager_id,
        1 as level,
        ARRAY[id] as path,
        name as hierarchy
    FROM employees
    WHERE manager_id IS NULL

    UNION ALL

    -- Recursive: employees under managers
    SELECT
        e.id,
        e.name,
        e.manager_id,
        ot.level + 1,
        ot.path || e.id,
        ot.hierarchy || ' > ' || e.name
    FROM employees e
    JOIN org_tree ot ON e.manager_id = ot.id
    WHERE NOT e.id = ANY(ot.path)  -- Prevent cycles
)
SELECT * FROM org_tree ORDER BY path;
```

### Category Tree

```sql
WITH RECURSIVE category_tree AS (
    SELECT id, name, parent_id, name::text as full_path
    FROM categories
    WHERE parent_id IS NULL

    UNION ALL

    SELECT c.id, c.name, c.parent_id, ct.full_path || ' / ' || c.name
    FROM categories c
    JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree;
```

### Number Series

```sql
WITH RECURSIVE numbers AS (
    SELECT 1 as n
    UNION ALL
    SELECT n + 1 FROM numbers WHERE n < 100
)
SELECT * FROM numbers;

-- Better: use generate_series for simple sequences
SELECT * FROM generate_series(1, 100);
```

### Date Series

```sql
WITH RECURSIVE dates AS (
    SELECT '2024-01-01'::date as date
    UNION ALL
    SELECT date + 1 FROM dates WHERE date < '2024-12-31'
)
SELECT * FROM dates;

-- Better: use generate_series
SELECT generate_series('2024-01-01'::date, '2024-12-31', '1 day')::date as date;
```

### Graph Traversal (Finding Paths)

```sql
WITH RECURSIVE paths AS (
    -- Start from source
    SELECT
        source_id,
        target_id,
        ARRAY[source_id, target_id] as path,
        1 as hops
    FROM edges
    WHERE source_id = 1

    UNION ALL

    -- Follow edges
    SELECT
        p.source_id,
        e.target_id,
        p.path || e.target_id,
        p.hops + 1
    FROM paths p
    JOIN edges e ON p.target_id = e.source_id
    WHERE NOT e.target_id = ANY(p.path)  -- No cycles
      AND p.hops < 10  -- Max depth
)
SELECT * FROM paths WHERE target_id = 10;
```

---

## CTE Materialization

### PostgreSQL 12+ Behavior

```sql
-- NOT MATERIALIZED: Inline into main query (may run multiple times)
WITH cte AS NOT MATERIALIZED (
    SELECT * FROM large_table WHERE condition
)
SELECT * FROM cte WHERE x = 1
UNION
SELECT * FROM cte WHERE x = 2;

-- MATERIALIZED: Execute once, store result
WITH cte AS MATERIALIZED (
    SELECT * FROM large_table WHERE expensive_function(col)
)
SELECT * FROM cte WHERE x = 1
UNION
SELECT * FROM cte WHERE x = 2;
```

### When to Materialize

```sql
-- Materialize when:
-- 1. CTE is referenced multiple times
-- 2. CTE is expensive to compute
-- 3. You need optimization barrier

-- Don't materialize when:
-- 1. CTE is referenced once
-- 2. Main query has selective filters
-- 3. You want predicate pushdown
```

---

## Subquery Patterns

### Scalar Subquery

```sql
SELECT
    id,
    name,
    (SELECT COUNT(*) FROM orders WHERE user_id = users.id) as order_count
FROM users;

-- Often better as JOIN:
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id, u.name;
```

### EXISTS vs IN

```sql
-- EXISTS: Stops at first match (usually faster)
SELECT * FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- IN: Builds full list first
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders);

-- NOT EXISTS vs NOT IN
-- NOT EXISTS handles NULLs correctly
SELECT * FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- NOT IN fails if subquery returns NULL!
SELECT * FROM users
WHERE id NOT IN (SELECT user_id FROM orders);  -- Dangerous if NULLs
```

### Correlated vs Non-Correlated

```sql
-- Correlated: References outer query (runs per row)
SELECT * FROM users u
WHERE (SELECT MAX(total) FROM orders WHERE user_id = u.id) > 1000;

-- Non-correlated: Independent (runs once)
SELECT * FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);
```

### LATERAL Subquery

```sql
-- Get top 3 orders per user
SELECT u.id, u.name, top_orders.*
FROM users u
CROSS JOIN LATERAL (
    SELECT id, total, created_at
    FROM orders
    WHERE user_id = u.id
    ORDER BY total DESC
    LIMIT 3
) as top_orders;
```

---

## Performance Optimization

### CTE vs Subquery Performance

```sql
-- CTE (may materialize, blocking optimization)
WITH expensive AS (
    SELECT * FROM big_table
)
SELECT * FROM expensive WHERE id = 1;

-- Subquery (optimizer can push down predicates)
SELECT * FROM (
    SELECT * FROM big_table
) sub WHERE id = 1;

-- Force non-materialization in PG 12+
WITH expensive AS NOT MATERIALIZED (
    SELECT * FROM big_table
)
SELECT * FROM expensive WHERE id = 1;
```

### Avoid N+1 with CTEs

```sql
-- Bad: Scalar subquery per row
SELECT
    id,
    (SELECT name FROM categories WHERE id = products.category_id)
FROM products;

-- Good: CTE with JOIN
WITH cats AS (SELECT id, name FROM categories)
SELECT p.id, c.name
FROM products p
LEFT JOIN cats c ON c.id = p.category_id;
```

### Limiting Recursive Depth

```sql
WITH RECURSIVE tree AS (
    SELECT id, parent_id, 1 as depth
    FROM nodes WHERE parent_id IS NULL

    UNION ALL

    SELECT n.id, n.parent_id, t.depth + 1
    FROM nodes n
    JOIN tree t ON n.parent_id = t.id
    WHERE t.depth < 10  -- Prevent infinite recursion
)
SELECT * FROM tree;
```

### Optimize Recursive CTEs

```sql
-- Add indexes for recursive joins
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- Use UNION ALL instead of UNION when duplicates aren't possible
WITH RECURSIVE tree AS (
    SELECT id FROM nodes WHERE id = 1
    UNION ALL  -- Faster than UNION
    SELECT n.id FROM nodes n JOIN tree t ON n.parent_id = t.id
)
SELECT * FROM tree;
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [query-analysis.md](query-analysis.md)
- [window-functions.md](window-functions.md)
