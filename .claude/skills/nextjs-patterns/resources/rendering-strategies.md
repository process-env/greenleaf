# Rendering Strategies

Guide to Static Generation, Server-Side Rendering, and Incremental Static Regeneration.

## Table of Contents

- [Rendering Overview](#rendering-overview)
- [Static Generation (SSG)](#static-generation-ssg)
- [Server-Side Rendering (SSR)](#server-side-rendering-ssr)
- [Incremental Static Regeneration (ISR)](#incremental-static-regeneration-isr)
- [Partial Prerendering](#partial-prerendering)
- [Streaming](#streaming)

---

## Rendering Overview

### Rendering Decision Tree

```
Is data user-specific or request-time dependent?
├── Yes → Dynamic Rendering (SSR)
│   └── Use: cache: "no-store" or dynamic functions
└── No → Static Rendering (SSG)
    └── Does data change frequently?
        ├── Yes → ISR with revalidation
        └── No → Static at build time
```

### Route Segment Config

```tsx
// Static (default)
export const dynamic = "auto"

// Force dynamic
export const dynamic = "force-dynamic"

// Force static
export const dynamic = "force-static"

// Error if dynamic
export const dynamic = "error"

// Revalidation time
export const revalidate = false | 0 | number

// Runtime
export const runtime = "nodejs" | "edge"
```

---

## Static Generation (SSG)

### Default Static Behavior

```tsx
// This page is statically generated at build time
export default async function BlogPage() {
  const posts = await fetch("https://api.example.com/posts")
    .then((res) => res.json())

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  )
}
```

### generateStaticParams

```tsx
// app/blog/[slug]/page.tsx

// Generate static paths at build time
export async function generateStaticParams() {
  const posts = await fetch("https://api.example.com/posts")
    .then((res) => res.json())

  return posts.map((post) => ({
    slug: post.slug,
  }))
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string }
}) {
  const post = await fetch(`https://api.example.com/posts/${params.slug}`)
    .then((res) => res.json())

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  )
}
```

### Multiple Dynamic Segments

```tsx
// app/blog/[category]/[slug]/page.tsx

export async function generateStaticParams() {
  const posts = await getPosts()

  return posts.map((post) => ({
    category: post.category,
    slug: post.slug,
  }))
}
```

### Dynamic Params Options

```tsx
// Generate only specified paths, 404 for others
export const dynamicParams = false

// Generate on-demand for unknown paths (default)
export const dynamicParams = true

export async function generateStaticParams() {
  const posts = await getTopPosts(10) // Only pre-render top 10
  return posts.map((post) => ({ slug: post.slug }))
}
```

---

## Server-Side Rendering (SSR)

### Force Dynamic Rendering

```tsx
// Method 1: Route segment config
export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const data = await fetchUserData()
  return <Dashboard data={data} />
}
```

```tsx
// Method 2: No-store cache
export default async function DashboardPage() {
  const data = await fetch("https://api.example.com/user", {
    cache: "no-store",
  }).then((res) => res.json())

  return <Dashboard data={data} />
}
```

### Dynamic Functions

Using these functions automatically opts into dynamic rendering:

```tsx
import { cookies, headers } from "next/headers"

export default async function Page() {
  // Any of these trigger dynamic rendering
  const cookieStore = cookies()
  const headersList = headers()

  const token = cookieStore.get("token")
  const userAgent = headersList.get("user-agent")

  return <div>Dynamic content</div>
}
```

### Search Parameters

```tsx
// Page with search params is dynamic
export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string }
}) {
  const query = searchParams.q ?? ""
  const page = Number(searchParams.page) || 1

  const results = await search(query, page)

  return <SearchResults results={results} />
}
```

---

## Incremental Static Regeneration (ISR)

### Time-based Revalidation

```tsx
// Page-level revalidation
export const revalidate = 60 // Revalidate every 60 seconds

export default async function PricingPage() {
  const prices = await fetchPrices()
  return <PriceList prices={prices} />
}
```

```tsx
// Fetch-level revalidation
export default async function Page() {
  // Different revalidation times per fetch
  const featuredPosts = await fetch("https://api.example.com/featured", {
    next: { revalidate: 300 }, // 5 minutes
  })

  const latestNews = await fetch("https://api.example.com/news", {
    next: { revalidate: 60 }, // 1 minute
  })

  return (
    <div>
      <FeaturedSection posts={featuredPosts} />
      <NewsSection news={latestNews} />
    </div>
  )
}
```

### On-demand Revalidation

```tsx
// app/actions.ts
"use server"

import { revalidatePath, revalidateTag } from "next/cache"

export async function publishPost(postId: string) {
  await db.post.update({
    where: { id: postId },
    data: { published: true },
  })

  // Revalidate the specific post page
  revalidatePath(`/blog/${postId}`)

  // Revalidate the blog listing
  revalidatePath("/blog")

  // Or revalidate by tag
  revalidateTag("posts")
}
```

### Tag-based Caching

```tsx
// Fetch with tags
async function getPosts() {
  return fetch("https://api.example.com/posts", {
    next: { tags: ["posts"] },
  })
}

async function getPost(slug: string) {
  return fetch(`https://api.example.com/posts/${slug}`, {
    next: { tags: ["posts", `post-${slug}`] },
  })
}

// Revalidate specific content
"use server"

import { revalidateTag } from "next/cache"

export async function updatePost(slug: string) {
  // ... update logic
  revalidateTag(`post-${slug}`) // Only revalidate this post
}

export async function deleteAllPosts() {
  // ... delete logic
  revalidateTag("posts") // Revalidate all posts
}
```

### API Route for Webhooks

```tsx
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from "next/server"
import { revalidateTag } from "next/cache"

export async function POST(request: NextRequest) {
  const body = await request.json()

  // Verify webhook (e.g., from CMS)
  const signature = request.headers.get("x-webhook-signature")
  if (!verifySignature(signature, body)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  // Revalidate based on webhook content
  if (body.type === "post.updated") {
    revalidateTag(`post-${body.slug}`)
  }

  if (body.type === "post.created" || body.type === "post.deleted") {
    revalidateTag("posts")
  }

  return NextResponse.json({ revalidated: true })
}
```

---

## Partial Prerendering

### Combining Static and Dynamic

```tsx
import { Suspense } from "react"

// Static shell
export default function ProductPage({ params }: { params: { id: string } }) {
  return (
    <div>
      {/* Static content - prerendered */}
      <ProductDetails id={params.id} />

      {/* Dynamic content - streamed */}
      <Suspense fallback={<PriceSkeleton />}>
        <DynamicPrice id={params.id} />
      </Suspense>

      <Suspense fallback={<StockSkeleton />}>
        <LiveStock id={params.id} />
      </Suspense>
    </div>
  )
}

// Static component
async function ProductDetails({ id }: { id: string }) {
  const product = await getProduct(id)
  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
    </div>
  )
}

// Dynamic component
async function DynamicPrice({ id }: { id: string }) {
  const price = await fetch(`/api/price/${id}`, {
    cache: "no-store",
  }).then((r) => r.json())

  return <span>${price.amount}</span>
}
```

---

## Streaming

### Suspense Streaming

```tsx
import { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Fast component - shows first */}
      <Suspense fallback={<Skeleton className="h-32" />}>
        <QuickStats />
      </Suspense>

      {/* Medium component */}
      <Suspense fallback={<Skeleton className="h-32" />}>
        <RecentActivity />
      </Suspense>

      {/* Slow component - streams in last */}
      <Suspense fallback={<Skeleton className="h-32" />}>
        <AnalyticsChart />
      </Suspense>
    </div>
  )
}

async function QuickStats() {
  const stats = await fetch("/api/stats", {
    next: { revalidate: 60 },
  }).then((r) => r.json())

  return <StatCard stats={stats} />
}

async function AnalyticsChart() {
  // Slow API call
  const data = await fetchComplexAnalytics()
  return <Chart data={data} />
}
```

### Nested Suspense

```tsx
export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <MainContent>
        <Suspense fallback={<SidebarSkeleton />}>
          <Sidebar />
        </Suspense>

        <Suspense fallback={<FeedSkeleton />}>
          <Feed>
            <Suspense fallback={<CommentsSkeleton />}>
              <Comments />
            </Suspense>
          </Feed>
        </Suspense>
      </MainContent>
    </Suspense>
  )
}
```

### Loading UI vs Suspense

```tsx
// app/dashboard/loading.tsx - Page-level loading
export default function Loading() {
  return <DashboardSkeleton />
}

// app/dashboard/page.tsx - Component-level Suspense
import { Suspense } from "react"

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* loading.tsx handles initial page load */}
      {/* Suspense handles component-level loading */}
      <Suspense fallback={<ChartSkeleton />}>
        <SlowChart />
      </Suspense>
    </div>
  )
}
```

---

## Best Practices

### Choosing the Right Strategy

| Content Type | Strategy | Config |
|-------------|----------|--------|
| Marketing pages | Static | Default |
| Blog posts | ISR | `revalidate: 3600` |
| Product pages | ISR with tags | `tags: ["product"]` |
| User dashboard | Dynamic | `dynamic: "force-dynamic"` |
| Real-time data | Dynamic + Streaming | Suspense boundaries |

### Performance Tips

```tsx
// Preload data for faster navigation
import { preload } from "@/lib/data"

export default function Page() {
  preload() // Start fetching early
  return <Content />
}

// Use parallel data fetching
async function Page() {
  const [users, posts] = await Promise.all([
    fetchUsers(),
    fetchPosts(),
  ])
  return <Dashboard users={users} posts={posts} />
}

// Cache expensive computations
import { unstable_cache } from "next/cache"

const getExpensiveData = unstable_cache(
  async () => computeExpensiveData(),
  ["expensive-data"],
  { revalidate: 3600 }
)
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [data-fetching.md](data-fetching.md)
- [performance-patterns.md](performance-patterns.md)
