# App Router Fundamentals

Complete guide to Next.js App Router architecture.

## Table of Contents

- [Directory Structure](#directory-structure)
- [Special Files](#special-files)
- [Route Groups](#route-groups)
- [Dynamic Routes](#dynamic-routes)
- [Catch-all Routes](#catch-all-routes)
- [Colocation](#colocation)

---

## Directory Structure

### Basic Structure

```
app/
├── layout.tsx          # Root layout (required)
├── page.tsx            # Home page (/)
├── loading.tsx         # Loading UI for /
├── error.tsx           # Error boundary for /
├── not-found.tsx       # 404 page
├── favicon.ico         # Favicon
├── globals.css         # Global styles
│
├── about/
│   └── page.tsx        # /about
│
├── blog/
│   ├── page.tsx        # /blog
│   └── [slug]/
│       └── page.tsx    # /blog/:slug
│
└── dashboard/
    ├── layout.tsx      # Dashboard layout
    ├── page.tsx        # /dashboard
    ├── loading.tsx     # Dashboard loading
    └── settings/
        └── page.tsx    # /dashboard/settings
```

### src Directory

```
src/
├── app/                # App Router
├── components/         # Shared components
├── lib/                # Utilities
└── hooks/              # Custom hooks
```

---

## Special Files

### page.tsx

Makes a route publicly accessible:

```tsx
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About Us</h1>
      <p>Welcome to our company.</p>
    </div>
  )
}
```

### layout.tsx

Shared UI that wraps children:

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <aside className="w-64">
        <nav>{/* Navigation */}</nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

### loading.tsx

Automatic Suspense boundary:

```tsx
// app/dashboard/loading.tsx
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
```

### error.tsx

Error boundary (must be Client Component):

```tsx
"use client"

// app/dashboard/error.tsx
import { useEffect } from "react"
import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-muted-foreground mt-2">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  )
}
```

### not-found.tsx

Custom 404 page:

```tsx
// app/not-found.tsx
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-4xl font-bold">404</h2>
      <p className="text-muted-foreground mt-2">Page not found</p>
      <Button asChild className="mt-4">
        <Link href="/">Return Home</Link>
      </Button>
    </div>
  )
}
```

### template.tsx

Re-renders on each navigation (unlike layout):

```tsx
// app/dashboard/template.tsx
export default function Template({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="animate-fade-in">
      {children}
    </div>
  )
}
```

### global-error.tsx

Root-level error boundary:

```tsx
"use client"

// app/global-error.tsx
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={reset}>Try again</button>
      </body>
    </html>
  )
}
```

---

## Route Groups

### Organization without URL Impact

```
app/
├── (marketing)/
│   ├── layout.tsx      # Marketing layout
│   ├── page.tsx        # / (home)
│   ├── about/
│   │   └── page.tsx    # /about
│   └── contact/
│       └── page.tsx    # /contact
│
├── (shop)/
│   ├── layout.tsx      # Shop layout
│   ├── products/
│   │   └── page.tsx    # /products
│   └── cart/
│       └── page.tsx    # /cart
│
└── (auth)/
    ├── layout.tsx      # Auth layout (centered)
    ├── login/
    │   └── page.tsx    # /login
    └── register/
        └── page.tsx    # /register
```

### Multiple Root Layouts

```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <header>Marketing Header</header>
        {children}
        <footer>Marketing Footer</footer>
      </body>
    </html>
  )
}

// app/(auth)/layout.tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="flex items-center justify-center min-h-screen">
        {children}
      </body>
    </html>
  )
}
```

---

## Dynamic Routes

### Single Parameter

```tsx
// app/blog/[slug]/page.tsx
interface PageProps {
  params: { slug: string }
}

export default async function BlogPost({ params }: PageProps) {
  const post = await getPost(params.slug)

  return (
    <article>
      <h1>{post.title}</h1>
      <div>{post.content}</div>
    </article>
  )
}
```

### Multiple Parameters

```tsx
// app/blog/[category]/[slug]/page.tsx
interface PageProps {
  params: {
    category: string
    slug: string
  }
}

export default async function BlogPost({ params }: PageProps) {
  const { category, slug } = params
  const post = await getPost(category, slug)

  return <article>{/* ... */}</article>
}
```

### Search Parameters

```tsx
// app/search/page.tsx
interface PageProps {
  searchParams: { [key: string]: string | string[] | undefined }
}

export default async function SearchPage({ searchParams }: PageProps) {
  const query = searchParams.q as string
  const page = Number(searchParams.page) || 1

  const results = await search(query, page)

  return <div>{/* ... */}</div>
}
```

---

## Catch-all Routes

### Catch-all Segments

```tsx
// app/docs/[...slug]/page.tsx
// Matches: /docs/a, /docs/a/b, /docs/a/b/c

interface PageProps {
  params: { slug: string[] }
}

export default function DocsPage({ params }: PageProps) {
  // /docs/guide/intro -> slug: ["guide", "intro"]
  const path = params.slug.join("/")

  return <div>Path: {path}</div>
}
```

### Optional Catch-all

```tsx
// app/docs/[[...slug]]/page.tsx
// Also matches: /docs (slug is undefined)

interface PageProps {
  params: { slug?: string[] }
}

export default function DocsPage({ params }: PageProps) {
  const slug = params.slug ?? []
  // /docs -> slug: []
  // /docs/intro -> slug: ["intro"]

  return <div>{/* ... */}</div>
}
```

---

## Colocation

### Private Folders

```
app/
├── dashboard/
│   ├── _components/     # Private - not routed
│   │   ├── sidebar.tsx
│   │   └── header.tsx
│   ├── _lib/            # Private utilities
│   │   └── utils.ts
│   └── page.tsx
```

### Component Colocation

```
app/
├── dashboard/
│   ├── page.tsx
│   ├── dashboard-chart.tsx    # Colocated component
│   ├── dashboard-stats.tsx    # Colocated component
│   └── types.ts               # Colocated types
```

### Recommended Structure

```
app/
├── (routes)/
│   └── dashboard/
│       └── page.tsx
├── components/
│   ├── ui/                    # shadcn/ui
│   └── dashboard/
│       ├── chart.tsx
│       └── stats.tsx
└── lib/
    └── utils.ts
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [routing-patterns.md](routing-patterns.md)
