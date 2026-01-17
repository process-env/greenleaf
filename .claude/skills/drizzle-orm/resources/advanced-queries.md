# Advanced Drizzle Queries

## Transactions

### Basic Transaction

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'John', email: 'john@example.com' })
    .returning();

  await tx.insert(profiles).values({
    userId: user.id,
    bio: 'New user',
  });
});
```

### With Rollback

```typescript
try {
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({ userId, total: 100 });

    const [balance] = await tx
      .select({ balance: wallets.balance })
      .from(wallets)
      .where(eq(wallets.userId, userId));

    if (balance.balance < 100) {
      tx.rollback();
      // or: throw new Error('Insufficient funds');
    }

    await tx
      .update(wallets)
      .set({ balance: sql`${wallets.balance} - 100` })
      .where(eq(wallets.userId, userId));
  });
} catch (error) {
  console.error('Transaction failed:', error);
}
```

### Nested Transactions (Savepoints)

```typescript
await db.transaction(async (tx) => {
  await tx.insert(users).values({ name: 'User 1', email: 'u1@example.com' });

  try {
    await tx.transaction(async (tx2) => {
      await tx2.insert(users).values({ name: 'User 2', email: 'u2@example.com' });
      throw new Error('Nested failure');
    });
  } catch {
    // Only nested transaction rolled back
    console.log('Nested transaction failed, continuing...');
  }

  // This still commits
  await tx.insert(users).values({ name: 'User 3', email: 'u3@example.com' });
});
```

## Raw SQL

### SQL Template

```typescript
import { sql } from 'drizzle-orm';

// Raw query
const result = await db.execute(sql`SELECT * FROM users WHERE id = ${userId}`);

// With type safety
const users = await db.execute<{ id: string; name: string }>(
  sql`SELECT id, name FROM users WHERE role = ${role}`
);
```

### SQL in Expressions

```typescript
// In select
const results = await db
  .select({
    id: users.id,
    name: users.name,
    fullInfo: sql<string>`${users.name} || ' <' || ${users.email} || '>'`,
  })
  .from(users);

// In where
const recentUsers = await db
  .select()
  .from(users)
  .where(sql`${users.createdAt} > NOW() - INTERVAL '7 days'`);

// In order by
const sorted = await db
  .select()
  .from(products)
  .orderBy(sql`RANDOM()`);
```

### SQL Operators

```typescript
import { sql, eq, and } from 'drizzle-orm';

// Array contains (PostgreSQL)
const usersWithTag = await db
  .select()
  .from(users)
  .where(sql`${users.tags} @> ARRAY['typescript']`);

// JSON operations
const usersInCity = await db
  .select()
  .from(users)
  .where(sql`${users.metadata}->>'city' = 'NYC'`);

// Full text search
const searchResults = await db
  .select()
  .from(posts)
  .where(sql`to_tsvector('english', ${posts.title} || ' ' || ${posts.content}) @@ plainto_tsquery('english', ${query})`);
```

## Prepared Statements

```typescript
// Prepare statement
const getUserById = db
  .select()
  .from(users)
  .where(eq(users.id, sql.placeholder('id')))
  .prepare('get_user_by_id');

// Execute with different values
const user1 = await getUserById.execute({ id: 'user-1' });
const user2 = await getUserById.execute({ id: 'user-2' });

// Prepared insert
const createUser = db
  .insert(users)
  .values({
    name: sql.placeholder('name'),
    email: sql.placeholder('email'),
  })
  .returning()
  .prepare('create_user');

const newUser = await createUser.execute({
  name: 'John',
  email: 'john@example.com',
});
```

## Subqueries

```typescript
// Subquery in select
const usersWithPostCount = await db
  .select({
    id: users.id,
    name: users.name,
    postCount: sql<number>`(
      SELECT COUNT(*) FROM ${posts} WHERE ${posts.authorId} = ${users.id}
    )`,
  })
  .from(users);

// Subquery in where
const sq = db
  .select({ authorId: posts.authorId })
  .from(posts)
  .where(eq(posts.published, true))
  .as('sq');

const activeAuthors = await db
  .select()
  .from(users)
  .where(inArray(users.id, db.select({ id: sq.authorId }).from(sq)));

// Subquery in from
const subquery = db
  .select({
    authorId: posts.authorId,
    count: count().as('count'),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .as('post_counts');

const results = await db
  .select({
    userName: users.name,
    postCount: subquery.count,
  })
  .from(users)
  .innerJoin(subquery, eq(users.id, subquery.authorId));
```

## CTEs (Common Table Expressions)

```typescript
// WITH clause
const results = await db.execute(sql`
  WITH active_users AS (
    SELECT id, name FROM users WHERE last_login > NOW() - INTERVAL '30 days'
  ),
  user_posts AS (
    SELECT author_id, COUNT(*) as post_count FROM posts GROUP BY author_id
  )
  SELECT au.name, COALESCE(up.post_count, 0) as posts
  FROM active_users au
  LEFT JOIN user_posts up ON au.id = up.author_id
`);
```

## Window Functions

```typescript
const rankedPosts = await db.execute<{
  id: string;
  title: string;
  rank: number;
}>(sql`
  SELECT
    id,
    title,
    ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rank
  FROM posts
  WHERE published = true
`);

// Get latest post per author
const latestPosts = await db.execute(sql`
  SELECT * FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY author_id ORDER BY created_at DESC) as rn
    FROM posts
  ) t
  WHERE rn = 1
`);
```

## Batch Operations

```typescript
// Batch insert with chunks
async function batchInsert<T>(items: T[], chunkSize = 100) {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await db.insert(users).values(chunk);
  }
}

// Parallel queries
const [userCount, postCount, commentCount] = await Promise.all([
  db.select({ count: count() }).from(users),
  db.select({ count: count() }).from(posts),
  db.select({ count: count() }).from(comments),
]);
```

## Query Logging

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, {
  schema,
  logger: {
    logQuery(query, params) {
      console.log('Query:', query);
      console.log('Params:', params);
    },
  },
});
```

## Connection Pooling

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Connection pool configuration
const client = postgres(process.env.DATABASE_URL!, {
  max: 10, // Maximum connections
  idle_timeout: 20, // Close idle connections after 20 seconds
  connect_timeout: 10, // Connection timeout
});

export const db = drizzle(client, { schema });
```
