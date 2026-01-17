# Drizzle Schema Definition

## Column Types

### PostgreSQL

```typescript
import {
  pgTable,
  uuid,
  serial,
  bigserial,
  varchar,
  text,
  integer,
  bigint,
  real,
  doublePrecision,
  numeric,
  boolean,
  timestamp,
  date,
  time,
  json,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';

// UUID primary key
const id = uuid('id').primaryKey().defaultRandom();

// Auto-increment
const id = serial('id').primaryKey();
const id = bigserial('id', { mode: 'number' }).primaryKey();

// Strings
const name = varchar('name', { length: 255 }).notNull();
const bio = text('bio');

// Numbers
const age = integer('age');
const views = bigint('views', { mode: 'number' }).default(0);
const price = numeric('price', { precision: 10, scale: 2 });
const rating = real('rating');
const exact = doublePrecision('exact');

// Boolean
const active = boolean('active').default(true).notNull();

// Timestamps
const createdAt = timestamp('created_at').defaultNow().notNull();
const updatedAt = timestamp('updated_at', { mode: 'date' }).$onUpdate(() => new Date());
const deletedAt = timestamp('deleted_at');

// Date/Time
const birthDate = date('birth_date');
const startTime = time('start_time');

// JSON
const metadata = json('metadata').$type<{ tags: string[] }>();
const settings = jsonb('settings').$type<UserSettings>();
```

### MySQL

```typescript
import {
  mysqlTable,
  int,
  varchar,
  text,
  boolean,
  timestamp,
  json,
  mysqlEnum,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: mysqlEnum('role', ['user', 'admin']).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### SQLite

```typescript
import {
  sqliteTable,
  integer,
  text,
  real,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).defaultNow(),
});
```

## Enums

```typescript
// PostgreSQL enum
export const roleEnum = pgEnum('role', ['user', 'admin', 'moderator']);

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  role: roleEnum('role').default('user').notNull(),
});
```

## Constraints

```typescript
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    username: varchar('username', { length: 50 }).notNull(),
    teamId: uuid('team_id').references(() => teams.id),
  },
  (table) => ({
    // Unique constraint
    uniqueUsername: uniqueIndex('unique_username').on(table.username),

    // Composite unique
    uniqueTeamUser: uniqueIndex('unique_team_user').on(table.teamId, table.username),

    // Check constraint
    usernameLength: check('username_length', sql`length(${table.username}) >= 3`),
  })
);
```

## Foreign Keys

```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  authorId: uuid('author_id')
    .notNull()
    .references(() => users.id, {
      onDelete: 'cascade',  // cascade | restrict | no action | set null | set default
      onUpdate: 'cascade',
    }),
});
```

## Indexes

```typescript
import { pgTable, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    authorId: uuid('author_id').notNull(),
    published: boolean('published').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    // Single column index
    slugIdx: uniqueIndex('posts_slug_idx').on(table.slug),

    // Composite index
    authorPublishedIdx: index('posts_author_published_idx')
      .on(table.authorId, table.published),

    // Partial index
    publishedIdx: index('posts_published_idx')
      .on(table.createdAt)
      .where(sql`${table.published} = true`),

    // Descending index
    createdAtDesc: index('posts_created_desc_idx')
      .on(table.createdAt.desc()),
  })
);
```

## Default Values

```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  views: integer('views').default(0).notNull(),
  status: varchar('status').default('draft').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date()),

  // SQL default
  slug: varchar('slug').default(sql`gen_random_uuid()`),
});
```

## Type Inference

```typescript
// Infer select type (what you get from queries)
export type User = typeof users.$inferSelect;

// Infer insert type (what you pass to inserts)
export type NewUser = typeof users.$inferInsert;

// Usage
const user: User = await db.query.users.findFirst();
const newUser: NewUser = { name: 'John', email: 'john@example.com' };
```
