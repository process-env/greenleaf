---
name: trpc-patterns
description: Type-safe APIs with tRPC v11 for Next.js applications. Covers router setup, procedures, React Query integration, middleware, error handling, and advanced patterns.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  trpc: "11.x"
  tanstack-query: "5.x"
---

# tRPC Patterns

> **Updated 2026-01-11:** tRPC v11 with TanStack Query v5 integration.

## Purpose

Complete guide for building type-safe APIs with tRPC v11 in Next.js applications. Covers router setup, procedures, React Query hooks, middleware patterns, and advanced features.

## When to Use This Skill

Automatically activates when working on:
- Setting up tRPC routers
- Creating procedures (queries/mutations)
- Using tRPC React hooks
- tRPC middleware and context
- Error handling in tRPC
- WebSocket subscriptions

---

## Quick Start

### Installation

```bash
npm install @trpc/server@next @trpc/client@next @trpc/react-query@next @tanstack/react-query zod
```

### Project Structure

```
src/
├── server/
│   ├── trpc.ts           # tRPC initialization
│   ├── context.ts        # Context creation
│   └── routers/
│       ├── _app.ts       # Root router
│       ├── user.ts       # User procedures
│       └── post.ts       # Post procedures
├── app/
│   ├── api/trpc/[trpc]/route.ts  # API handler
│   └── providers.tsx     # Client providers
└── lib/
    └── trpc.ts           # Client hooks
```

---

## Server Setup

### Initialize tRPC

```typescript
// server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import { ZodError } from 'zod';
import superjson from 'superjson';
import { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
export const mergeRouters = t.mergeRouters;
```

### Context Creation

```typescript
// server/context.ts
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export async function createContext(opts: FetchCreateContextFnOptions) {
  const session = await auth();

  return {
    session,
    user: session?.user,
    prisma,
    headers: opts.req.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
```

### Protected Procedure

```typescript
// server/trpc.ts
const isAuthed = middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);
```

---

## Routers

### User Router

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { id: input.id },
        select: { id: true, name: true, image: true },
      });

      if (!user) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
      }

      return user;
    }),

  update: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.user.id },
        data: input,
      });
    }),
});
```

### Root Router

```typescript
// server/routers/_app.ts
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter;
```

---

## Next.js App Router Integration

### Route Handler

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`❌ tRPC error on '${path}':`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

### Client Setup

```typescript
// lib/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

### Providers

```typescript
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink, loggerLink } from '@trpc/client';
import { trpc } from '@/lib/trpc';
import { useState } from 'react';
import superjson from 'superjson';

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 5 * 1000 },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === 'development' ||
            (opts.direction === 'down' && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
```

---

## Client Usage

### Queries

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = trpc.user.getById.useQuery({ id: userId });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data?.name}</div>;
}
```

### Mutations

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function UpdateProfileForm() {
  const utils = trpc.useUtils();

  const updateUser = trpc.user.update.useMutation({
    onSuccess: () => {
      // Invalidate queries to refetch
      utils.user.me.invalidate();
    },
    onError: (error) => {
      console.error('Update failed:', error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateUser.mutate({
      name: formData.get('name') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" required />
      <button type="submit" disabled={updateUser.isPending}>
        {updateUser.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
const utils = trpc.useUtils();

const likeMutation = trpc.post.like.useMutation({
  onMutate: async ({ postId }) => {
    await utils.post.getById.cancel({ id: postId });

    const previousData = utils.post.getById.getData({ id: postId });

    utils.post.getById.setData({ id: postId }, (old) =>
      old ? { ...old, likes: old.likes + 1 } : old
    );

    return { previousData };
  },
  onError: (err, { postId }, context) => {
    utils.post.getById.setData({ id: postId }, context?.previousData);
  },
  onSettled: (_, __, { postId }) => {
    utils.post.getById.invalidate({ id: postId });
  },
});
```

See [client-usage.md](resources/client-usage.md) for more patterns.

---

## Server-Side Usage

### Server Components

```typescript
// app/users/[id]/page.tsx
import { createCaller } from '@/server/routers/_app';
import { createContext } from '@/server/context';

export default async function UserPage({ params }: { params: { id: string } }) {
  const ctx = await createContext({ req: new Request('http://localhost') });
  const caller = createCaller(ctx);

  const user = await caller.user.getById({ id: params.id });

  return <div>{user.name}</div>;
}
```

### With Prefetching

```typescript
// lib/trpc-server.ts
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  appRouter,
  () => createContext({ req: new Request('http://localhost') })
);

// app/users/page.tsx
import { trpc, HydrateClient } from '@/lib/trpc-server';

export default async function UsersPage() {
  void trpc.user.list.prefetch();

  return (
    <HydrateClient>
      <UserList />
    </HydrateClient>
  );
}
```

---

## Error Handling

```typescript
import { TRPCError } from '@trpc/server';

// In procedure
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Invalid input',
  cause: originalError,
});

// Error codes:
// PARSE_ERROR, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN,
// NOT_FOUND, METHOD_NOT_SUPPORTED, TIMEOUT, CONFLICT,
// PRECONDITION_FAILED, PAYLOAD_TOO_LARGE, UNPROCESSABLE_CONTENT,
// TOO_MANY_REQUESTS, CLIENT_CLOSED_REQUEST, INTERNAL_SERVER_ERROR
```

---

## Gotchas & Real-World Warnings

### When tRPC Is Overkill

**Not every app needs tRPC.** You're adding:
- Build complexity (client/server type generation)
- Bundle size (~15-30kb)
- Learning curve for the team
- Another abstraction layer to debug

**Simple REST might be better when:**
- Your API is consumed by non-TypeScript clients
- You have 5 endpoints total
- Your team doesn't know tRPC
- You need standard HTTP caching (tRPC batching breaks this)

### Type Safety Lies

**Types don't guarantee runtime safety.** tRPC gives you TypeScript confidence, but:

```typescript
// Input is validated...
.input(z.object({ id: z.string() }))

// But ctx.user could still be manipulated if your auth is broken
// Types say user exists, but middleware might have a bug
.query(({ ctx }) => {
  // ctx.user is typed as User, but is it really?
  return ctx.prisma.secrets.findMany({ where: { userId: ctx.user.id } });
})
```

**Database types can drift.** Your Prisma schema changes, you regenerate types, but tRPC router types are cached. Restart your dev server.

### Production Gotchas

**Batching can cause weird failures.** tRPC batches requests by default. One procedure throws, entire batch might fail depending on your error handling.

```typescript
// Client makes 3 calls "simultaneously"
trpc.user.get.useQuery({ id: '1' });
trpc.post.list.useQuery();
trpc.settings.get.useQuery(); // This one throws

// All three might show loading forever if error handling is wrong
```

**SSR hydration mismatches.** Server renders with user data, client hydrates without session, you get React hydration errors.

```typescript
// DANGER: Server has session, client might not on first render
const { data: user } = trpc.user.me.useQuery();

// SAFER: Handle the loading/unauthenticated states explicitly
if (status === 'loading') return <Skeleton />;
if (!user) return <LoginPrompt />;
```

**Subscriptions are complex.** WebSocket subscriptions sound great until:
- You need to handle reconnection
- Load balancers terminate long connections
- Serverless can't hold WebSockets (Vercel, etc.)

### Error Messages Leak Information

```typescript
// DANGER: Error message might contain SQL or internal details
throw new TRPCError({
  code: 'INTERNAL_SERVER_ERROR',
  message: error.message, // Could be "duplicate key violates unique constraint users_email_key"
});

// BETTER: Generic message, log details server-side
console.error('User creation failed:', error);
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Could not create user',
});
```

### What These Patterns Don't Tell You

1. **Request size limits** - Large inputs can hit body parser limits
2. **Timeout handling** - Long-running procedures need timeout configuration
3. **Rate limiting** - tRPC doesn't include rate limiting; add it yourself
4. **Logging/tracing** - Add request IDs for debugging production issues
5. **Breaking changes** - Changing procedure signatures breaks clients; version your API

---

## Anti-Patterns to Avoid

- Exposing internal database IDs without authorization
- Not validating inputs with Zod
- Heavy computations in procedures (use background jobs)
- Returning sensitive data in queries
- Not handling errors properly on client
- Overly nested routers

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Set up routers | [router-setup.md](resources/router-setup.md) |
| Create procedures | [procedures.md](resources/procedures.md) |
| Use React hooks | [client-usage.md](resources/client-usage.md) |
| Next.js integration | [nextjs-integration.md](resources/nextjs-integration.md) |
| Advanced patterns | [advanced-patterns.md](resources/advanced-patterns.md) |

---

## Resource Files

### [router-setup.md](resources/router-setup.md)
Router organization, merging routers, context patterns

### [procedures.md](resources/procedures.md)
Input validation, middleware, batching, caching

### [client-usage.md](resources/client-usage.md)
React hooks, optimistic updates, infinite queries

### [nextjs-integration.md](resources/nextjs-integration.md)
App Router setup, RSC, prefetching, streaming

### [advanced-patterns.md](resources/advanced-patterns.md)
Subscriptions, file uploads, testing, error handling

---

## External Resources

- [tRPC Documentation](https://trpc.io/docs)
- [TanStack Query Docs](https://tanstack.com/query/latest)
- [tRPC GitHub](https://github.com/trpc/trpc)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 5 resource files
