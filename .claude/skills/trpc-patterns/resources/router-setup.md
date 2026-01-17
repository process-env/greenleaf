# tRPC Router Setup

## Router Organization

### Feature-Based Structure

```
server/
├── trpc.ts           # tRPC initialization
├── context.ts        # Context creation
└── routers/
    ├── _app.ts       # Root router
    ├── user/
    │   ├── index.ts  # User router
    │   ├── queries.ts
    │   └── mutations.ts
    ├── post/
    │   ├── index.ts
    │   └── types.ts
    └── comment/
        └── index.ts
```

### Router Composition

```typescript
// server/routers/user/queries.ts
import { z } from 'zod';
import { publicProcedure, protectedProcedure } from '../../trpc';

export const userQueries = {
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });
  }),

  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.user.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),
};

// server/routers/user/mutations.ts
import { z } from 'zod';
import { protectedProcedure } from '../../trpc';

export const userMutations = {
  update: protectedProcedure
    .input(z.object({ name: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),
};

// server/routers/user/index.ts
import { router } from '../../trpc';
import { userQueries } from './queries';
import { userMutations } from './mutations';

export const userRouter = router({
  ...userQueries,
  ...userMutations,
});
```

## Merging Routers

```typescript
// server/routers/_app.ts
import { router, mergeRouters } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';
import { commentRouter } from './comment';

// Method 1: Nested routers
export const appRouter = router({
  user: userRouter,
  post: postRouter,
  comment: commentRouter,
});

// Method 2: Flat merge
export const appRouter = mergeRouters(
  router({ user: userRouter }),
  router({ post: postRouter }),
  router({ comment: commentRouter })
);

export type AppRouter = typeof appRouter;
```

## Context Patterns

### Base Context

```typescript
// server/context.ts
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';

export interface BaseContext {
  prisma: typeof prisma;
  redis: typeof redis;
  requestId: string;
}

export function createBaseContext(): BaseContext {
  return {
    prisma,
    redis,
    requestId: crypto.randomUUID(),
  };
}
```

### Auth Context

```typescript
// server/context.ts
import { auth } from '@/auth';
import type { Session } from 'next-auth';

export interface AuthContext extends BaseContext {
  session: Session | null;
  user: Session['user'] | null;
}

export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<AuthContext> {
  const session = await auth();

  return {
    ...createBaseContext(),
    session,
    user: session?.user ?? null,
  };
}

export type Context = AuthContext;
```

### Request-Specific Context

```typescript
export async function createContext(
  opts: FetchCreateContextFnOptions
): Promise<Context> {
  const session = await auth();

  // Extract headers
  const userAgent = opts.req.headers.get('user-agent');
  const ip = opts.req.headers.get('x-forwarded-for')?.split(',')[0];

  return {
    ...createBaseContext(),
    session,
    user: session?.user ?? null,
    headers: {
      userAgent,
      ip,
    },
  };
}
```

## Middleware Patterns

### Logging Middleware

```typescript
// server/trpc.ts
const loggerMiddleware = middleware(async ({ path, type, next }) => {
  const start = Date.now();

  const result = await next();

  const duration = Date.now() - start;
  console.log(`${type} ${path} - ${duration}ms`);

  return result;
});

export const loggedProcedure = t.procedure.use(loggerMiddleware);
```

### Rate Limiting Middleware

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

const rateLimitMiddleware = middleware(async ({ ctx, next }) => {
  const identifier = ctx.user?.id ?? ctx.headers.ip ?? 'anonymous';

  const { success, limit, remaining } = await ratelimit.limit(identifier);

  if (!success) {
    throw new TRPCError({
      code: 'TOO_MANY_REQUESTS',
      message: `Rate limit exceeded. Try again in ${limit}s`,
    });
  }

  return next({
    ctx: {
      rateLimit: { limit, remaining },
    },
  });
});

export const rateLimitedProcedure = t.procedure.use(rateLimitMiddleware);
```

### Role-Based Middleware

```typescript
type Role = 'user' | 'admin' | 'moderator';

const requireRole = (requiredRole: Role) =>
  middleware(async ({ ctx, next }) => {
    if (!ctx.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' });
    }

    if (ctx.user.role !== requiredRole) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next({ ctx: { user: ctx.user } });
  });

export const adminProcedure = t.procedure.use(requireRole('admin'));
export const moderatorProcedure = t.procedure.use(requireRole('moderator'));
```

### Composition

```typescript
// Chain multiple middleware
export const secureAdminProcedure = t.procedure
  .use(loggerMiddleware)
  .use(rateLimitMiddleware)
  .use(requireRole('admin'));
```

## Router Metadata

```typescript
// Add metadata to procedures
const procedureWithMeta = t.procedure.meta<{
  permission?: string;
  rateLimit?: number;
}>();

const adminRouter = router({
  deleteUser: procedureWithMeta
    .meta({ permission: 'users:delete', rateLimit: 5 })
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Implementation
    }),
});

// Access meta in middleware
const permissionMiddleware = middleware(async ({ meta, ctx, next }) => {
  if (meta?.permission) {
    const hasPermission = await checkPermission(ctx.user, meta.permission);
    if (!hasPermission) {
      throw new TRPCError({ code: 'FORBIDDEN' });
    }
  }
  return next();
});
```
