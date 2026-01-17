# Drizzle Migrations

## Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  dialect: 'postgresql', // 'mysql' | 'sqlite'
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

## Commands

### Generate Migration

```bash
# Generate migration from schema changes
npx drizzle-kit generate

# With custom name
npx drizzle-kit generate --name add_users_table
```

### Push (Development)

```bash
# Push schema directly to database (no migration files)
npx drizzle-kit push

# Push to specific database
npx drizzle-kit push --config drizzle-dev.config.ts
```

### Migrate (Production)

```bash
# Apply pending migrations
npx drizzle-kit migrate
```

### Studio

```bash
# Open Drizzle Studio (database GUI)
npx drizzle-kit studio

# On specific port
npx drizzle-kit studio --port 4000
```

### Introspect

```bash
# Generate schema from existing database
npx drizzle-kit introspect

# Output to specific directory
npx drizzle-kit introspect --out ./src/db/generated
```

## Migration Files

Generated migration files look like:

```sql
-- 0000_create_users.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);
```

## Programmatic Migration

### PostgreSQL

```typescript
// src/db/migrate.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const connection = postgres(process.env.DATABASE_URL!, { max: 1 });
  const db = drizzle(connection);

  console.log('Running migrations...');

  await migrate(db, { migrationsFolder: './src/db/migrations' });

  console.log('Migrations complete!');

  await connection.end();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
```

### With Next.js

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// Run migrations on startup (development only)
if (process.env.NODE_ENV === 'development') {
  const migrationClient = postgres(connectionString, { max: 1 });
  migrate(drizzle(migrationClient), { migrationsFolder: './src/db/migrations' })
    .then(() => migrationClient.end())
    .catch(console.error);
}
```

## Seeding

```typescript
// src/db/seed.ts
import { db } from './index';
import { users, posts } from './schema';

async function seed() {
  console.log('Seeding database...');

  // Clear existing data
  await db.delete(posts);
  await db.delete(users);

  // Create users
  const [user1, user2] = await db
    .insert(users)
    .values([
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ])
    .returning();

  // Create posts
  await db.insert(posts).values([
    { title: 'First Post', slug: 'first-post', content: '...', authorId: user1.id },
    { title: 'Second Post', slug: 'second-post', content: '...', authorId: user2.id },
  ]);

  console.log('Seeding complete!');
}

seed().catch(console.error);
```

```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:seed": "tsx src/db/seed.ts"
  }
}
```

## Migration Strategies

### Development Workflow

```bash
# 1. Make schema changes
# 2. Push to dev database
npx drizzle-kit push

# 3. When ready for production, generate migration
npx drizzle-kit generate
```

### Production Workflow

```bash
# 1. Generate migration from schema changes
npx drizzle-kit generate

# 2. Review generated SQL
# 3. Commit migration files
# 4. Deploy and run migrations
npx drizzle-kit migrate
```

### CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
- name: Run migrations
  run: npx drizzle-kit migrate
  env:
    DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Custom Migration

```typescript
// Manual migration for complex changes
import { sql } from 'drizzle-orm';

// Add custom SQL in migration
await db.execute(sql`
  CREATE INDEX CONCURRENTLY IF NOT EXISTS
  posts_search_idx ON posts
  USING gin(to_tsvector('english', title || ' ' || content));
`);
```

## Migration Journal

Drizzle keeps track of applied migrations in `_drizzle_migrations` table:

```sql
SELECT * FROM _drizzle_migrations;
```

## Rolling Back

Drizzle doesn't have built-in rollback. Options:

1. Generate reverse migration manually
2. Restore from backup
3. Use database-level point-in-time recovery
