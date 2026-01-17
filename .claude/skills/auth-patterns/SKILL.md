---
name: auth-patterns
description: Authentication patterns for Next.js applications using Auth.js v5 and Clerk. Covers session management, protected routes, OAuth providers, and multi-device sessions.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  authjs: "5.x"
  clerk: "6.x"
---

# Authentication Patterns

> **Updated 2026-01-11:** Auth.js v5, Clerk SDK v6. Updated session strategies and middleware patterns.

## Purpose

Complete guide for implementing authentication in Next.js applications. Covers two primary approaches: Auth.js (formerly NextAuth.js) for self-hosted auth, and Clerk for managed authentication services.

## When to Use This Skill

Automatically activates when working on:
- Setting up authentication systems
- Protecting routes and API endpoints
- Implementing OAuth providers
- Managing user sessions
- Configuring middleware for auth
- Clerk or Auth.js integration

---

## Quick Start

### Auth.js vs Clerk Decision

| Factor | Auth.js | Clerk |
|--------|---------|-------|
| **Hosting** | Self-hosted | Managed service |
| **Cost** | Free | Free tier + paid |
| **Customization** | Full control | Limited UI customization |
| **Setup** | More config | Quick setup |
| **User management** | DIY | Built-in dashboard |
| **Best for** | Custom requirements | Rapid development |

### Installation

```bash
# Auth.js
npm install next-auth@beta

# Clerk
npm install @clerk/nextjs
```

---

## Auth.js v5 Setup

### Configuration File

```typescript
// auth.ts
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    Google({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.password) return null;

        const valid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const isProtected = request.nextUrl.pathname.startsWith('/dashboard');
      if (isProtected && !isLoggedIn) {
        return Response.redirect(new URL('/login', request.url));
      }
      return true;
    },
  },
});
```

### Route Handlers

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

### Middleware

```typescript
// middleware.ts
export { auth as middleware } from '@/auth';

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### Server Component Usage

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div>
      <h1>Welcome, {session.user.name}</h1>
      <p>Email: {session.user.email}</p>
    </div>
  );
}
```

### Client Component Usage

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function AuthButton() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (session) {
    return (
      <div>
        <span>{session.user?.name}</span>
        <button onClick={() => signOut()}>Sign out</button>
      </div>
    );
  }

  return <button onClick={() => signIn()}>Sign in</button>;
}
```

### Session Provider

```typescript
// app/providers.tsx
'use client';

import { SessionProvider } from 'next-auth/react';

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

See [authjs-setup.md](resources/authjs-setup.md) for advanced configuration.

---

## Clerk Setup

### Environment Variables

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

### Provider Setup

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

### Middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
```

### Server Component Usage

```typescript
// app/dashboard/page.tsx
import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect('/sign-in');
  }

  const user = await currentUser();

  return (
    <div>
      <h1>Welcome, {user?.firstName}</h1>
      <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
    </div>
  );
}
```

### Client Components

```typescript
'use client';

import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs';

export function Header() {
  return (
    <header>
      <SignedOut>
        <SignInButton />
        <SignUpButton />
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </header>
  );
}
```

### Pre-built Components

```typescript
// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignIn />
    </div>
  );
}

// app/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex justify-center items-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

See [clerk-setup.md](resources/clerk-setup.md) for webhooks and user sync.

---

## Protected Routes

### Server-Side Protection

```typescript
// lib/auth.ts
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requireRole(role: string) {
  const session = await requireAuth();
  if (session.user.role !== role) {
    redirect('/unauthorized');
  }
  return session;
}

// Usage in page
export default async function AdminPage() {
  const session = await requireRole('admin');
  return <AdminDashboard user={session.user} />;
}
```

### API Route Protection

```typescript
// app/api/protected/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({ data: 'Protected data' });
}
```

### Client-Side Guard

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <div>Loading...</div>;
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return null;
}
```

See [protected-routes.md](resources/protected-routes.md) for more patterns.

---

## Type Extensions

```typescript
// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from 'next-auth';
import { JWT, DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
  }
}
```

---

## Gotchas & Real-World Warnings

### Security Footguns

**Credentials provider is dangerous.** The example above shows password auth, but:
- You're now responsible for password hashing, reset flows, breach detection
- No 2FA unless you build it
- No brute force protection unless you add rate limiting
- One mistake = compromised user accounts

**JWT in cookies isn't automatically secure.** You need:
- `httpOnly: true` (prevents XSS reading tokens)
- `secure: true` (HTTPS only)
- `sameSite: 'lax'` or `'strict'` (CSRF protection)
- Proper `domain` settings for subdomains

```typescript
// These defaults matter - check them!
cookies: {
  sessionToken: {
    name: `__Secure-next-auth.session-token`,
    options: { httpOnly: true, sameSite: 'lax', secure: true }
  }
}
```

**Session vs JWT - understand the tradeoffs:**
- JWT: Can't revoke instantly (user is logged in until token expires)
- Database sessions: Every request hits DB (add caching)
- Credential leaks: JWT leaked = full access until expiry; session leaked = revokable

### The Patterns Hide These Problems

**OAuth state/CSRF attacks.** If you don't verify the `state` parameter, attackers can force users to log into attacker-controlled accounts. Auth.js handles this, but custom OAuth flows often miss it.

**Token refresh edge cases:**
- What happens when refresh fails mid-session?
- User has two tabs open, one refreshes, other's token is now invalid
- Mobile app backgrounded for hours, returns with expired token

**Multi-device logout doesn't work with JWT.** User changes password on phone, laptop is still logged in with old JWT until it expires.

### Clerk-Specific Gotchas

**Clerk is a black box.** Great for speed, but:
- Can't inspect session internals easily
- Webhook delays mean your DB might be out of sync
- Rate limits on free tier hit faster than expected
- Migrating away from Clerk is painful (user data, password hashes are theirs)

**Webhook reliability:**
```typescript
// DANGER: User created in Clerk, webhook fails, your DB has no user record
// Always handle: "user exists in Clerk but not in our DB"
const user = await prisma.user.findUnique({ where: { clerkId } });
if (!user) {
  // Sync from Clerk or redirect to onboarding
}
```

### Auth.js v5 Migration Gotchas

If upgrading from NextAuth v4:
- `getServerSession` → `auth()` (different import, different behavior)
- Middleware syntax completely changed
- `authorized` callback replaces `middleware.ts` for many use cases
- Edge runtime has limitations (no Prisma adapter in middleware)

### What These Patterns Don't Tell You

1. **Account linking** - User signs up with email, later tries Google with same email. Now what?
2. **Bot protection** - Auth endpoints are bot magnets. Add CAPTCHA or rate limiting.
3. **Audit logging** - Compliance often requires "who logged in when from where"
4. **Session fixation** - Regenerate session ID after login
5. **Password requirements** - These examples have none. Real apps need entropy checks.

---

## Anti-Patterns to Avoid

- Storing sensitive data in JWT claims
- Not validating session on API routes
- Hardcoding redirect URLs
- Exposing user IDs in URLs without access checks
- Not using HTTPS in production
- Storing passwords without hashing
- Not implementing rate limiting on auth endpoints

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Configure Auth.js | [authjs-setup.md](resources/authjs-setup.md) |
| Set up Clerk | [clerk-setup.md](resources/clerk-setup.md) |
| Protect routes | [protected-routes.md](resources/protected-routes.md) |
| Add OAuth providers | [providers.md](resources/providers.md) |
| Manage sessions | [session-management.md](resources/session-management.md) |

---

## Resource Files

### [authjs-setup.md](resources/authjs-setup.md)
Database adapters, callbacks, events, custom pages, email verification

### [clerk-setup.md](resources/clerk-setup.md)
Webhooks, user sync, organizations, custom flows, theming

### [protected-routes.md](resources/protected-routes.md)
Middleware patterns, role-based access, API protection

### [providers.md](resources/providers.md)
OAuth setup (Google, GitHub, etc.), credentials, magic links

### [session-management.md](resources/session-management.md)
JWT vs database sessions, token refresh, multi-device handling

---

## External Resources

- [Auth.js Documentation](https://authjs.dev/)
- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Authentication Guide](https://nextjs.org/docs/app/building-your-application/authentication)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 5 resource files
