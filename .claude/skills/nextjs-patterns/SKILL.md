---
name: nextjs-patterns
description: Next.js 15/16 App Router patterns, Server Components, Server Actions, use cache directive, cacheLife, data fetching strategies, rendering modes (SSR, SSG, ISR, PPR), middleware, parallel/intercepting routes, and performance optimization. Use when building Next.js applications with modern App Router architecture.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  nextjs: "15.x/16.x"
  react: "19.x"
---

# Next.js Patterns Guide

Comprehensive patterns for Next.js 15/16 App Router development.

> **Updated 2026-01-11:** Added `use cache` directive, `cacheLife`, and PPR patterns for Next.js 15/16. The `unstable_cache` API is deprecated - use `use cache` instead.

## Quick Navigation

| Topic | Resource File |
|-------|---------------|
| App Router basics | [app-router-fundamentals.md](resources/app-router-fundamentals.md) |
| Server Components | [server-components.md](resources/server-components.md) |
| Data fetching | [data-fetching.md](resources/data-fetching.md) |
| Server Actions | [server-actions.md](resources/server-actions.md) |
| Rendering strategies | [rendering-strategies.md](resources/rendering-strategies.md) |
| Advanced routing | [routing-patterns.md](resources/routing-patterns.md) |
| Middleware | [middleware-guide.md](resources/middleware-guide.md) |
| Performance | [performance-patterns.md](resources/performance-patterns.md) |
| API Routes | [api-routes.md](resources/api-routes.md) |
| Full examples | [complete-examples.md](resources/complete-examples.md) |

---

## App Router Fundamentals

### File-Based Routing

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI
├── error.tsx           # Error boundary
├── not-found.tsx       # 404 page
├── global-error.tsx    # Global error boundary
├── dashboard/
│   ├── layout.tsx      # Nested layout
│   ├── page.tsx        # /dashboard
│   └── settings/
│       └── page.tsx    # /dashboard/settings
└── blog/
    └── [slug]/
        └── page.tsx    # /blog/:slug
```

### Special Files

| File | Purpose |
|------|---------|
| `page.tsx` | Route UI, makes route accessible |
| `layout.tsx` | Shared UI, preserves state |
| `loading.tsx` | Suspense loading fallback |
| `error.tsx` | Error boundary |
| `template.tsx` | Re-rendered on navigation |
| `default.tsx` | Parallel route fallback |

### Root Layout (Required)

```tsx
// app/layout.tsx
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "My App",
  description: "Description",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

---

## Server Components (Default)

### Basic Server Component

```tsx
// app/users/page.tsx - Server Component by default
async function UsersPage() {
  const users = await db.user.findMany()

  return (
    <div>
      <h1>Users</h1>
      <ul>
        {users.map((user) => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  )
}

export default UsersPage
```

### Server Component Benefits

- Direct database access
- Access to backend resources
- No client-side JavaScript
- Automatic code splitting
- Secure (secrets stay on server)

### Server vs Client Components

| Feature | Server | Client |
|---------|--------|--------|
| Data fetching | Direct DB/API | useEffect/SWR |
| State/Effects | No | Yes |
| Event handlers | No | Yes |
| Browser APIs | No | Yes |
| Secrets | Safe | Exposed |

---

## Client Components

### "use client" Directive

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <p>Count: {count}</p>
      <Button onClick={() => setCount(count + 1)}>
        Increment
      </Button>
    </div>
  )
}
```

### When to Use Client Components

- useState, useEffect, useReducer
- Event handlers (onClick, onChange)
- Browser APIs (localStorage, window)
- Custom hooks with state
- Third-party libraries using React state

### Composition Pattern

```tsx
// app/dashboard/page.tsx (Server Component)
import { Counter } from "@/components/counter"

async function DashboardPage() {
  const data = await fetchData() // Server-side

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Server data: {data.value}</p>
      <Counter /> {/* Client component */}
    </div>
  )
}
```

---

## Data Fetching

### Server Component Fetching

```tsx
// Automatic request deduplication
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

### Fetch Options

```tsx
// Cached by default (static)
fetch("https://api.example.com/data")

// Revalidate every 60 seconds (ISR)
fetch("https://api.example.com/data", {
  next: { revalidate: 60 },
})

// No cache (dynamic)
fetch("https://api.example.com/data", {
  cache: "no-store",
})

// Revalidate on demand with tags
fetch("https://api.example.com/data", {
  next: { tags: ["posts"] },
})
```

### Parallel Data Fetching

```tsx
async function Page() {
  // Fetch in parallel
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
  ])

  return (
    <div>
      <UserList users={users} />
      <PostList posts={posts} />
    </div>
  )
}
```

---

## Server Actions

### Basic Server Action

```tsx
// app/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function createPost(formData: FormData) {
  const title = formData.get("title") as string
  const content = formData.get("content") as string

  await db.post.create({
    data: { title, content },
  })

  revalidatePath("/posts")
  redirect("/posts")
}
```

### Form with Server Action

```tsx
// app/posts/new/page.tsx
import { createPost } from "@/app/actions"

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input type="text" name="title" required />
      <textarea name="content" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

### Server Action with useActionState (React 19)

```tsx
"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { createPost } from "@/app/actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create Post"}
    </button>
  )
}

export function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null)

  return (
    <form action={formAction}>
      <input type="text" name="title" />
      {state?.errors?.title && <p>{state.errors.title}</p>}
      <SubmitButton />
    </form>
  )
}
```

> **Note:** `useFormState` was renamed to `useActionState` in React 19. Import from `react` not `react-dom`.

---

## Rendering Strategies

### Static Generation (Default)

```tsx
// Statically generated at build time
export default async function Page() {
  const data = await fetch("https://api.example.com/data")
  return <div>{data.title}</div>
}
```

### Dynamic Rendering

```tsx
// Force dynamic rendering
export const dynamic = "force-dynamic"

// Or use dynamic functions
import { cookies, headers } from "next/headers"

export default async function Page() {
  const cookieStore = cookies()
  const headersList = headers()
  // This page will be dynamically rendered
}
```

### Incremental Static Regeneration (ISR)

```tsx
// Revalidate every 60 seconds
export const revalidate = 60

export default async function Page() {
  const data = await fetch("https://api.example.com/data")
  return <div>{data.title}</div>
}
```

### generateStaticParams

```tsx
// app/blog/[slug]/page.tsx
export async function generateStaticParams() {
  const posts = await fetchPosts()

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string }
}) {
  const post = await fetchPost(params.slug)
  return <article>{post.content}</article>
}
```

---

## Loading and Error States

### Loading UI

```tsx
// app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-4 w-[300px]" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
```

### Error Boundary

```tsx
"use client"

// app/dashboard/error.tsx
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div>
      <h2>Something went wrong!</h2>
      <p>{error.message}</p>
      <button onClick={() => reset()}>Try again</button>
    </div>
  )
}
```

### Streaming with Suspense

```tsx
import { Suspense } from "react"

async function SlowComponent() {
  const data = await slowFetch()
  return <div>{data}</div>
}

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <SlowComponent />
      </Suspense>
    </div>
  )
}
```

---

## Metadata

### Static Metadata

```tsx
// app/page.tsx
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Home | My App",
  description: "Welcome to my app",
  openGraph: {
    title: "Home | My App",
    description: "Welcome to my app",
    images: ["/og-image.png"],
  },
}
```

### Dynamic Metadata

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from "next"

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const post = await fetchPost(params.slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      images: [post.image],
    },
  }
}
```

---

## Middleware

### Basic Middleware

```tsx
// middleware.ts (root of project)
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Check authentication
  const token = request.cookies.get("token")

  if (!token && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/:path*"],
}
```

### Adding Headers

```tsx
export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  response.headers.set("x-custom-header", "value")

  return response
}
```

---

## Route Handlers (API Routes)

### Basic Route Handler

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  const users = await db.user.findMany()
  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  return NextResponse.json(user, { status: 201 })
}
```

### Dynamic Route Handler

```tsx
// app/api/users/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await db.user.findUnique({
    where: { id: params.id },
  })

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(user)
}
```

---

## Best Practices

### Component Organization

```
src/
├── app/                 # App Router routes
├── components/
│   ├── ui/              # shadcn/ui components
│   └── features/        # Feature components
├── lib/
│   ├── utils.ts         # Utility functions
│   └── db.ts            # Database client
├── hooks/               # Custom hooks
└── types/               # TypeScript types
```

### Prefer Server Components

- Default to Server Components
- Only use "use client" when needed
- Keep client components small and focused

### Data Fetching Guidelines

- Fetch data in Server Components
- Use Suspense for streaming
- Implement proper error boundaries
- Use `"use cache"` directive with `cacheLife` for expensive operations

### Performance Tips

- Use `next/image` for images
- Use `next/font` for fonts
- Implement proper loading states
- Use Route Groups for organization

---

## Gotchas & Real-World Warnings

### Server Component Data Leaks

**Everything in a Server Component gets serialized to the client:**

```tsx
// DANGER: Secrets sent to client in component tree
async function UserPage() {
    const user = await db.user.findUnique({
        where: { id },
        include: { passwordHash: true }  // Oops!
    });
    return <Profile user={user} />;  // passwordHash serialized to client
}

// CORRECT: Select only what you need
const user = await db.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true }
});
```

### Caching Confusion (Next.js 15+)

**Default caching behavior changed between versions:**

| Version | fetch() default | What it means |
|---------|-----------------|---------------|
| 14.x | Cached | Static unless opted out |
| 15.x | Not cached | Dynamic unless opted in |

```tsx
// Next.js 15: This is dynamic by default
const data = await fetch('https://api.example.com/data');

// To cache, you must explicitly opt in:
const data = await fetch('https://api.example.com/data', {
    next: { revalidate: 3600 }
});

// Or use the new "use cache" directive
async function getCachedData() {
    "use cache"
    cacheLife("hours")
    return fetch('https://api.example.com/data');
}
```

### Server Actions Aren't Free

**Every Server Action is a network request:**

```tsx
// DANGER: Server Action in a loop
{items.map(item => (
    <form action={async () => {
        "use server"
        await updateItem(item.id);  // N network requests!
    }}>
        <button>Update</button>
    </form>
))}

// BETTER: Batch operations
<form action={async (formData) => {
    "use server"
    const itemIds = formData.getAll('itemId');
    await updateItems(itemIds);  // One request
}}>
```

### Middleware Runs on Every Request

**Middleware is powerful but expensive:**

```tsx
// DANGER: Heavy operations in middleware
export async function middleware(request: NextRequest) {
    const user = await fetchUserFromDatabase(request.cookies);  // DB call every request!
    // ...
}

// BETTER: Use lightweight checks, defer heavy work
export async function middleware(request: NextRequest) {
    const token = request.cookies.get('token');
    if (!token) return NextResponse.redirect('/login');
    // Verify token with JWT (no DB call)
    // Defer user fetch to the actual page
}
```

### generateStaticParams Pitfalls

**Missing params means 404, not fallback:**

```tsx
// DANGER: Only pre-generates existing posts
export async function generateStaticParams() {
    const posts = await db.post.findMany();
    return posts.map(p => ({ slug: p.slug }));
}

// New post created after build = 404!

// FIX: Add dynamicParams option
export const dynamicParams = true;  // Allow on-demand generation
```

### Parallel Routes Complexity

**Parallel routes seem simple until they're not:**

| Situation | Problem |
|-----------|---------|
| Soft navigation | Slots keep old content if not navigated |
| Hard navigation | All slots reset to default |
| Missing default.tsx | Causes errors on certain navigations |
| Loading states | Each slot needs its own loading.tsx |

### What These Patterns Don't Tell You

1. **Build times** - Large sites with generateStaticParams can take hours to build
2. **Cold starts** - Serverless deployments have cold start latency
3. **ISR race conditions** - Multiple users can trigger revalidation simultaneously
4. **Streaming SSR** - Not all hosting providers support streaming properly
5. **Image optimization** - next/image adds latency on first request per size
6. **Middleware limits** - Edge runtime doesn't support all Node.js APIs

---

## Quick Reference

### Route Segment Config

```tsx
// Dynamic behavior
export const dynamic = "auto" | "force-dynamic" | "error" | "force-static"

// Revalidation
export const revalidate = false | 0 | number

// Runtime
export const runtime = "nodejs" | "edge"

// Preferred region
export const preferredRegion = "auto" | "global" | "home" | string[]
```

### Dynamic Functions

```tsx
import { cookies, headers } from "next/headers"
import { useSearchParams, usePathname, useParams } from "next/navigation"

// Server-only
const cookieStore = cookies()
const headersList = headers()

// Client-only (hooks)
const searchParams = useSearchParams()
const pathname = usePathname()
const params = useParams()
```

### Cache Control (Next.js 15+)

```tsx
import { revalidatePath, revalidateTag } from "next/cache"
import { cacheLife, cacheTag } from "next/cache"

// Revalidate on demand
revalidatePath("/posts")
revalidateTag("posts")

// NEW: use cache directive (replaces unstable_cache)
async function getCachedData() {
  "use cache"
  cacheLife("hours") // Built-in profiles: 'seconds', 'minutes', 'hours', 'days', 'weeks', 'max'
  cacheTag("my-data")
  return fetchData()
}

// Cache at component level
async function CachedComponent() {
  "use cache"
  cacheLife("days")
  const data = await fetchData()
  return <div>{data}</div>
}

// Custom cache profile in next.config.js:
// cacheLife: { custom: { stale: 300, revalidate: 600, expire: 3600 } }
```

> **Deprecation:** `unstable_cache` is deprecated. Use `"use cache"` directive with `cacheLife` instead.

---

**For detailed patterns, see the resource files linked above.**
