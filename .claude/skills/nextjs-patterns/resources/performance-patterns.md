# Performance Patterns

Optimization strategies for Next.js applications.

## Table of Contents

- [Image Optimization](#image-optimization)
- [Font Optimization](#font-optimization)
- [Script Loading](#script-loading)
- [Code Splitting](#code-splitting)
- [Caching Strategies](#caching-strategies)
- [Core Web Vitals](#core-web-vitals)

---

## Image Optimization

### next/image Component

```tsx
import Image from "next/image"

// Basic usage
<Image
  src="/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // Load immediately (above fold)
/>

// Fill container
<div className="relative h-64 w-full">
  <Image
    src="/background.jpg"
    alt="Background"
    fill
    className="object-cover"
  />
</div>

// Responsive sizes
<Image
  src="/product.jpg"
  alt="Product"
  width={800}
  height={600}
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

### Remote Images

```tsx
// next.config.js
module.exports = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "cdn.example.com",
        pathname: "/images/**",
      },
    ],
    // Or use domains (deprecated but simpler)
    domains: ["images.unsplash.com"],
  },
}
```

```tsx
// Usage with remote images
<Image
  src="https://images.unsplash.com/photo-123"
  alt="Remote image"
  width={800}
  height={600}
  loading="lazy"
/>
```

### Blur Placeholder

```tsx
// Static import for automatic blur
import heroImage from "@/public/hero.jpg"

<Image
  src={heroImage}
  alt="Hero"
  placeholder="blur"
/>

// Dynamic blur placeholder
<Image
  src={dynamicUrl}
  alt="Dynamic"
  width={800}
  height={600}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,/9j/4AAQ..."
/>
```

### Image Loading Component

```tsx
"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width: number
  height: number
  className?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className={cn("overflow-hidden", className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className={cn(
          "duration-700 ease-in-out",
          isLoading
            ? "scale-110 blur-2xl grayscale"
            : "scale-100 blur-0 grayscale-0"
        )}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}
```

---

## Font Optimization

### Google Fonts

```tsx
// app/layout.tsx
import { Inter, Roboto_Mono } from "next/font/google"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
})

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${robotoMono.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
```

```css
/* tailwind.config.js */
theme: {
  extend: {
    fontFamily: {
      sans: ["var(--font-inter)"],
      mono: ["var(--font-roboto-mono)"],
    },
  },
}
```

### Local Fonts

```tsx
import localFont from "next/font/local"

const customFont = localFont({
  src: [
    {
      path: "../fonts/Custom-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/Custom-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-custom",
  display: "swap",
})
```

### Font Loading Strategies

```tsx
// Preload critical fonts
const font = Inter({
  subsets: ["latin"],
  display: "swap", // Show fallback immediately
  preload: true,
  adjustFontFallback: true, // Reduce layout shift
})

// Optional: Only load specific weights
const lightFont = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
})
```

---

## Script Loading

### next/script Component

```tsx
import Script from "next/script"

// After page interactive (default)
<Script src="https://example.com/script.js" />

// Before page interactive
<Script src="https://example.com/critical.js" strategy="beforeInteractive" />

// After page load
<Script src="https://example.com/analytics.js" strategy="lazyOnload" />

// Inline script
<Script id="structured-data" type="application/ld+json">
  {JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Example",
  })}
</Script>
```

### Third-party Scripts

```tsx
// app/layout.tsx
import Script from "next/script"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=GA_ID"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'GA_ID');
          `}
        </Script>
      </body>
    </html>
  )
}
```

### Web Worker Loading

```tsx
"use client"

import Script from "next/script"

export function WebWorkerLoader() {
  return (
    <Script
      src="/workers/heavy-computation.js"
      strategy="worker"
    />
  )
}
```

---

## Code Splitting

### Dynamic Imports

```tsx
import dynamic from "next/dynamic"

// Basic dynamic import
const HeavyComponent = dynamic(() => import("@/components/heavy-component"))

// With loading state
const Chart = dynamic(() => import("@/components/chart"), {
  loading: () => <p>Loading chart...</p>,
})

// No SSR (client-only)
const MapComponent = dynamic(() => import("@/components/map"), {
  ssr: false,
})

// Named export
const Button = dynamic(() =>
  import("@/components/buttons").then((mod) => mod.PrimaryButton)
)
```

### Route-based Code Splitting

```tsx
// Automatic with App Router
// Each page.tsx is automatically code-split

// Manual lazy loading in components
"use client"

import { lazy, Suspense } from "react"

const LazyComponent = lazy(() => import("./lazy-component"))

export function ParentComponent() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  )
}
```

### Bundle Analysis

```bash
# Install analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
})

module.exports = withBundleAnalyzer({
  // config
})

# Run analysis
ANALYZE=true npm run build
```

---

## Caching Strategies

### Fetch Caching

```tsx
// Static (cached at build time)
const data = await fetch("https://api.example.com/static")

// Revalidate periodically
const data = await fetch("https://api.example.com/data", {
  next: { revalidate: 3600 }, // 1 hour
})

// Always fresh
const data = await fetch("https://api.example.com/realtime", {
  cache: "no-store",
})

// Tag for on-demand revalidation
const data = await fetch("https://api.example.com/posts", {
  next: { tags: ["posts"] },
})
```

### unstable_cache for Non-fetch

```tsx
import { unstable_cache } from "next/cache"
import { db } from "@/lib/db"

const getCachedPosts = unstable_cache(
  async () => {
    return db.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    })
  },
  ["posts-list"], // Cache key
  {
    revalidate: 60, // Seconds
    tags: ["posts"], // For revalidateTag
  }
)

export default async function PostsPage() {
  const posts = await getCachedPosts()
  return <PostList posts={posts} />
}
```

### React cache()

```tsx
import { cache } from "react"
import { db } from "@/lib/db"

// Dedupe requests within same render
export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } })
})

// Multiple components can call this
// Only one database query is made
async function UserHeader({ userId }: { userId: string }) {
  const user = await getUser(userId)
  return <h1>{user?.name}</h1>
}

async function UserStats({ userId }: { userId: string }) {
  const user = await getUser(userId) // Same request, cached
  return <div>{user?.posts.length} posts</div>
}
```

---

## Core Web Vitals

### Largest Contentful Paint (LCP)

```tsx
// Prioritize above-fold images
<Image
  src="/hero.jpg"
  alt="Hero"
  priority // Preloads the image
  width={1200}
  height={600}
/>

// Preload critical resources
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <link
          rel="preload"
          href="/fonts/custom.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

### Cumulative Layout Shift (CLS)

```tsx
// Always specify dimensions
<Image
  src="/product.jpg"
  alt="Product"
  width={400}
  height={300}
/>

// Reserve space for dynamic content
<div className="min-h-[200px]">
  <Suspense fallback={<Skeleton className="h-[200px]" />}>
    <DynamicContent />
  </Suspense>
</div>

// Use font display swap
const font = Inter({
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
})
```

### First Input Delay (FID) / Interaction to Next Paint (INP)

```tsx
// Defer non-critical JavaScript
<Script
  src="/analytics.js"
  strategy="lazyOnload"
/>

// Use React transitions for heavy updates
"use client"

import { useTransition } from "react"

function SearchResults() {
  const [isPending, startTransition] = useTransition()

  function handleSearch(query: string) {
    startTransition(() => {
      // Heavy state update
      setResults(filterResults(query))
    })
  }

  return (
    <div className={isPending ? "opacity-50" : ""}>
      {/* results */}
    </div>
  )
}
```

### Performance Monitoring

```tsx
// app/layout.tsx
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/react"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}
```

### Web Vitals Reporting

```tsx
// app/layout.tsx
"use client"

import { useReportWebVitals } from "next/web-vitals"

export function WebVitals() {
  useReportWebVitals((metric) => {
    console.log(metric)

    // Send to analytics
    fetch("/api/vitals", {
      method: "POST",
      body: JSON.stringify(metric),
    })
  })

  return null
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [rendering-strategies.md](rendering-strategies.md)
