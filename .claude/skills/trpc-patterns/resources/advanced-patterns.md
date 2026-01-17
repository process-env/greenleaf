# Advanced tRPC Patterns

## WebSocket Subscriptions

### Server Setup

```typescript
// server/wss.ts
import { WebSocketServer } from 'ws';
import { applyWSSHandler } from '@trpc/server/adapters/ws';
import { appRouter } from './routers/_app';
import { createContext } from './context';

const wss = new WebSocketServer({ port: 3001 });

applyWSSHandler({
  wss,
  router: appRouter,
  createContext,
});

console.log('WebSocket Server listening on ws://localhost:3001');
```

### Subscription Procedure

```typescript
// server/routers/chat.ts
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

const ee = new EventEmitter();

interface Message {
  id: string;
  text: string;
  userId: string;
  createdAt: Date;
}

export const chatRouter = router({
  sendMessage: protectedProcedure
    .input(z.object({ text: z.string(), roomId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const message: Message = {
        id: crypto.randomUUID(),
        text: input.text,
        userId: ctx.user.id,
        createdAt: new Date(),
      };

      // Emit to subscribers
      ee.emit(`room:${input.roomId}`, message);

      return message;
    }),

  onMessage: protectedProcedure
    .input(z.object({ roomId: z.string() }))
    .subscription(({ input }) => {
      return observable<Message>((emit) => {
        const onMessage = (message: Message) => {
          emit.next(message);
        };

        ee.on(`room:${input.roomId}`, onMessage);

        return () => {
          ee.off(`room:${input.roomId}`, onMessage);
        };
      });
    }),
});
```

### Client Subscription

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function ChatRoom({ roomId }: { roomId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);

  trpc.chat.onMessage.useSubscription(
    { roomId },
    {
      onData: (message) => {
        setMessages((prev) => [...prev, message]);
      },
      onError: (error) => {
        console.error('Subscription error:', error);
      },
    }
  );

  return (
    <div>
      {messages.map((msg) => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}
```

## File Uploads

### Using FormData

```typescript
// server/routers/upload.ts
export const uploadRouter = router({
  uploadImage: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileSize: z.number().max(5 * 1024 * 1024), // 5MB max
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Generate presigned URL for direct upload
      const { url, key } = await generatePresignedUrl({
        fileName: input.fileName,
        fileType: input.fileType,
        userId: ctx.user.id,
      });

      return { uploadUrl: url, key };
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify upload and save to database
      const imageUrl = await getPublicUrl(input.key);

      return ctx.prisma.image.create({
        data: {
          url: imageUrl,
          key: input.key,
          userId: ctx.user.id,
        },
      });
    }),
});
```

### Client Upload

```typescript
export function ImageUpload() {
  const getUploadUrl = trpc.upload.uploadImage.useMutation();
  const confirmUpload = trpc.upload.confirmUpload.useMutation();

  const handleUpload = async (file: File) => {
    // Get presigned URL
    const { uploadUrl, key } = await getUploadUrl.mutateAsync({
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });

    // Upload directly to storage
    await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    // Confirm upload
    const image = await confirmUpload.mutateAsync({ key });
    return image;
  };

  return (
    <input
      type="file"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
      }}
    />
  );
}
```

## Testing

### Unit Testing Procedures

```typescript
// tests/routers/user.test.ts
import { describe, it, expect, vi } from 'vitest';
import { appRouter } from '@/server/routers/_app';
import { createInnerContext } from '@/server/context';

describe('userRouter', () => {
  it('should return user by id', async () => {
    const mockPrisma = {
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: '1',
          name: 'Test User',
          email: 'test@example.com',
        }),
      },
    };

    const ctx = createInnerContext({
      prisma: mockPrisma as any,
      session: null,
      user: null,
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.user.getById({ id: '1' });

    expect(result).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com',
    });
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
    });
  });

  it('should throw UNAUTHORIZED for protected route', async () => {
    const ctx = createInnerContext({
      prisma: {} as any,
      session: null,
      user: null,
    });

    const caller = appRouter.createCaller(ctx);

    await expect(caller.user.me()).rejects.toThrow('UNAUTHORIZED');
  });
});
```

### Integration Testing

```typescript
// tests/integration/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@/server/routers/_app';

const client = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

describe('API Integration', () => {
  it('should fetch posts', async () => {
    const result = await client.post.list.query({ limit: 10 });

    expect(result.posts).toBeDefined();
    expect(Array.isArray(result.posts)).toBe(true);
  });
});
```

## Batch Operations

```typescript
// Batch delete
const batchDelete = protectedProcedure
  .input(z.object({ ids: z.array(z.string()).max(100) }))
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.post.deleteMany({
      where: {
        id: { in: input.ids },
        authorId: ctx.user.id, // Ensure ownership
      },
    });

    return { deleted: result.count };
  });

// Batch update
const batchUpdate = protectedProcedure
  .input(
    z.object({
      ids: z.array(z.string()),
      data: z.object({
        published: z.boolean().optional(),
        category: z.string().optional(),
      }),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const result = await ctx.prisma.post.updateMany({
      where: {
        id: { in: input.ids },
        authorId: ctx.user.id,
      },
      data: input.data,
    });

    return { updated: result.count };
  });
```

## Request Deduplication

```typescript
// Client-side deduplication is automatic with React Query
// For server-side, use DataLoader pattern

import DataLoader from 'dataloader';

const createLoaders = (prisma: PrismaClient) => ({
  userLoader: new DataLoader<string, User | null>(async (ids) => {
    const users = await prisma.user.findMany({
      where: { id: { in: [...ids] } },
    });

    const userMap = new Map(users.map((u) => [u.id, u]));
    return ids.map((id) => userMap.get(id) ?? null);
  }),
});

// In context
export async function createContext() {
  return {
    prisma,
    loaders: createLoaders(prisma),
  };
}

// In procedure
const getPost = publicProcedure
  .input(z.object({ id: z.string() }))
  .query(async ({ ctx, input }) => {
    const post = await ctx.prisma.post.findUnique({
      where: { id: input.id },
    });

    if (post) {
      // Uses DataLoader - batches multiple requests
      post.author = await ctx.loaders.userLoader.load(post.authorId);
    }

    return post;
  });
```

## Links Composition

```typescript
import {
  createTRPCProxyClient,
  httpBatchLink,
  splitLink,
  wsLink,
  createWSClient,
} from '@trpc/client';

const wsClient = createWSClient({
  url: 'ws://localhost:3001',
});

const client = createTRPCProxyClient<AppRouter>({
  links: [
    splitLink({
      condition: (op) => op.type === 'subscription',
      true: wsLink({ client: wsClient }),
      false: httpBatchLink({ url: '/api/trpc' }),
    }),
  ],
});
```
