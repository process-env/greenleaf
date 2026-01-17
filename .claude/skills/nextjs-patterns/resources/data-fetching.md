# Data Fetching

Comprehensive guide to data fetching in Next.js App Router.

## Table of Contents

- [Fetch API](#fetch-api)
- [Caching Strategies](#caching-strategies)
- [Request Memoization](#request-memoization)
- [Parallel and Sequential Fetching](#parallel-and-sequential-fetching)
- [Revalidation](#revalidation)
- [ORM and Database](#orm-and-database)

---

## Fetch API

### Basic Fetch

```tsx
// Cached by default (equivalent to SSG)
async function getData() {
  const res = await fetch("https://api.example.com/data")

  if (!res.ok) {
    throw new Error("Failed to fetch data")
  }

  return res.json()
}

export default async function Page() {
  const data = await getData()
  return <div>{data.title}</div>
}
```

### Fetch with Options

```tsx
// Static: Cached indefinitely (default)
const staticData = await fetch("https://api.example.com/static")

// ISR: Revalidate every 60 seconds
const isrData = await fetch("https://api.example.com/isr", {
  next: { revalidate: 60 },
})

// Dynamic: Never cached
const dynamicData = await fetch("https://api.example.com/dynamic", {
  cache: "no-store",
})

// Tagged: For on-demand revalidation
const taggedData = await fetch("https://api.example.com/tagged", {
  next: { tags: ["posts", "homepage"] },
})
```

### Fetch Error Handling

```tsx
async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return res
    } catch (error) {
      if (i === retries - 1) throw error
    }
    await new Promise((r) => setTimeout(r, 1000 * (i + 1)))
  }
  throw new Error("Max retries reached")
}

export default async function Page() {
  try {
    const res = await fetchWithRetry("https://api.example.com/data")
    const data = await res.json()
    return <div>{data.title}</div>
  } catch (error) {
    return <div>Error loading data</div>
  }
}
```

---

## Caching Strategies

### Static Data (Build Time)

```tsx
// Default behavior - fetched at build time
export default async function StaticPage() {
  const data = await fetch("https://api.example.com/data")
  return <div>{data.title}</div>
}

// Explicit static generation
export const dynamic = "force-static"
```

### Dynamic Data (Request Time)

```tsx
// Force dynamic rendering
export const dynamic = "force-dynamic"

export default async function DynamicPage() {
  const data = await fetch("https://api.example.com/data", {
    cache: "no-store",
  })
  return <div>{data.title}</div>
}
```

### Time-based Revalidation (ISR)

```tsx
// Page-level revalidation
export const revalidate = 60 // seconds

export default async function ISRPage() {
  const data = await fetch("https://api.example.com/data")
  return <div>{data.title}</div>
}

// Fetch-level revalidation
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 3600 }, // 1 hour
})
```

### Tag-based Revalidation

```tsx
// Fetch with tag
const posts = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
})

// Revalidate in Server Action
"use server"

import { revalidateTag } from "next/cache"

export async function createPost() {
  // ... create post
  revalidateTag("posts")
}
```

---

## Request Memoization

### Automatic Deduplication

```tsx
// Same request in multiple components - only fetched once
async function getUser(id: string) {
  // This request is automatically memoized
  const res = await fetch(`https://api.example.com/users/${id}`)
  return res.json()
}

// Component A
async function UserHeader({ userId }: { userId: string }) {
  const user = await getUser(userId) // Request 1
  return <h1>{user.name}</h1>
}

// Component B
async function UserStats({ userId }: { userId: string }) {
  const user = await getUser(userId) // Reuses Request 1
  return <div>{user.posts.length} posts</div>
}

// Page - both components share the same request
export default function Page() {
  return (
    <div>
      <UserHeader userId="123" />
      <UserStats userId="123" />
    </div>
  )
}
```

### When Memoization Applies

| Scenario | Memoized? |
|----------|-----------|
| Same URL in render pass | Yes |
| Same URL, different routes | No |
| Same URL with POST | No |
| Same URL after mutation | No |

### Manual Caching with unstable_cache

```tsx
import { unstable_cache } from "next/cache"

const getCachedUser = unstable_cache(
  async (id: string) => {
    // This can be a database call
    return db.user.findUnique({ where: { id } })
  },
  ["user"], // Cache key prefix
  {
    revalidate: 3600, // Revalidate every hour
    tags: ["user"], // For on-demand revalidation
  }
)

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getCachedUser(params.id)
  return <div>{user?.name}</div>
}
```

---

## Parallel and Sequential Fetching

### Parallel Fetching (Preferred)

```tsx
async function Dashboard() {
  // Start all fetches simultaneously
  const userPromise = fetchUser()
  const postsPromise = fetchPosts()
  const analyticsPromise = fetchAnalytics()

  // Wait for all to complete
  const [user, posts, analytics] = await Promise.all([
    userPromise,
    postsPromise,
    analyticsPromise,
  ])

  return (
    <div>
      <UserCard user={user} />
      <PostList posts={posts} />
      <AnalyticsChart data={analytics} />
    </div>
  )
}
```

### Sequential Fetching (When Necessary)

```tsx
async function UserPosts({ userId }: { userId: string }) {
  // Sequential - posts depend on user
  const user = await fetchUser(userId)
  const posts = await fetchUserPosts(user.id)

  return (
    <div>
      <h1>{user.name}'s Posts</h1>
      <PostList posts={posts} />
    </div>
  )
}
```

### Preloading Pattern

```tsx
// lib/preload.ts
import { cache } from "react"

export const preload = (id: string) => {
  void getUser(id)
}

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})

// page.tsx
import { preload, getUser } from "@/lib/preload"

export default async function Page({ params }: { params: { id: string } }) {
  // Start fetching early
  preload(params.id)

  // Do other work...

  const user = await getUser(params.id)
  return <div>{user?.name}</div>
}
```

### Streaming with Suspense

```tsx
import { Suspense } from "react"

async function SlowComponent() {
  const data = await slowFetch() // 3 second delay
  return <div>{data.value}</div>
}

async function FastComponent() {
  const data = await fastFetch() // 100ms delay
  return <div>{data.value}</div>
}

export default function Page() {
  return (
    <div>
      {/* Shows immediately */}
      <h1>Dashboard</h1>

      {/* Shows after 100ms */}
      <Suspense fallback={<p>Loading fast...</p>}>
        <FastComponent />
      </Suspense>

      {/* Shows after 3 seconds */}
      <Suspense fallback={<p>Loading slow...</p>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}
```

---

## Revalidation

### Path-based Revalidation

```tsx
"use server"

import { revalidatePath } from "next/cache"

export async function updatePost(id: string, data: FormData) {
  await db.post.update({ where: { id }, data: { ... } })

  // Revalidate specific path
  revalidatePath(`/posts/${id}`)

  // Revalidate with layout
  revalidatePath("/posts", "layout")

  // Revalidate everything
  revalidatePath("/", "layout")
}
```

### Tag-based Revalidation

```tsx
// Fetching with tags
async function getPosts() {
  return fetch("https://api.example.com/posts", {
    next: { tags: ["posts", "homepage"] },
  })
}

// Revalidating by tag
"use server"

import { revalidateTag } from "next/cache"

export async function createPost(data: FormData) {
  await db.post.create({ data: { ... } })

  // Only revalidates fetches with "posts" tag
  revalidateTag("posts")
}
```

### On-demand Revalidation API

```tsx
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

export async function POST(request: NextRequest) {
  const { secret, path, tag } = await request.json()

  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 })
  }

  if (path) {
    revalidatePath(path)
  }

  if (tag) {
    revalidateTag(tag)
  }

  return NextResponse.json({ revalidated: true })
}
```

---

## ORM and Database

### Prisma Integration

```tsx
// lib/db.ts
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db
```

```tsx
// Direct database queries in Server Components
import { db } from "@/lib/db"

export default async function UsersPage() {
  const users = await db.user.findMany({
    include: { posts: { take: 3 } },
  })

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>
          {user.name} - {user.posts.length} posts
        </li>
      ))}
    </ul>
  )
}
```

### Drizzle Integration

```tsx
// lib/db.ts
import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client)

// Usage
import { db } from "@/lib/db"
import { users } from "@/lib/schema"

export default async function UsersPage() {
  const allUsers = await db.select().from(users)
  return <UserList users={allUsers} />
}
```

### Query Caching Pattern

```tsx
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

export const getPostsWithAuthor = unstable_cache(
  async () => {
    return db.post.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  },
  ["posts-with-author"],
  { revalidate: 300, tags: ["posts"] }
)
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [server-components.md](server-components.md)
- [rendering-strategies.md](rendering-strategies.md)
