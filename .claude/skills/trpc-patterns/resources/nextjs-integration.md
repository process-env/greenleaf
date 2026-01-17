# tRPC Next.js Integration

## App Router Setup

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

### Edge Runtime

```typescript
// app/api/trpc/[trpc]/route.ts
export const runtime = 'edge';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

## Server Components

### Direct Caller

```typescript
// lib/trpc-server.ts
import { appRouter, createCallerFactory } from '@/server/routers/_app';
import { createContext } from '@/server/context';
import { cache } from 'react';

const createCaller = createCallerFactory(appRouter);

export const getServerTrpc = cache(async () => {
  const context = await createContext({
    req: new Request('http://localhost'),
    resHeaders: new Headers(),
  });
  return createCaller(context);
});

// Usage in Server Component
// app/posts/page.tsx
import { getServerTrpc } from '@/lib/trpc-server';

export default async function PostsPage() {
  const trpc = await getServerTrpc();
  const posts = await trpc.post.list({ limit: 10 });

  return (
    <div>
      {posts.posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

### RSC Hydration Helpers

```typescript
// lib/trpc-rsc.ts
import { createHydrationHelpers } from '@trpc/react-query/rsc';
import { appRouter } from '@/server/routers/_app';
import { createContext } from '@/server/context';
import { createQueryClient } from './query-client';
import { cache } from 'react';

const getQueryClient = cache(createQueryClient);

const getContext = cache(async () => {
  return createContext({
    req: new Request('http://localhost'),
    resHeaders: new Headers(),
  });
});

export const { trpc, HydrateClient } = createHydrationHelpers<typeof appRouter>(
  appRouter,
  async () => {
    const context = await getContext();
    return {
      queryClient: getQueryClient(),
      context,
    };
  }
);
```

### Prefetching

```typescript
// app/posts/page.tsx
import { trpc, HydrateClient } from '@/lib/trpc-rsc';
import { PostList } from './post-list';

export default async function PostsPage() {
  // Prefetch on server
  void trpc.post.list.prefetch({ limit: 10 });

  return (
    <HydrateClient>
      {/* Client component uses prefetched data */}
      <PostList />
    </HydrateClient>
  );
}

// app/posts/post-list.tsx
'use client';

import { trpc } from '@/lib/trpc';

export function PostList() {
  // This will use prefetched data - no loading state on initial render
  const { data } = trpc.post.list.useQuery({ limit: 10 });

  return (
    <div>
      {data?.posts.map((post) => (
        <article key={post.id}>{post.title}</article>
      ))}
    </div>
  );
}
```

### Prefetch Multiple Queries

```typescript
// app/dashboard/page.tsx
import { trpc, HydrateClient } from '@/lib/trpc-rsc';

export default async function DashboardPage() {
  // Prefetch multiple queries in parallel
  await Promise.all([
    trpc.user.me.prefetch(),
    trpc.post.list.prefetch({ limit: 5 }),
    trpc.notification.unread.prefetch(),
  ]);

  return (
    <HydrateClient>
      <Dashboard />
    </HydrateClient>
  );
}
```

## Server Actions

```typescript
// app/actions.ts
'use server';

import { getServerTrpc } from '@/lib/trpc-server';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const trpc = await getServerTrpc();

  try {
    await trpc.post.create({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });

    revalidatePath('/posts');
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to create post' };
  }
}

// Usage in component
<form action={createPost}>
  <input name="title" />
  <textarea name="content" />
  <button type="submit">Create</button>
</form>
```

## Streaming

```typescript
// Server procedure with streaming
const streamProcedure = publicProcedure.query(async function* () {
  for (let i = 0; i < 10; i++) {
    yield { progress: i * 10 };
    await new Promise((r) => setTimeout(r, 500));
  }
  return { done: true };
});

// Client usage
const { data, isLoading } = trpc.stream.useQuery(undefined, {
  trpc: {
    ssr: false, // Disable SSR for streaming
  },
});
```

## Middleware Integration

### With Next.js Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Add custom headers for tRPC context
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-request-id', crypto.randomUUID());

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: '/api/trpc/:path*',
};
```

## Error Pages

```typescript
// app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const handler = async (req: Request) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
    onError: ({ error, path }) => {
      // Log to error tracking service
      if (error.code !== 'NOT_FOUND') {
        Sentry.captureException(error, {
          extra: { path },
        });
      }
    },
    responseMeta: () => ({
      headers: {
        'x-trpc-source': 'nextjs-app-router',
      },
    }),
  });
};
```

## Caching Headers

```typescript
// Set cache headers per procedure
const getCachedPost = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    ctx.resHeaders?.set(
      'Cache-Control',
      's-maxage=60, stale-while-revalidate=300'
    );

    return ctx.prisma.post.findUnique({
      where: { id: input.id },
    });
  });
```
