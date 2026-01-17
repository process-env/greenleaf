# Advanced SQL

Advanced PostgreSQL features and patterns.

## Table of Contents

- [LATERAL Joins](#lateral-joins)
- [Array Operations](#array-operations)
- [JSON Functions](#json-functions)
- [UPSERT](#upsert)
- [Returning Clause](#returning-clause)
- [Other Advanced Features](#other-advanced-features)

---

## LATERAL Joins

Subquery can reference columns from preceding tables.

### Top N Per Group

```sql
-- Get top 3 orders per user
SELECT u.id, u.name, top_orders.*
FROM users u
CROSS JOIN LATERAL (
    SELECT id, total, created_at
    FROM orders o
    WHERE o.user_id = u.id
    ORDER BY total DESC
    LIMIT 3
) AS top_orders;

-- With LEFT JOIN LATERAL for users with no orders
SELECT u.id, u.name, recent.*
FROM users u
LEFT JOIN LATERAL (
    SELECT id, total
    FROM orders o
    WHERE o.user_id = u.id
    ORDER BY created_at DESC
    LIMIT 1
) AS recent ON true;
```

### Expand Arrays

```sql
SELECT
    id,
    name,
    tag
FROM posts
CROSS JOIN LATERAL unnest(tags) AS tag;

-- With ordinality (position)
SELECT
    id,
    tag,
    position
FROM posts
CROSS JOIN LATERAL unnest(tags) WITH ORDINALITY AS t(tag, position);
```

### Generate Related Data

```sql
-- Generate date range for each subscription
SELECT
    s.id,
    s.start_date,
    s.end_date,
    d.date
FROM subscriptions s
CROSS JOIN LATERAL generate_series(
    s.start_date,
    s.end_date,
    '1 day'::interval
) AS d(date);
```

---

## Array Operations

### Array Functions

```sql
-- Create arrays
SELECT ARRAY[1, 2, 3];
SELECT ARRAY_AGG(name) FROM users;
SELECT string_to_array('a,b,c', ',');

-- Access elements (1-indexed)
SELECT tags[1] FROM posts;
SELECT tags[1:3] FROM posts;  -- Slice

-- Array contains
SELECT * FROM posts WHERE 'postgres' = ANY(tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgres', 'sql'];
SELECT * FROM posts WHERE tags && ARRAY['postgres', 'mysql'];

-- Array length
SELECT array_length(tags, 1) FROM posts;
SELECT cardinality(tags) FROM posts;

-- Append/prepend
SELECT array_append(tags, 'new') FROM posts;
SELECT array_prepend('first', tags) FROM posts;
SELECT array_cat(tags, ARRAY['a', 'b']) FROM posts;

-- Remove
SELECT array_remove(tags, 'old') FROM posts;

-- Position
SELECT array_position(tags, 'postgres') FROM posts;
```

### Unnest and Aggregate

```sql
-- Expand array to rows
SELECT id, unnest(tags) as tag FROM posts;

-- With row number
SELECT id, tag, row_number
FROM posts,
     unnest(tags) WITH ORDINALITY AS t(tag, row_number);

-- Aggregate back to array
SELECT
    user_id,
    array_agg(DISTINCT category ORDER BY category) as categories
FROM orders
GROUP BY user_id;
```

---

## JSON Functions

### JSONB Operations

```sql
-- Access fields
SELECT data->>'name' FROM users;           -- As text
SELECT data->'address'->>'city' FROM users; -- Nested
SELECT data#>>'{address,city}' FROM users;  -- Path notation

-- Check existence
SELECT * FROM events WHERE data ? 'user_id';
SELECT * FROM events WHERE data ?& ARRAY['type', 'timestamp'];
SELECT * FROM events WHERE data ?| ARRAY['error', 'warning'];

-- Contains
SELECT * FROM events WHERE data @> '{"type": "click"}';

-- Modify JSONB
UPDATE users SET data = data || '{"verified": true}';
UPDATE users SET data = data - 'temp_field';
UPDATE users SET data = data #- '{address,zip}';
UPDATE users SET data = jsonb_set(data, '{name}', '"John"');
```

### JSON Aggregation

```sql
-- Build JSON object
SELECT jsonb_build_object(
    'id', id,
    'name', name,
    'email', email
) FROM users;

-- Aggregate to JSON array
SELECT jsonb_agg(jsonb_build_object('id', id, 'name', name))
FROM users;

-- Object aggregation
SELECT jsonb_object_agg(key, value)
FROM settings;
```

### Expand JSON

```sql
-- Object to rows
SELECT * FROM jsonb_each('{"a": 1, "b": 2}');
SELECT * FROM jsonb_each_text('{"a": 1, "b": 2}');

-- Array to rows
SELECT * FROM jsonb_array_elements('[1, 2, 3]');
SELECT * FROM jsonb_array_elements_text('["a", "b", "c"]');

-- To record
SELECT * FROM jsonb_to_record('{"a": 1, "b": "x"}')
    AS t(a int, b text);
```

---

## UPSERT

INSERT ... ON CONFLICT for atomic insert-or-update.

### Basic UPSERT

```sql
-- Insert or update
INSERT INTO users (id, email, name)
VALUES (1, 'john@example.com', 'John')
ON CONFLICT (id)
DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    updated_at = NOW();

-- Insert or ignore
INSERT INTO users (id, email)
VALUES (1, 'john@example.com')
ON CONFLICT (id) DO NOTHING;
```

### On Conflict Target

```sql
-- Single column
ON CONFLICT (id)

-- Multiple columns
ON CONFLICT (user_id, product_id)

-- On constraint name
ON CONFLICT ON CONSTRAINT users_email_unique

-- Partial index
ON CONFLICT (email) WHERE is_active = true
```

### Conditional Update

```sql
-- Only update if newer
INSERT INTO events (id, data, version)
VALUES (1, '{}', 5)
ON CONFLICT (id)
DO UPDATE SET
    data = EXCLUDED.data,
    version = EXCLUDED.version
WHERE events.version < EXCLUDED.version;
```

### Bulk UPSERT

```sql
INSERT INTO inventory (product_id, quantity)
VALUES
    (1, 100),
    (2, 200),
    (3, 150)
ON CONFLICT (product_id)
DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity;
```

---

## Returning Clause

Get affected rows from DML statements.

### INSERT RETURNING

```sql
-- Get generated ID
INSERT INTO users (name, email)
VALUES ('John', 'john@example.com')
RETURNING id;

-- Get entire row
INSERT INTO users (name, email)
VALUES ('John', 'john@example.com')
RETURNING *;

-- Multiple rows
INSERT INTO orders (user_id, total)
VALUES (1, 100), (2, 200)
RETURNING id, user_id;
```

### UPDATE RETURNING

```sql
-- Get updated values
UPDATE orders
SET status = 'shipped'
WHERE id = 1
RETURNING id, status, updated_at;

-- With CTE for further processing
WITH updated AS (
    UPDATE orders
    SET status = 'shipped'
    WHERE status = 'pending' AND created_at < NOW() - INTERVAL '7 days'
    RETURNING *
)
INSERT INTO audit_log (action, data)
SELECT 'auto_ship', to_jsonb(updated.*) FROM updated;
```

### DELETE RETURNING

```sql
-- Archive deleted rows
WITH deleted AS (
    DELETE FROM orders
    WHERE status = 'cancelled' AND created_at < NOW() - INTERVAL '1 year'
    RETURNING *
)
INSERT INTO orders_archive SELECT * FROM deleted;
```

---

## Other Advanced Features

### DISTINCT ON

```sql
-- First row per group (instead of window function)
SELECT DISTINCT ON (user_id)
    user_id, id, created_at
FROM orders
ORDER BY user_id, created_at DESC;
```

### EXCLUDE Constraints

```sql
-- Prevent overlapping ranges
CREATE TABLE reservations (
    room_id INTEGER,
    during TSTZRANGE,
    EXCLUDE USING GIST (room_id WITH =, during WITH &&)
);
```

### Table Inheritance

```sql
-- Parent table
CREATE TABLE logs (
    id SERIAL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    message TEXT
);

-- Child tables
CREATE TABLE error_logs (
    error_code INTEGER
) INHERITS (logs);

CREATE TABLE access_logs (
    ip_address INET
) INHERITS (logs);

-- Query parent includes children
SELECT * FROM logs;

-- Query parent only
SELECT * FROM ONLY logs;
```

### Generated Columns

```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    price DECIMAL NOT NULL,
    quantity INTEGER NOT NULL,
    total DECIMAL GENERATED ALWAYS AS (price * quantity) STORED
);
```

### Row-Level Security

```sql
-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: users see only their orders
CREATE POLICY user_orders ON orders
    FOR ALL
    USING (user_id = current_user_id());

-- Bypass RLS for admin
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
GRANT ALL ON orders TO admin;
ALTER ROLE admin BYPASSRLS;
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [cte-and-subqueries.md](cte-and-subqueries.md)
- [indexing-patterns.md](indexing-patterns.md)
