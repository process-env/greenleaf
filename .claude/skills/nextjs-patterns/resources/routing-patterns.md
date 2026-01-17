# Routing Patterns

Advanced routing patterns including parallel routes, intercepting routes, and route handlers.

## Table of Contents

- [Parallel Routes](#parallel-routes)
- [Intercepting Routes](#intercepting-routes)
- [Route Handlers](#route-handlers)
- [Middleware Routing](#middleware-routing)
- [Navigation](#navigation)

---

## Parallel Routes

### Basic Parallel Routes

```
app/
├── layout.tsx
├── page.tsx
├── @dashboard/
│   ├── page.tsx
│   └── loading.tsx
├── @analytics/
│   ├── page.tsx
│   └── loading.tsx
└── @notifications/
    └── page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  dashboard,
  analytics,
  notifications,
}: {
  children: React.ReactNode
  dashboard: React.ReactNode
  analytics: React.ReactNode
  notifications: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-12 gap-4">
      <main className="col-span-8">{children}</main>
      <aside className="col-span-4 space-y-4">
        {dashboard}
        {analytics}
        {notifications}
      </aside>
    </div>
  )
}
```

### Conditional Rendering

```tsx
// app/layout.tsx
import { getUser } from "@/lib/auth"

export default async function Layout({
  children,
  admin,
  user,
}: {
  children: React.ReactNode
  admin: React.ReactNode
  user: React.ReactNode
}) {
  const currentUser = await getUser()

  return (
    <div>
      {children}
      {currentUser?.role === "admin" ? admin : user}
    </div>
  )
}
```

### Default Fallback

```tsx
// app/@analytics/default.tsx
// Shown when navigating to routes that don't have
// a matching @analytics slot

export default function Default() {
  return null // Or a default component
}
```

### Modal with Parallel Routes

```
app/
├── layout.tsx
├── page.tsx
├── @modal/
│   ├── default.tsx
│   └── (.)photos/[id]/page.tsx
└── photos/
    └── [id]/
        └── page.tsx
```

```tsx
// app/layout.tsx
export default function Layout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
```

```tsx
// app/@modal/default.tsx
export default function Default() {
  return null
}
```

---

## Intercepting Routes

### Interception Conventions

| Convention | Matches |
|------------|---------|
| `(.)` | Same level |
| `(..)` | One level up |
| `(..)(..)` | Two levels up |
| `(...)` | Root |

### Photo Modal Example

```
app/
├── layout.tsx
├── page.tsx
├── @modal/
│   ├── default.tsx
│   └── (.)photos/[id]/
│       └── page.tsx       # Intercepted route (modal)
└── photos/
    └── [id]/
        └── page.tsx       # Full page route
```

```tsx
// app/@modal/(.)photos/[id]/page.tsx
import { Modal } from "@/components/modal"

export default function PhotoModal({
  params,
}: {
  params: { id: string }
}) {
  return (
    <Modal>
      <PhotoView id={params.id} />
    </Modal>
  )
}
```

```tsx
// app/photos/[id]/page.tsx (full page)
export default function PhotoPage({
  params,
}: {
  params: { id: string }
}) {
  return (
    <div className="container py-8">
      <PhotoView id={params.id} />
      <PhotoDetails id={params.id} />
    </div>
  )
}
```

```tsx
// components/modal.tsx
"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent } from "@/components/ui/dialog"

export function Modal({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent className="max-w-3xl">
        {children}
      </DialogContent>
    </Dialog>
  )
}
```

### Login Interception

```
app/
├── layout.tsx
├── @auth/
│   ├── default.tsx
│   └── (.)login/
│       └── page.tsx      # Shows as modal
└── login/
    └── page.tsx          # Full login page
```

```tsx
// app/@auth/(.)login/page.tsx
"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoginForm } from "@/components/login-form"

export default function LoginModal() {
  const router = useRouter()

  return (
    <Dialog open onOpenChange={() => router.back()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sign In</DialogTitle>
        </DialogHeader>
        <LoginForm />
      </DialogContent>
    </Dialog>
  )
}
```

---

## Route Handlers

### Basic CRUD Operations

```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

// GET /api/posts
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = Number(searchParams.get("page")) || 1
  const limit = Number(searchParams.get("limit")) || 10

  const posts = await db.post.findMany({
    skip: (page - 1) * limit,
    take: limit,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(posts)
}

// POST /api/posts
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const post = await db.post.create({
      data: body,
    })

    return NextResponse.json(post, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create post" },
      { status: 500 }
    )
  }
}
```

### Dynamic Route Handlers

```tsx
// app/api/posts/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"

// GET /api/posts/:id
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const post = await db.post.findUnique({
    where: { id: params.id },
  })

  if (!post) {
    return NextResponse.json(
      { error: "Post not found" },
      { status: 404 }
    )
  }

  return NextResponse.json(post)
}

// PATCH /api/posts/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await request.json()

  const post = await db.post.update({
    where: { id: params.id },
    data: body,
  })

  return NextResponse.json(post)
}

// DELETE /api/posts/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await db.post.delete({
    where: { id: params.id },
  })

  return new NextResponse(null, { status: 204 })
}
```

### Route Handler Options

```tsx
// app/api/data/route.ts

// Force dynamic behavior
export const dynamic = "force-dynamic"

// Or set revalidation
export const revalidate = 60

// Edge runtime
export const runtime = "edge"

export async function GET() {
  // Handler code
}
```

### Request Helpers

```tsx
import { NextRequest, NextResponse } from "next/server"
import { cookies, headers } from "next/headers"

export async function GET(request: NextRequest) {
  // Get cookies
  const cookieStore = cookies()
  const token = cookieStore.get("token")

  // Get headers
  const headersList = headers()
  const userAgent = headersList.get("user-agent")

  // Get URL info
  const { searchParams, pathname } = request.nextUrl
  const query = searchParams.get("q")

  // Set cookies in response
  const response = NextResponse.json({ data: "value" })
  response.cookies.set("visited", "true", { maxAge: 60 * 60 * 24 })

  return response
}
```

---

## Middleware Routing

### Route Matching

```tsx
// middleware.ts
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Route-specific logic
  if (pathname.startsWith("/api")) {
    // API route handling
    return handleApiRoutes(request)
  }

  if (pathname.startsWith("/dashboard")) {
    // Dashboard auth check
    return handleDashboard(request)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/api/:path*",
    "/dashboard/:path*",
    "/((?!_next/static|favicon.ico).*)",
  ],
}
```

### Rewrite and Redirect

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Redirect
  if (request.nextUrl.pathname === "/old-page") {
    return NextResponse.redirect(new URL("/new-page", request.url))
  }

  // Rewrite (URL stays the same, content from different route)
  if (request.nextUrl.pathname === "/blog") {
    return NextResponse.rewrite(new URL("/news", request.url))
  }

  // Conditional rewrite based on A/B test
  const bucket = request.cookies.get("bucket")?.value || "control"
  if (request.nextUrl.pathname === "/pricing") {
    return NextResponse.rewrite(
      new URL(`/pricing/${bucket}`, request.url)
    )
  }

  return NextResponse.next()
}
```

---

## Navigation

### Link Component

```tsx
import Link from "next/link"

// Basic link
<Link href="/about">About</Link>

// Dynamic route
<Link href={`/blog/${post.slug}`}>{post.title}</Link>

// With query params
<Link href={{ pathname: "/search", query: { q: "test" } }}>
  Search
</Link>

// Replace instead of push
<Link href="/dashboard" replace>Dashboard</Link>

// Prefetch disabled
<Link href="/heavy-page" prefetch={false}>Heavy Page</Link>

// Scroll to top disabled
<Link href="/same-page" scroll={false}>Same Page</Link>
```

### useRouter Hook

```tsx
"use client"

import { useRouter } from "next/navigation"

export function NavigationButtons() {
  const router = useRouter()

  return (
    <div>
      <button onClick={() => router.push("/dashboard")}>
        Go to Dashboard
      </button>
      <button onClick={() => router.replace("/login")}>
        Replace with Login
      </button>
      <button onClick={() => router.back()}>
        Go Back
      </button>
      <button onClick={() => router.forward()}>
        Go Forward
      </button>
      <button onClick={() => router.refresh()}>
        Refresh
      </button>
      <button onClick={() => router.prefetch("/about")}>
        Prefetch About
      </button>
    </div>
  )
}
```

### usePathname and useSearchParams

```tsx
"use client"

import { usePathname, useSearchParams } from "next/navigation"

export function NavigationInfo() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const query = searchParams.get("q")
  const page = searchParams.get("page")

  return (
    <div>
      <p>Current path: {pathname}</p>
      <p>Search query: {query}</p>
      <p>Page: {page}</p>
    </div>
  )
}
```

### Active Link Component

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

interface NavLinkProps {
  href: string
  children: React.ReactNode
}

export function NavLink({ href, children }: NavLinkProps) {
  const pathname = usePathname()
  const isActive = pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 rounded-md text-sm font-medium",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </Link>
  )
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [app-router-fundamentals.md](app-router-fundamentals.md)
- [middleware-guide.md](middleware-guide.md)
