# Session Management

## Session Strategies

### JWT Sessions (Stateless)

```typescript
// auth.ts
export const { handlers, auth } = NextAuth({
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // Update every 24 hours
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
});
```

**Pros:**
- No database lookups per request
- Scales horizontally
- Works without database

**Cons:**
- Can't revoke immediately
- Token size grows with data
- Sensitive data exposure risk

### Database Sessions (Stateful)

```typescript
export const { handlers, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'database',
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
});
```

**Pros:**
- Immediate revocation
- Full session control
- Smaller cookies

**Cons:**
- Database lookup per request
- Requires database setup
- Harder to scale

## Token Refresh

### Auto-Refresh Pattern

```typescript
// auth.ts
callbacks: {
  async jwt({ token, account, user }) {
    // Initial sign in
    if (account && user) {
      return {
        ...token,
        accessToken: account.access_token,
        refreshToken: account.refresh_token,
        expiresAt: account.expires_at! * 1000,
        user,
      };
    }

    // Return token if not expired
    if (Date.now() < (token.expiresAt as number)) {
      return token;
    }

    // Refresh expired token
    return refreshAccessToken(token);
  },
},

async function refreshAccessToken(token: JWT): Promise<JWT> {
  try {
    const response = await fetch('https://oauth.provider.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) throw tokens;

    return {
      ...token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
      expiresAt: Date.now() + tokens.expires_in * 1000,
    };
  } catch (error) {
    console.error('Error refreshing token', error);
    return { ...token, error: 'RefreshTokenError' };
  }
}
```

### Handle Refresh Error

```typescript
'use client';

import { useSession, signIn } from 'next-auth/react';
import { useEffect } from 'react';

export function TokenRefreshHandler() {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === 'RefreshTokenError') {
      signIn(); // Force re-authentication
    }
  }, [session]);

  return null;
}
```

## Multi-Device Sessions

### Track Active Sessions

```typescript
// prisma/schema.prisma
model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Additional tracking
  userAgent    String?
  ipAddress    String?
  lastActive   DateTime @default(now())
  deviceName   String?
}
```

### Session Events

```typescript
// auth.ts
events: {
  async signIn({ user, account }) {
    // Record session metadata
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
      orderBy: { lastActive: 'desc' },
    });

    if (session) {
      await prisma.session.update({
        where: { id: session.id },
        data: {
          userAgent: headers().get('user-agent'),
          ipAddress: headers().get('x-forwarded-for'),
          lastActive: new Date(),
        },
      });
    }
  },
},
```

### List Active Sessions

```typescript
// app/api/sessions/route.ts
import { auth } from '@/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const sessions = await prisma.session.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      deviceName: true,
      userAgent: true,
      lastActive: true,
      ipAddress: true,
    },
    orderBy: { lastActive: 'desc' },
  });

  return Response.json(sessions);
}
```

### Revoke Session

```typescript
// app/api/sessions/[id]/route.ts
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify session belongs to user
  const targetSession = await prisma.session.findUnique({
    where: { id: params.id },
  });

  if (targetSession?.userId !== session.user.id) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  await prisma.session.delete({
    where: { id: params.id },
  });

  return Response.json({ success: true });
}
```

## Session Update

```typescript
'use client';

import { useSession } from 'next-auth/react';

export function ProfileForm() {
  const { data: session, update } = useSession();

  const handleSubmit = async (formData: FormData) => {
    const name = formData.get('name') as string;

    // Update in database
    await fetch('/api/user', {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });

    // Update session (triggers jwt callback with trigger='update')
    await update({ name });
  };

  return (
    <form action={handleSubmit}>
      <input name="name" defaultValue={session?.user?.name ?? ''} />
      <button type="submit">Update</button>
    </form>
  );
}
```

## Session Security

### Secure Cookie Settings

```typescript
// auth.ts
export const { handlers, auth } = NextAuth({
  cookies: {
    sessionToken: {
      name: `__Secure-authjs.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: true,
      },
    },
  },
});
```

### CSRF Protection

Auth.js includes CSRF protection by default. For custom forms:

```typescript
import { getCsrfToken } from 'next-auth/react';

export async function LoginForm() {
  const csrfToken = await getCsrfToken();

  return (
    <form method="post" action="/api/auth/callback/credentials">
      <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
      <input name="email" type="email" />
      <input name="password" type="password" />
      <button type="submit">Sign in</button>
    </form>
  );
}
```

### Session Validation

```typescript
// lib/validate-session.ts
export async function validateSession() {
  const session = await auth();

  if (!session?.user?.id) {
    return { valid: false, reason: 'No session' };
  }

  // Check if user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, banned: true, deletedAt: true },
  });

  if (!user || user.banned || user.deletedAt) {
    return { valid: false, reason: 'User invalid' };
  }

  return { valid: true, user: session.user };
}
```
