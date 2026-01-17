# tRPC Client Usage

## React Query Hooks

### useQuery

```typescript
'use client';

import { trpc } from '@/lib/trpc';

export function PostList() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.post.list.useQuery(
    { limit: 10 },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );

  if (isLoading) return <div>Loading...</div>;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
      <button onClick={() => refetch()}>Refresh</button>
    </div>
  );
}
```

### Conditional Query

```typescript
export function UserProfile({ userId }: { userId: string | null }) {
  const { data } = trpc.user.getById.useQuery(
    { id: userId! },
    {
      enabled: !!userId, // Only fetch when userId exists
    }
  );

  return data ? <Profile user={data} /> : null;
}
```

### Dependent Queries

```typescript
export function UserPosts({ userId }: { userId: string }) {
  const { data: user } = trpc.user.getById.useQuery({ id: userId });

  const { data: posts } = trpc.post.byAuthor.useQuery(
    { authorId: user?.id! },
    {
      enabled: !!user?.id,
    }
  );

  return <PostList posts={posts} />;
}
```

## useMutation

### Basic Mutation

```typescript
export function CreatePostForm() {
  const utils = trpc.useUtils();

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      utils.post.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    createPost.mutate({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" required />
      <textarea name="content" required />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

### Optimistic Updates

```typescript
export function LikeButton({ postId }: { postId: string }) {
  const utils = trpc.useUtils();

  const likeMutation = trpc.post.like.useMutation({
    onMutate: async ({ postId }) => {
      // Cancel outgoing refetches
      await utils.post.getById.cancel({ id: postId });

      // Snapshot previous value
      const previousPost = utils.post.getById.getData({ id: postId });

      // Optimistically update
      utils.post.getById.setData({ id: postId }, (old) =>
        old ? { ...old, likes: old.likes + 1, isLiked: true } : old
      );

      return { previousPost };
    },
    onError: (err, { postId }, context) => {
      // Rollback on error
      if (context?.previousPost) {
        utils.post.getById.setData({ id: postId }, context.previousPost);
      }
    },
    onSettled: (_, __, { postId }) => {
      // Refetch after error or success
      utils.post.getById.invalidate({ id: postId });
    },
  });

  return (
    <button onClick={() => likeMutation.mutate({ postId })}>
      Like
    </button>
  );
}
```

## Infinite Queries

```typescript
export function InfinitePostList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = trpc.post.infinite.useInfiniteQuery(
    { limit: 10 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    }
  );

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.pages.flatMap((page) =>
        page.items.map((post) => <PostCard key={post.id} post={post} />)
      )}

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
```

## useUtils (Query Invalidation)

```typescript
export function PostActions({ postId }: { postId: string }) {
  const utils = trpc.useUtils();

  const deletePost = trpc.post.delete.useMutation({
    onSuccess: () => {
      // Invalidate list queries
      utils.post.list.invalidate();

      // Remove from cache
      utils.post.getById.setData({ id: postId }, undefined);

      // Invalidate all post queries
      utils.post.invalidate();
    },
  });

  // Prefetch on hover
  const handleHover = () => {
    utils.post.getById.prefetch({ id: postId });
  };

  // Get cached data
  const getCachedPost = () => {
    return utils.post.getById.getData({ id: postId });
  };

  return (
    <button
      onMouseEnter={handleHover}
      onClick={() => deletePost.mutate({ id: postId })}
    >
      Delete
    </button>
  );
}
```

## Suspense Mode

```typescript
// Enable suspense in provider
const [queryClient] = useState(
  () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          suspense: true,
        },
      },
    })
);

// Component with suspense
export function PostListSuspense() {
  const [data] = trpc.post.list.useSuspenseQuery({ limit: 10 });

  // No loading state needed - handled by Suspense boundary
  return (
    <div>
      {data.posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

// Usage with Suspense
<Suspense fallback={<PostSkeleton />}>
  <PostListSuspense />
</Suspense>
```

## Error Handling

```typescript
export function SafePostList() {
  const { data, error, isError } = trpc.post.list.useQuery(
    { limit: 10 },
    {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    }
  );

  if (isError) {
    // Handle specific error codes
    if (error.data?.code === 'UNAUTHORIZED') {
      return <LoginPrompt />;
    }
    if (error.data?.code === 'NOT_FOUND') {
      return <EmptyState />;
    }
    return <ErrorMessage message={error.message} />;
  }

  // Handle Zod validation errors
  if (error?.data?.zodError) {
    const fieldErrors = error.data.zodError.fieldErrors;
    return <FormErrors errors={fieldErrors} />;
  }

  return <PostList posts={data?.posts} />;
}
```

## Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSchema } from '@/server/schemas/post';
import type { z } from 'zod';

type CreatePostInput = z.infer<typeof createPostSchema>;

export function CreatePostFormWithValidation() {
  const utils = trpc.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreatePostInput>({
    resolver: zodResolver(createPostSchema),
  });

  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      utils.post.list.invalidate();
      reset();
    },
  });

  const onSubmit = (data: CreatePostInput) => {
    createPost.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}

      <textarea {...register('content')} />
      {errors.content && <span>{errors.content.message}</span>}

      <button type="submit" disabled={createPost.isPending}>
        Create
      </button>
    </form>
  );
}
```
