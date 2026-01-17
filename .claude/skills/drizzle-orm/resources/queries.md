# Drizzle Queries

## Select Queries

### Basic Select

```typescript
import { db } from '@/db';
import { users } from '@/db/schema';

// Select all columns
const allUsers = await db.select().from(users);

// Select specific columns
const userNames = await db
  .select({
    id: users.id,
    name: users.name,
  })
  .from(users);

// Select with alias
const result = await db
  .select({
    identifier: users.id,
    fullName: users.name,
  })
  .from(users);
```

### Where Clauses

```typescript
import { eq, ne, gt, gte, lt, lte, like, ilike, between, inArray, isNull, isNotNull, and, or, not } from 'drizzle-orm';

// Equality
const user = await db.select().from(users).where(eq(users.id, userId));

// Not equal
const activeUsers = await db.select().from(users).where(ne(users.status, 'inactive'));

// Comparison
const recentUsers = await db.select().from(users).where(gt(users.createdAt, lastWeek));

// Like (case-sensitive)
const johns = await db.select().from(users).where(like(users.name, 'John%'));

// ILike (case-insensitive, PostgreSQL)
const johns = await db.select().from(users).where(ilike(users.name, '%john%'));

// Between
const midRange = await db.select().from(products).where(between(products.price, 10, 50));

// In array
const specificUsers = await db.select().from(users).where(inArray(users.id, [id1, id2, id3]));

// Null checks
const unverified = await db.select().from(users).where(isNull(users.emailVerified));
const verified = await db.select().from(users).where(isNotNull(users.emailVerified));

// AND
const activeAdmins = await db
  .select()
  .from(users)
  .where(and(eq(users.role, 'admin'), eq(users.active, true)));

// OR
const staffMembers = await db
  .select()
  .from(users)
  .where(or(eq(users.role, 'admin'), eq(users.role, 'moderator')));

// NOT
const nonAdmins = await db.select().from(users).where(not(eq(users.role, 'admin')));
```

### Ordering and Pagination

```typescript
import { asc, desc } from 'drizzle-orm';

// Order by
const sortedUsers = await db
  .select()
  .from(users)
  .orderBy(asc(users.name));

// Multiple order by
const sorted = await db
  .select()
  .from(posts)
  .orderBy(desc(posts.createdAt), asc(posts.title));

// Limit and offset
const page1 = await db
  .select()
  .from(users)
  .limit(10)
  .offset(0);

// Pagination helper
async function getUsers(page: number, pageSize: number) {
  return db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(pageSize)
    .offset((page - 1) * pageSize);
}
```

### Aggregations

```typescript
import { count, sum, avg, min, max, sql } from 'drizzle-orm';

// Count
const [{ count: userCount }] = await db
  .select({ count: count() })
  .from(users);

// Count with condition
const [{ count: adminCount }] = await db
  .select({ count: count() })
  .from(users)
  .where(eq(users.role, 'admin'));

// Sum
const [{ total }] = await db
  .select({ total: sum(orders.amount) })
  .from(orders);

// Average
const [{ avgPrice }] = await db
  .select({ avgPrice: avg(products.price) })
  .from(products);

// Group by
const roleStats = await db
  .select({
    role: users.role,
    count: count(),
  })
  .from(users)
  .groupBy(users.role);

// Having
const popularAuthors = await db
  .select({
    authorId: posts.authorId,
    postCount: count(),
  })
  .from(posts)
  .groupBy(posts.authorId)
  .having(sql`count(*) > 5`);
```

### Joins

```typescript
// Inner join
const postsWithAuthors = await db
  .select({
    post: posts,
    author: users,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));

// Left join
const usersWithPosts = await db
  .select({
    user: users,
    post: posts,
  })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));

// Select specific columns from join
const result = await db
  .select({
    postTitle: posts.title,
    authorName: users.name,
  })
  .from(posts)
  .innerJoin(users, eq(posts.authorId, users.id));
```

## Query API (Relations)

```typescript
// Find first
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
});

// Find many
const allUsers = await db.query.users.findMany({
  where: eq(users.role, 'admin'),
  orderBy: desc(users.createdAt),
  limit: 10,
});

// With relations
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 5,
    },
  },
});

// Nested relations
const postWithComments = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    author: true,
    comments: {
      with: {
        author: {
          columns: { id: true, name: true },
        },
      },
      orderBy: desc(comments.createdAt),
    },
  },
});

// Select specific columns
const userNames = await db.query.users.findMany({
  columns: {
    id: true,
    name: true,
  },
});
```

## Insert

```typescript
// Single insert
const [newUser] = await db
  .insert(users)
  .values({
    name: 'John',
    email: 'john@example.com',
  })
  .returning();

// Bulk insert
await db.insert(posts).values([
  { title: 'Post 1', authorId },
  { title: 'Post 2', authorId },
]);

// On conflict (upsert)
await db
  .insert(users)
  .values({ email: 'test@example.com', name: 'Test' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Updated', updatedAt: new Date() },
  });

// On conflict do nothing
await db
  .insert(users)
  .values({ email: 'test@example.com', name: 'Test' })
  .onConflictDoNothing();
```

## Update

```typescript
// Update with returning
const [updated] = await db
  .update(users)
  .set({ name: 'New Name' })
  .where(eq(users.id, userId))
  .returning();

// Update multiple fields
await db
  .update(posts)
  .set({
    title: 'New Title',
    updatedAt: new Date(),
  })
  .where(eq(posts.id, postId));

// Increment
await db
  .update(posts)
  .set({ views: sql`${posts.views} + 1` })
  .where(eq(posts.id, postId));
```

## Delete

```typescript
// Delete with returning
const [deleted] = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning();

// Delete many
await db.delete(posts).where(eq(posts.published, false));
```
