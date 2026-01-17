# tRPC Procedures

## Input Validation

### Basic Validation

```typescript
import { z } from 'zod';

const createPost = protectedProcedure
  .input(
    z.object({
      title: z.string().min(1).max(200),
      content: z.string().min(1),
      published: z.boolean().default(false),
      tags: z.array(z.string()).max(5).optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    return ctx.prisma.post.create({
      data: {
        ...input,
        authorId: ctx.user.id,
      },
    });
  });
```

### Reusable Schemas

```typescript
// server/schemas/post.ts
import { z } from 'zod';

export const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  published: z.boolean().default(false),
});

export const updatePostSchema = createPostSchema.partial();

export const postIdSchema = z.object({
  id: z.string().uuid(),
});

// Usage
const getPost = publicProcedure
  .input(postIdSchema)
  .query(async ({ ctx, input }) => {
    return ctx.prisma.post.findUnique({
      where: { id: input.id },
    });
  });
```

### Transform and Refine

```typescript
const searchSchema = z.object({
  query: z
    .string()
    .min(1)
    .transform((q) => q.trim().toLowerCase()),
  filters: z
    .object({
      minPrice: z.number().optional(),
      maxPrice: z.number().optional(),
    })
    .refine(
      (data) => {
        if (data.minPrice && data.maxPrice) {
          return data.minPrice <= data.maxPrice;
        }
        return true;
      },
      { message: 'minPrice must be less than maxPrice' }
    ),
});
```

## Output Validation

```typescript
const userOutput = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  // Exclude sensitive fields
});

const getUser = publicProcedure
  .input(z.object({ id: z.string() }))
  .output(userOutput)
  .query(async ({ ctx, input }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: input.id },
    });

    if (!user) {
      throw new TRPCError({ code: 'NOT_FOUND' });
    }

    return user; // Automatically validated and stripped
  });
```

## Procedure Types

### Query (Read)

```typescript
const getPosts = publicProcedure
  .input(
    z.object({
      limit: z.number().min(1).max(100).default(10),
      offset: z.number().min(0).default(0),
      search: z.string().optional(),
    })
  )
  .query(async ({ ctx, input }) => {
    const { limit, offset, search } = input;

    const where = search
      ? {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { content: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [posts, total] = await Promise.all([
      ctx.prisma.post.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
      }),
      ctx.prisma.post.count({ where }),
    ]);

    return { posts, total, hasMore: offset + posts.length < total };
  });
```

### Mutation (Write)

```typescript
const createPost = protectedProcedure
  .input(createPostSchema)
  .mutation(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.create({
      data: {
        ...input,
        authorId: ctx.user.id,
      },
    });

    // Side effects
    await ctx.redis.del(`user:${ctx.user.id}:posts`);

    return post;
  });
```

### Subscription (Real-time)

```typescript
import { observable } from '@trpc/server/observable';

const onNewPost = publicProcedure.subscription(() => {
  return observable<Post>((emit) => {
    const onPost = (post: Post) => {
      emit.next(post);
    };

    // Subscribe to event emitter
    eventEmitter.on('newPost', onPost);

    return () => {
      eventEmitter.off('newPost', onPost);
    };
  });
});
```

## Batching

```typescript
// Client automatically batches requests made in the same tick
// server/trpc.ts
import { httpBatchLink } from '@trpc/client';

// These will be batched into a single HTTP request
const [user, posts, comments] = await Promise.all([
  trpc.user.me.query(),
  trpc.post.list.query(),
  trpc.comment.recent.query(),
]);
```

## Caching

### Response Caching

```typescript
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: '/api/trpc',
      headers() {
        return {
          'cache-control': 'max-age=60',
        };
      },
    }),
  ],
});
```

### Procedure-Level Cache

```typescript
const getCachedPost = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const cacheKey = `post:${input.id}`;

    // Check cache
    const cached = await ctx.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from DB
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id },
    });

    if (post) {
      // Cache for 5 minutes
      await ctx.redis.setex(cacheKey, 300, JSON.stringify(post));
    }

    return post;
  });
```

## Error Handling

```typescript
import { TRPCError } from '@trpc/server';

const updatePost = protectedProcedure
  .input(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      content: z.string().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id },
    });

    if (!post) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Post not found',
      });
    }

    if (post.authorId !== ctx.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You can only edit your own posts',
      });
    }

    return ctx.prisma.post.update({
      where: { id: input.id },
      data: input,
    });
  });
```

## Procedure Chaining

```typescript
const baseProcedure = t.procedure
  .use(loggerMiddleware)
  .use(rateLimitMiddleware);

const authedProcedure = baseProcedure.use(authMiddleware);

const adminProcedure = authedProcedure.use(adminMiddleware);

// Each inherits from the previous
export const router = t.router({
  public: baseProcedure.query(() => 'public'),
  private: authedProcedure.query(() => 'private'),
  admin: adminProcedure.query(() => 'admin only'),
});
```
