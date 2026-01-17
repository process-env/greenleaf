# Server Components

Deep dive into React Server Components in Next.js.

## Table of Contents

- [Server Components Overview](#server-components-overview)
- [Benefits](#benefits)
- [Client Components](#client-components)
- [Composition Patterns](#composition-patterns)
- [Data Access](#data-access)
- [Third-party Libraries](#third-party-libraries)

---

## Server Components Overview

### Default Behavior

In Next.js App Router, all components are Server Components by default:

```tsx
// app/page.tsx - Server Component (no directive needed)
export default async function HomePage() {
  // Can use async/await directly
  const data = await fetchData()

  return (
    <div>
      <h1>Welcome</h1>
      <p>{data.message}</p>
    </div>
  )
}
```

### What Server Components Can Do

```tsx
// Direct database access
import { db } from "@/lib/db"

async function UserList() {
  const users = await db.user.findMany()

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  )
}
```

```tsx
// Access filesystem
import { readFile } from "fs/promises"

async function FileContent() {
  const content = await readFile("./data.txt", "utf-8")
  return <pre>{content}</pre>
}
```

```tsx
// Use environment variables safely
async function ConfigDisplay() {
  // Secret stays on server
  const apiKey = process.env.API_SECRET_KEY
  const data = await fetchWithKey(apiKey)

  return <div>{data.value}</div>
}
```

### What Server Components Cannot Do

```tsx
// These will error in Server Components:

// No useState
const [count, setCount] = useState(0) // Error!

// No useEffect
useEffect(() => {}, []) // Error!

// No browser APIs
localStorage.getItem("key") // Error!

// No event handlers
<button onClick={() => {}}>Click</button> // Error!
```

---

## Benefits

### Reduced Bundle Size

```tsx
// Server Component - heavy library stays on server
import { marked } from "marked" // Not sent to client
import hljs from "highlight.js" // Not sent to client

async function MarkdownRenderer({ content }: { content: string }) {
  const html = marked(content, {
    highlight: (code, lang) => hljs.highlight(code, { language: lang }).value,
  })

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
```

### Direct Backend Access

```tsx
// No API layer needed
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function Dashboard() {
  const [users, posts, comments] = await Promise.all([
    prisma.user.count(),
    prisma.post.count(),
    prisma.comment.count(),
  ])

  return (
    <div className="grid grid-cols-3 gap-4">
      <StatCard title="Users" value={users} />
      <StatCard title="Posts" value={posts} />
      <StatCard title="Comments" value={comments} />
    </div>
  )
}
```

### Automatic Code Splitting

```tsx
// Each import is automatically code-split
import { HeavyChart } from "@/components/heavy-chart"
import { ComplexTable } from "@/components/complex-table"

async function AnalyticsPage() {
  const data = await fetchAnalytics()

  return (
    <div>
      <HeavyChart data={data.chartData} />
      <ComplexTable data={data.tableData} />
    </div>
  )
}
```

---

## Client Components

### Using "use client"

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"

export function Counter() {
  const [count, setCount] = useState(0)

  return (
    <div className="flex items-center gap-4">
      <span className="text-2xl font-bold">{count}</span>
      <Button onClick={() => setCount(count + 1)}>+</Button>
      <Button onClick={() => setCount(count - 1)}>-</Button>
    </div>
  )
}
```

### When to Use Client Components

| Use Case | Example |
|----------|---------|
| State management | `useState`, `useReducer` |
| Lifecycle effects | `useEffect`, `useLayoutEffect` |
| Event handlers | `onClick`, `onChange`, `onSubmit` |
| Browser APIs | `localStorage`, `window`, `navigator` |
| Custom hooks with state | `useDebounce`, `useMediaQuery` |
| Class components | Legacy React patterns |

### Client Component Patterns

```tsx
"use client"

import { useEffect, useState } from "react"

// Local storage hook
export function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : initialValue
  })

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value])

  return [value, setValue] as const
}
```

---

## Composition Patterns

### Server Component with Client Children

```tsx
// app/dashboard/page.tsx (Server Component)
import { db } from "@/lib/db"
import { InteractiveChart } from "@/components/interactive-chart"

export default async function DashboardPage() {
  // Fetch data on server
  const data = await db.analytics.findMany()

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Pass server data to client component */}
      <InteractiveChart data={data} />
    </div>
  )
}
```

```tsx
"use client"

// components/interactive-chart.tsx
import { useState } from "react"
import { LineChart } from "recharts"

interface ChartProps {
  data: { date: string; value: number }[]
}

export function InteractiveChart({ data }: ChartProps) {
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)

  return (
    <div>
      <LineChart
        data={data}
        onClick={(e) => setSelectedPoint(e.activeTooltipIndex)}
      />
      {selectedPoint !== null && (
        <div>Selected: {data[selectedPoint].value}</div>
      )}
    </div>
  )
}
```

### Passing Server Components as Children

```tsx
// components/client-wrapper.tsx
"use client"

import { useState } from "react"

export function ClientWrapper({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
      {isOpen && children}
    </div>
  )
}
```

```tsx
// app/page.tsx (Server Component)
import { ClientWrapper } from "@/components/client-wrapper"
import { ServerContent } from "@/components/server-content"

export default function Page() {
  return (
    <ClientWrapper>
      {/* Server Component passed as children */}
      <ServerContent />
    </ClientWrapper>
  )
}
```

### The "use client" Boundary

```tsx
// components/providers.tsx
"use client"

import { ThemeProvider } from "next-themes"
import { QueryClientProvider } from "@tanstack/react-query"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

```tsx
// app/layout.tsx
import { Providers } from "@/components/providers"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html>
      <body>
        <Providers>
          {children} {/* Can still be Server Components */}
        </Providers>
      </body>
    </html>
  )
}
```

---

## Data Access

### Fetching in Server Components

```tsx
// Direct fetch - automatically deduplicated
async function ProductPage({ id }: { id: string }) {
  const product = await fetch(`https://api.example.com/products/${id}`)
    .then((res) => res.json())

  return <ProductDetails product={product} />
}
```

### Database Queries

```tsx
import { db } from "@/lib/db"

async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      posts: { take: 5 },
      followers: { select: { id: true } },
    },
  })

  if (!user) {
    notFound()
  }

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.followers.length} followers</p>
    </div>
  )
}
```

### Caching Database Queries

```tsx
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

const getCachedUser = unstable_cache(
  async (userId: string) => {
    return db.user.findUnique({ where: { id: userId } })
  },
  ["user"],
  { revalidate: 60, tags: ["user"] }
)

async function UserProfile({ userId }: { userId: string }) {
  const user = await getCachedUser(userId)
  return <div>{user?.name}</div>
}
```

---

## Third-party Libraries

### Client-only Libraries

```tsx
"use client"

// Libraries with browser dependencies
import { motion } from "framer-motion"

export function AnimatedBox() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-32 h-32 bg-blue-500"
    />
  )
}
```

### Lazy Loading Client Components

```tsx
import dynamic from "next/dynamic"

// Lazy load heavy client component
const HeavyEditor = dynamic(
  () => import("@/components/heavy-editor"),
  {
    loading: () => <p>Loading editor...</p>,
    ssr: false, // Only load on client
  }
)

export default function Page() {
  return (
    <div>
      <h1>Document</h1>
      <HeavyEditor />
    </div>
  )
}
```

### Server-only Utilities

```tsx
// lib/server-only.ts
import "server-only" // Prevents accidental client import

import { db } from "@/lib/db"

export async function getSecretData() {
  const apiKey = process.env.API_SECRET_KEY
  // This function can only be used in Server Components
  return fetch(url, { headers: { Authorization: apiKey } })
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [data-fetching.md](data-fetching.md)
- [rendering-strategies.md](rendering-strategies.md)
