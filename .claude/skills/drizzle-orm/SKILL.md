---
name: drizzle-orm
description: Type-safe SQL database access with Drizzle ORM for PostgreSQL, MySQL, and SQLite. Covers schema definition, queries, relations, migrations, and advanced patterns.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  drizzle-orm: "0.36+"
  drizzle-kit: "0.30+"
---

# Drizzle ORM

> **Updated 2026-01-11:** Drizzle ORM 0.36+ with latest query patterns.

## Purpose

Complete guide for type-safe SQL database access using Drizzle ORM. Covers schema definition, queries, relations, migrations, and integration with Next.js applications.

## When to Use This Skill

Automatically activates when working on:
- Defining database schemas
- Writing Drizzle queries
- Setting up relations
- Running migrations
- Database configuration

---

## Quick Start

### Installation

```bash
# Core
npm install drizzle-orm
npm install -D drizzle-kit

# Database drivers
npm install postgres          # PostgreSQL
npm install mysql2            # MySQL
npm install better-sqlite3    # SQLite
npm install @libsql/client    # Turso/LibSQL
```

### Project Structure

```
src/
├── db/
│   ├── index.ts          # Database client
│   ├── schema/
│   │   ├── users.ts      # User schema
│   │   ├── posts.ts      # Post schema
│   │   └── index.ts      # Export all schemas
│   └── migrations/       # Generated migrations
└── drizzle.config.ts     # Drizzle kit config
```

---

## Schema Definition

### PostgreSQL Schema

```typescript
// db/schema/users.ts
import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: text('password'),
  image: text('image'),
  role: varchar('role', { length: 50 }).default('user').notNull(),
  emailVerified: timestamp('email_verified', { mode: 'date' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Posts Schema with Foreign Key

```typescript
// db/schema/posts.ts
import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { users } from './users';

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  published: boolean('published').default(false).notNull(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
```

### Indexes

```typescript
import { pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: varchar('slug', { length: 255 }).notNull(),
    authorId: uuid('author_id').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex('slug_idx').on(table.slug),
    authorIdx: index('author_idx').on(table.authorId),
    createdAtIdx: index('created_at_idx').on(table.createdAt.desc()),
  })
);
```

---

## Relations

```typescript
// db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users } from './users';
import { posts } from './posts';
import { comments } from './comments';

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  author: one(users, {
    fields: [comments.authorId],
    references: [users.id],
  }),
  post: one(posts, {
    fields: [comments.postId],
    references: [posts.id],
  }),
}));
```

---

## Database Client

```typescript
// db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

// For query purposes
const queryClient = postgres(connectionString);
export const db = drizzle(queryClient, { schema });

// For migrations (with max 1 connection)
export const migrationClient = postgres(connectionString, { max: 1 });
```

---

## Queries

### Select

```typescript
import { db } from '@/db';
import { users, posts } from '@/db/schema';
import { eq, and, or, like, desc, asc, sql } from 'drizzle-orm';

// Select all
const allUsers = await db.select().from(users);

// Select specific columns
const userNames = await db
  .select({ id: users.id, name: users.name })
  .from(users);

// Where clause
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'test@example.com'));

// Multiple conditions
const activeAdmins = await db
  .select()
  .from(users)
  .where(and(eq(users.role, 'admin'), eq(users.emailVerified, true)));

// Like query
const searchResults = await db
  .select()
  .from(users)
  .where(like(users.name, '%john%'));

// Order and limit
const recentPosts = await db
  .select()
  .from(posts)
  .orderBy(desc(posts.createdAt))
  .limit(10)
  .offset(0);
```

### With Relations (Query API)

```typescript
// Fetch user with posts
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      orderBy: desc(posts.createdAt),
      limit: 5,
    },
  },
});

// Nested relations
const postWithAll = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    author: true,
    comments: {
      with: {
        author: {
          columns: { id: true, name: true, image: true },
        },
      },
    },
  },
});
```

### Insert

```typescript
// Single insert
const [newUser] = await db
  .insert(users)
  .values({
    name: 'John Doe',
    email: 'john@example.com',
  })
  .returning();

// Bulk insert
const newPosts = await db
  .insert(posts)
  .values([
    { title: 'Post 1', slug: 'post-1', content: '...', authorId },
    { title: 'Post 2', slug: 'post-2', content: '...', authorId },
  ])
  .returning();

// On conflict (upsert)
await db
  .insert(users)
  .values({ email: 'test@example.com', name: 'Test' })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: 'Updated Name', updatedAt: new Date() },
  });
```

### Update

```typescript
const [updated] = await db
  .update(users)
  .set({ name: 'New Name', updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();

// Increment
await db
  .update(posts)
  .set({ views: sql`${posts.views} + 1` })
  .where(eq(posts.id, postId));
```

### Delete

```typescript
const [deleted] = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning();

// Delete many
await db.delete(posts).where(eq(posts.published, false));
```

See [queries.md](resources/queries.md) for more patterns.

---

## Migrations

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Commands

```bash
# Generate migration
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema (dev only, no migration files)
npx drizzle-kit push

# Open Drizzle Studio
npx drizzle-kit studio
```

### Programmatic Migration

```typescript
// migrate.ts
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const migrationClient = postgres(process.env.DATABASE_URL!, { max: 1 });
const db = drizzle(migrationClient);

await migrate(db, { migrationsFolder: './src/db/migrations' });

await migrationClient.end();
```

---

## Transactions

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ name: 'Test', email: 'test@example.com' })
    .returning();

  await tx
    .insert(posts)
    .values({ title: 'First Post', slug: 'first', content: '...', authorId: user.id });
});

// With rollback
await db.transaction(async (tx) => {
  try {
    await tx.insert(users).values({ name: 'Test', email: 'existing@email.com' });
  } catch {
    tx.rollback();
  }
});
```

---

## Gotchas & Real-World Warnings

### Migrations Will Hurt You

**`drizzle-kit push` is NOT for production.** It's great for development, but:
- No rollback capability
- Can drop columns/tables without warning
- Doesn't generate migration files for auditing

```bash
# DANGER in production
npx drizzle-kit push

# CORRECT for production
npx drizzle-kit generate  # Review the SQL!
npx drizzle-kit migrate   # Apply with migration tracking
```

**Migration order matters.** Generated migrations run alphabetically. Renaming a migration file can cause "already applied" errors or double-runs.

**Schema changes on large tables lock them.** Adding an index on a 10M row table can lock writes for minutes. Plan maintenance windows.

### N+1 Queries Are Easy to Create

```typescript
// DANGER: N+1 query - one query per post
const posts = await db.select().from(posts);
for (const post of posts) {
  const author = await db.select().from(users).where(eq(users.id, post.authorId));
  // 100 posts = 101 queries
}

// CORRECT: Use relations or explicit join
const postsWithAuthors = await db.query.posts.findMany({
  with: { author: true }
});
```

**The relations API hides the query count.** Nested `with` clauses generate multiple queries. Profile your queries!

### Type Safety Stops at Runtime

**Drizzle types trust your schema.** If the database has data that doesn't match:

```typescript
// Schema says role is 'user' | 'admin'
role: varchar('role', { length: 50 }).$type<'user' | 'admin'>()

// But legacy data has role = 'superuser'
const user = await db.query.users.findFirst({ where: eq(users.id, '123') });
user.role // TypeScript says 'user' | 'admin', runtime value is 'superuser'
```

**Nullable columns are tricky.** Drizzle tries to infer nullability but:
- `$default()` vs `.default()` have different null behaviors
- Some column types have surprising defaults

### Transaction Gotchas

```typescript
// DANGER: This doesn't actually rollback
await db.transaction(async (tx) => {
  await tx.insert(users).values({ ... });
  await tx.insert(posts).values({ ... });
  // If posts insert fails, users insert is NOT rolled back automatically
});

// CORRECT: Let errors propagate or explicitly throw
await db.transaction(async (tx) => {
  await tx.insert(users).values({ ... });
  const [post] = await tx.insert(posts).values({ ... }).returning();
  if (!post) {
    throw new Error('Post creation failed'); // This rolls back
  }
});
```

**Connection pool exhaustion.** Transactions hold connections. Long-running transactions + high traffic = pool exhaustion.

### What These Patterns Don't Tell You

1. **Connection management** - Serverless (Vercel, Lambda) needs connection pooling (PgBouncer, Neon pooler)
2. **Prepared statements** - Use them for repeated queries; the examples don't show this
3. **Soft deletes** - Need `deletedAt` column? Add it to every query's where clause
4. **Audit columns** - `createdAt`/`updatedAt` don't auto-update; use triggers or application logic
5. **JSON columns** - Drizzle supports them but type inference is limited
6. **Database-specific features** - PostgreSQL's `RETURNING` works differently than MySQL's

---

## Anti-Patterns to Avoid

- Not using relations API for joins
- Raw SQL for simple queries
- Skipping indexes on frequently queried columns
- Not using transactions for multi-table operations
- Hardcoding connection strings

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Define schemas | [schema-definition.md](resources/schema-definition.md) |
| Write queries | [queries.md](resources/queries.md) |
| Set up relations | [relations.md](resources/relations.md) |
| Run migrations | [migrations.md](resources/migrations.md) |
| Advanced queries | [advanced-queries.md](resources/advanced-queries.md) |

---

## Resource Files

### [schema-definition.md](resources/schema-definition.md)
Column types, constraints, indexes, enums

### [queries.md](resources/queries.md)
CRUD operations, filters, ordering, pagination

### [relations.md](resources/relations.md)
One-to-one, one-to-many, many-to-many

### [migrations.md](resources/migrations.md)
Generate, push, migrate, seeding

### [advanced-queries.md](resources/advanced-queries.md)
Transactions, raw SQL, prepared statements

---

## External Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Drizzle Kit](https://orm.drizzle.team/kit-docs/overview)
- [GitHub](https://github.com/drizzle-team/drizzle-orm)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 5 resource files
