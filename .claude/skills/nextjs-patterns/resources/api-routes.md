# API Routes

Complete guide to Route Handlers in Next.js App Router.

## Table of Contents

- [Route Handler Basics](#route-handler-basics)
- [Request and Response](#request-and-response)
- [Authentication](#authentication)
- [File Uploads](#file-uploads)
- [Streaming Responses](#streaming-responses)
- [Edge Runtime](#edge-runtime)

---

## Route Handler Basics

### HTTP Methods

```tsx
// app/api/posts/route.ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const posts = await db.post.findMany()
  return NextResponse.json(posts)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const post = await db.post.create({ data: body })
  return NextResponse.json(post, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const post = await db.post.update({
    where: { id: body.id },
    data: body,
  })
  return NextResponse.json(post)
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get("id")

  await db.post.delete({ where: { id } })
  return new NextResponse(null, { status: 204 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const post = await db.post.update({
    where: { id: body.id },
    data: body,
  })
  return NextResponse.json(post)
}
```

### Dynamic Route Handlers

```tsx
// app/api/users/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"

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

### Catch-all Routes

```tsx
// app/api/[...slug]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string[] } }
) {
  // /api/a/b/c -> slug: ["a", "b", "c"]
  const path = params.slug.join("/")

  return NextResponse.json({ path })
}
```

---

## Request and Response

### Request Parsing

```tsx
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // JSON body
  const json = await request.json()

  // Form data
  const formData = await request.formData()
  const name = formData.get("name")

  // Text body
  const text = await request.text()

  // Blob/ArrayBuffer
  const blob = await request.blob()
  const buffer = await request.arrayBuffer()

  // URL and search params
  const { searchParams, pathname } = new URL(request.url)
  const query = searchParams.get("q")
  const page = searchParams.get("page")

  // Headers
  const contentType = request.headers.get("content-type")
  const authorization = request.headers.get("authorization")

  // Cookies
  const token = request.cookies.get("token")?.value

  return NextResponse.json({ success: true })
}
```

### Response Helpers

```tsx
import { NextResponse } from "next/server"

export async function GET() {
  // JSON response
  return NextResponse.json({ message: "Hello" })

  // With status code
  return NextResponse.json(
    { error: "Not found" },
    { status: 404 }
  )

  // With headers
  return NextResponse.json(
    { data: "value" },
    {
      headers: {
        "Cache-Control": "max-age=3600",
        "X-Custom-Header": "value",
      },
    }
  )

  // Redirect
  return NextResponse.redirect(new URL("/login", request.url))

  // Rewrite
  return NextResponse.rewrite(new URL("/api/v2/endpoint", request.url))

  // No content
  return new NextResponse(null, { status: 204 })

  // Plain text
  return new NextResponse("Hello, World!", {
    headers: { "Content-Type": "text/plain" },
  })
}
```

### Setting Cookies

```tsx
import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(request: NextRequest) {
  // Method 1: Using response
  const response = NextResponse.json({ success: true })

  response.cookies.set("token", "abc123", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: "/",
  })

  return response
}

export async function DELETE() {
  // Method 2: Using cookies() helper
  const cookieStore = cookies()
  cookieStore.delete("token")

  return NextResponse.json({ success: true })
}
```

---

## Authentication

### JWT Authentication

```tsx
// lib/auth.ts
import { jwtVerify, SignJWT } from "jose"

const secret = new TextEncoder().encode(process.env.JWT_SECRET!)

export async function signToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch {
    return null
  }
}
```

```tsx
// app/api/auth/login/route.ts
import { NextRequest, NextResponse } from "next/server"
import { signToken } from "@/lib/auth"

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  const user = await validateCredentials(email, password)

  if (!user) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 401 }
    )
  }

  const token = await signToken({ sub: user.id, role: user.role })

  const response = NextResponse.json({ user })
  response.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })

  return response
}
```

### Protected Route Handler

```tsx
// lib/with-auth.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"

type Handler = (
  request: NextRequest,
  context: { params: Record<string, string>; user: { id: string; role: string } }
) => Promise<NextResponse>

export function withAuth(handler: Handler) {
  return async (request: NextRequest, context: { params: Record<string, string> }) => {
    const token = request.cookies.get("token")?.value

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)

    if (!payload) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 }
      )
    }

    return handler(request, {
      ...context,
      user: { id: payload.sub as string, role: payload.role as string },
    })
  }
}

// Usage
// app/api/protected/route.ts
import { withAuth } from "@/lib/with-auth"

export const GET = withAuth(async (request, { user }) => {
  // user is guaranteed to be authenticated
  const data = await getUserData(user.id)
  return NextResponse.json(data)
})
```

---

## File Uploads

### Basic File Upload

```tsx
// app/api/upload/route.ts
import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    )
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type" },
      { status: 400 }
    )
  }

  // Validate file size (5MB)
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "File too large" },
      { status: 400 }
    )
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  // Create unique filename
  const uniqueName = `${Date.now()}-${file.name}`
  const uploadDir = join(process.cwd(), "public/uploads")

  await mkdir(uploadDir, { recursive: true })
  await writeFile(join(uploadDir, uniqueName), buffer)

  return NextResponse.json({
    url: `/uploads/${uniqueName}`,
  })
}
```

### Multiple File Upload

```tsx
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const files = formData.getAll("files") as File[]

  const uploadedFiles = await Promise.all(
    files.map(async (file) => {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const uniqueName = `${Date.now()}-${file.name}`

      await writeFile(
        join(process.cwd(), "public/uploads", uniqueName),
        buffer
      )

      return { name: file.name, url: `/uploads/${uniqueName}` }
    })
  )

  return NextResponse.json({ files: uploadedFiles })
}
```

---

## Streaming Responses

### Server-Sent Events (SSE)

```tsx
// app/api/events/route.ts
export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Send event every second
      let count = 0

      const interval = setInterval(() => {
        count++
        const data = `data: ${JSON.stringify({ count, time: new Date() })}\n\n`
        controller.enqueue(encoder.encode(data))

        if (count >= 10) {
          clearInterval(interval)
          controller.close()
        }
      }, 1000)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
```

### Streaming JSON

```tsx
// app/api/stream/route.ts
export async function GET() {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const items = await fetchLargeDataset()

      for (const item of items) {
        const chunk = JSON.stringify(item) + "\n"
        controller.enqueue(encoder.encode(chunk))
        // Small delay to prevent overwhelming client
        await new Promise((r) => setTimeout(r, 10))
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
    },
  })
}
```

### AI Streaming Response

```tsx
// app/api/ai/route.ts
import { OpenAI } from "openai"

const openai = new OpenAI()

export async function POST(request: NextRequest) {
  const { prompt } = await request.json()

  const stream = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
    stream: true,
  })

  const encoder = new TextEncoder()

  const readableStream = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content || ""
        controller.enqueue(encoder.encode(text))
      }
      controller.close()
    },
  })

  return new Response(readableStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  })
}
```

---

## Edge Runtime

### Edge Route Handler

```tsx
// app/api/edge/route.ts
export const runtime = "edge"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const country = request.geo?.country || "Unknown"

  return NextResponse.json({
    message: `Hello from the edge!`,
    country,
    region: request.geo?.region,
    city: request.geo?.city,
  })
}
```

### Edge vs Node.js Runtime

```tsx
// Edge runtime (faster cold starts, limited APIs)
export const runtime = "edge"

// Node.js runtime (full Node.js APIs)
export const runtime = "nodejs"

// Edge limitations:
// - No file system access
// - No native Node.js modules
// - 4MB response size limit
// - Limited execution time
```

### Geolocation

```tsx
// app/api/location/route.ts
export const runtime = "edge"

export async function GET(request: NextRequest) {
  const geo = request.geo

  return NextResponse.json({
    country: geo?.country,
    region: geo?.region,
    city: geo?.city,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
  })
}
```

---

## Route Handler Configuration

### Caching

```tsx
// Static route (cached)
export const dynamic = "force-static"

// Dynamic route (never cached)
export const dynamic = "force-dynamic"

// Revalidate every 60 seconds
export const revalidate = 60

export async function GET() {
  const data = await fetchData()
  return NextResponse.json(data)
}
```

### CORS

```tsx
// app/api/cors/route.ts
const allowedOrigins = ["https://example.com"]

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin || "")
      ? origin!
      : allowedOrigins[0],
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  }
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin")
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  })
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin")
  const data = await fetchData()

  return NextResponse.json(data, {
    headers: corsHeaders(origin),
  })
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [middleware-guide.md](middleware-guide.md)
- [server-actions.md](server-actions.md)
