# Drizzle Relations

## Defining Relations

Relations are defined separately from schemas using the `relations` function.

### One-to-Many

```typescript
// db/schema/relations.ts
import { relations } from 'drizzle-orm';
import { users, posts, comments } from './index';

// User has many posts
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  comments: many(comments),
}));

// Post belongs to user
export const postsRelations = relations(posts, ({ one, many }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
  comments: many(comments),
}));
```

### One-to-One

```typescript
// User has one profile
export const usersRelations = relations(users, ({ one }) => ({
  profile: one(profiles, {
    fields: [users.id],
    references: [profiles.userId],
  }),
}));

// Profile belongs to user
export const profilesRelations = relations(profiles, ({ one }) => ({
  user: one(users, {
    fields: [profiles.userId],
    references: [users.id],
  }),
}));
```

### Many-to-Many

```typescript
// Schema for many-to-many
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 255 }).notNull(),
});

export const tags = pgTable('tags', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull().unique(),
});

// Junction table
export const postsToTags = pgTable(
  'posts_to_tags',
  {
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.postId, t.tagId] }),
  })
);

// Relations
export const postsRelations = relations(posts, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
  postsToTags: many(postsToTags),
}));

export const postsToTagsRelations = relations(postsToTags, ({ one }) => ({
  post: one(posts, {
    fields: [postsToTags.postId],
    references: [posts.id],
  }),
  tag: one(tags, {
    fields: [postsToTags.tagId],
    references: [tags.id],
  }),
}));
```

## Querying Relations

### Basic With

```typescript
// Get user with posts
const userWithPosts = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: true,
  },
});
```

### Nested Relations

```typescript
// Get post with author and comments (with comment authors)
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    author: true,
    comments: {
      with: {
        author: true,
      },
    },
  },
});
```

### Filtering Related Data

```typescript
// Get user with only published posts
const user = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 10,
    },
  },
});
```

### Select Specific Columns

```typescript
// Get post with author name only
const post = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    author: {
      columns: {
        id: true,
        name: true,
        image: true,
      },
    },
  },
});
```

### Many-to-Many Query

```typescript
// Get post with tags
const postWithTags = await db.query.posts.findFirst({
  where: eq(posts.id, postId),
  with: {
    postsToTags: {
      with: {
        tag: true,
      },
    },
  },
});

// Transform to flat tags array
const tags = postWithTags?.postsToTags.map((pt) => pt.tag);
```

### Complex Nested Query

```typescript
const result = await db.query.users.findFirst({
  where: eq(users.id, userId),
  columns: {
    id: true,
    name: true,
    email: true,
  },
  with: {
    posts: {
      columns: {
        id: true,
        title: true,
        createdAt: true,
      },
      where: eq(posts.published, true),
      orderBy: desc(posts.createdAt),
      limit: 5,
      with: {
        comments: {
          columns: {
            id: true,
            content: true,
          },
          limit: 3,
          with: {
            author: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
    },
  },
});
```

## Self-Referential Relations

```typescript
// Categories with parent/children
export const categories = pgTable('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  parentId: uuid('parent_id').references(() => categories.id),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: 'parent',
  }),
  children: many(categories, { relationName: 'parent' }),
}));

// Query with children
const categoryWithChildren = await db.query.categories.findFirst({
  where: isNull(categories.parentId),
  with: {
    children: {
      with: {
        children: true, // Nested children
      },
    },
  },
});
```

## Polymorphic Relations

```typescript
// Comments can be on posts or products
export const comments = pgTable('comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  content: text('content').notNull(),
  commentableType: varchar('commentable_type', { length: 50 }).notNull(), // 'post' | 'product'
  commentableId: uuid('commentable_id').notNull(),
});

// Query with conditional join
const postComments = await db
  .select()
  .from(comments)
  .where(
    and(
      eq(comments.commentableType, 'post'),
      eq(comments.commentableId, postId)
    )
  );
```
