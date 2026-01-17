# Middleware Guide

Complete guide to Next.js middleware for authentication, redirects, and request handling.

## Table of Contents

- [Middleware Basics](#middleware-basics)
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Internationalization](#internationalization)
- [A/B Testing](#ab-testing)
- [Security Headers](#security-headers)

---

## Middleware Basics

### Basic Structure

```tsx
// middleware.ts (at root of project)
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Process the request
  console.log("Middleware running for:", request.nextUrl.pathname)

  // Continue to the route
  return NextResponse.next()
}

// Define which routes middleware runs on
export const config = {
  matcher: [
    // Match all paths except static files and api routes
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}
```

### Matcher Patterns

```tsx
export const config = {
  matcher: [
    // Exact match
    "/about",

    // Match all paths under /dashboard
    "/dashboard/:path*",

    // Match specific file types
    "/((?!.*\\..*|_next).*)",

    // Multiple specific paths
    "/profile/:id",
    "/settings/:section",

    // Complex pattern
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
}
```

### Conditional Matcher

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  // Skip static files programmatically
  if (
    request.nextUrl.pathname.startsWith("/_next") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return NextResponse.next()
  }

  // Your middleware logic
  return NextResponse.next()
}
```

---

## Authentication

### Basic Auth Check

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const protectedRoutes = ["/dashboard", "/settings", "/profile"]
const authRoutes = ["/login", "/register"]

export function middleware(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value
  const { pathname } = request.nextUrl

  // Check if route is protected
  const isProtected = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Check if route is auth-only (login, register)
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )

  // Redirect unauthenticated users from protected routes
  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users from auth routes
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/profile/:path*", "/login", "/register"],
}
```

### JWT Verification

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET!)

async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get("token")?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  const payload = await verifyToken(token)

  if (!payload) {
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete("token")
    return response
  }

  // Add user info to headers for route handlers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-user-id", payload.sub as string)
  requestHeaders.set("x-user-role", payload.role as string)

  return NextResponse.next({
    request: { headers: requestHeaders },
  })
}
```

### Role-Based Access

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const roleRoutes: Record<string, string[]> = {
  admin: ["/admin", "/dashboard/admin"],
  moderator: ["/moderator", "/dashboard/moderate"],
  user: ["/dashboard", "/profile"],
}

export async function middleware(request: NextRequest) {
  const userRole = request.cookies.get("role")?.value || "guest"
  const { pathname } = request.nextUrl

  // Check admin routes
  if (pathname.startsWith("/admin") && userRole !== "admin") {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  // Check moderator routes
  if (
    pathname.startsWith("/moderator") &&
    !["admin", "moderator"].includes(userRole)
  ) {
    return NextResponse.redirect(new URL("/unauthorized", request.url))
  }

  return NextResponse.next()
}
```

---

## Rate Limiting

### Simple Rate Limiter

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// In production, use Redis or similar
const rateLimit = new Map<string, { count: number; timestamp: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 60

function getRateLimitInfo(ip: string) {
  const now = Date.now()
  const record = rateLimit.get(ip)

  if (!record || now - record.timestamp > WINDOW_MS) {
    rateLimit.set(ip, { count: 1, timestamp: now })
    return { limited: false, remaining: MAX_REQUESTS - 1 }
  }

  if (record.count >= MAX_REQUESTS) {
    return { limited: true, remaining: 0 }
  }

  record.count++
  return { limited: false, remaining: MAX_REQUESTS - record.count }
}

export function middleware(request: NextRequest) {
  // Only rate limit API routes
  if (!request.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.next()
  }

  const ip = request.ip ?? request.headers.get("x-forwarded-for") ?? "unknown"
  const { limited, remaining } = getRateLimitInfo(ip)

  if (limited) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60",
        },
      }
    )
  }

  const response = NextResponse.next()
  response.headers.set("X-RateLimit-Limit", MAX_REQUESTS.toString())
  response.headers.set("X-RateLimit-Remaining", remaining.toString())

  return response
}

export const config = {
  matcher: "/api/:path*",
}
```

---

## Internationalization

### Locale Detection

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { match } from "@formatjs/intl-localematcher"
import Negotiator from "negotiator"

const locales = ["en", "de", "fr", "es"]
const defaultLocale = "en"

function getLocale(request: NextRequest): string {
  const headers = { "accept-language": request.headers.get("accept-language") || "" }
  const languages = new Negotiator({ headers }).languages()

  try {
    return match(languages, locales, defaultLocale)
  } catch {
    return defaultLocale
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if pathname has locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameHasLocale) {
    return NextResponse.next()
  }

  // Redirect to locale path
  const locale = getLocale(request)
  const newUrl = new URL(`/${locale}${pathname}`, request.url)

  return NextResponse.redirect(newUrl)
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
```

### Cookie-Based Locale

```tsx
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check cookie for preferred locale
  const cookieLocale = request.cookies.get("NEXT_LOCALE")?.value

  // Check URL for locale
  const pathnameLocale = locales.find(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  )

  if (pathnameLocale) {
    // Set cookie if different
    if (cookieLocale !== pathnameLocale) {
      const response = NextResponse.next()
      response.cookies.set("NEXT_LOCALE", pathnameLocale)
      return response
    }
    return NextResponse.next()
  }

  // Redirect to preferred or detected locale
  const locale = cookieLocale || getLocale(request)
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url))
}
```

---

## A/B Testing

### Cookie-Based Bucketing

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const EXPERIMENT_COOKIE = "ab-bucket"

export function middleware(request: NextRequest) {
  let bucket = request.cookies.get(EXPERIMENT_COOKIE)?.value

  // Assign bucket if not set
  if (!bucket) {
    bucket = Math.random() < 0.5 ? "control" : "variant"
  }

  // Rewrite to experiment variant
  if (request.nextUrl.pathname === "/pricing") {
    const url = request.nextUrl.clone()
    url.pathname = `/pricing/${bucket}`

    const response = NextResponse.rewrite(url)
    response.cookies.set(EXPERIMENT_COOKIE, bucket, {
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: "/pricing",
}
```

### Feature Flags

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const featureFlags = {
  newDashboard: 0.2, // 20% of users
  betaFeatures: 0.1, // 10% of users
}

export function middleware(request: NextRequest) {
  const userId = request.cookies.get("user-id")?.value || crypto.randomUUID()
  const response = NextResponse.next()

  // Generate consistent flags per user
  const userHash = hashString(userId)

  const flags: Record<string, boolean> = {}
  for (const [flag, percentage] of Object.entries(featureFlags)) {
    const flagHash = hashString(`${userId}-${flag}`)
    flags[flag] = (flagHash % 100) / 100 < percentage
  }

  // Pass flags to the app via headers
  response.headers.set("x-feature-flags", JSON.stringify(flags))

  // Set user cookie if not exists
  if (!request.cookies.get("user-id")) {
    response.cookies.set("user-id", userId)
  }

  return response
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}
```

---

## Security Headers

### Comprehensive Security Headers

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Content Security Policy
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;"
  )

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY")

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff")

  // Referrer policy
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")

  // Permissions policy
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  )

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    )
  }

  return response
}
```

### CORS for API Routes

```tsx
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const allowedOrigins = ["https://example.com", "https://app.example.com"]

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || ""
  const isAllowed = allowedOrigins.includes(origin)

  // Handle preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": isAllowed ? origin : "",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    })
  }

  const response = NextResponse.next()

  if (isAllowed) {
    response.headers.set("Access-Control-Allow-Origin", origin)
    response.headers.set("Access-Control-Allow-Credentials", "true")
  }

  return response
}

export const config = {
  matcher: "/api/:path*",
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [routing-patterns.md](routing-patterns.md)
- [api-routes.md](api-routes.md)
