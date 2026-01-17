# Clerk Advanced Setup

## Webhooks for User Sync

```typescript
// app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Missing CLERK_WEBHOOK_SECRET');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  switch (evt.type) {
    case 'user.created':
      await prisma.user.create({
        data: {
          clerkId: evt.data.id,
          email: evt.data.email_addresses[0]?.email_address,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        },
      });
      break;

    case 'user.updated':
      await prisma.user.update({
        where: { clerkId: evt.data.id },
        data: {
          email: evt.data.email_addresses[0]?.email_address,
          firstName: evt.data.first_name,
          lastName: evt.data.last_name,
          imageUrl: evt.data.image_url,
        },
      });
      break;

    case 'user.deleted':
      await prisma.user.delete({
        where: { clerkId: evt.data.id },
      });
      break;
  }

  return new Response('Webhook processed', { status: 200 });
}
```

## Organizations

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher(['/']);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }

  // Protect organization routes
  if (request.nextUrl.pathname.startsWith('/org/')) {
    await auth.protect({
      unauthenticatedUrl: '/sign-in',
      unauthorizedUrl: '/no-access',
    });
  }
});
```

```typescript
// app/org/[orgId]/page.tsx
import { auth } from '@clerk/nextjs/server';

export default async function OrgPage({
  params,
}: {
  params: { orgId: string };
}) {
  const { orgId, orgRole, orgSlug } = await auth();

  if (orgId !== params.orgId) {
    return <div>Access denied</div>;
  }

  return (
    <div>
      <h1>Organization: {orgSlug}</h1>
      <p>Your role: {orgRole}</p>
    </div>
  );
}
```

## Custom Sign-in Flow

```typescript
'use client';

import { useSignIn } from '@clerk/nextjs';
import { useState } from 'react';

export function CustomSignIn() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isLoaded) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId });
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.message || 'Sign in failed');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="error">{error}</div>}
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />
      <button type="submit">Sign In</button>
    </form>
  );
}
```

## Theming

```typescript
// app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: '#3b82f6',
          colorBackground: '#1f2937',
          colorText: '#f9fafb',
        },
        elements: {
          card: 'bg-gray-800 border border-gray-700',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-400',
          socialButtonsBlockButton: 'bg-gray-700 hover:bg-gray-600',
          formButtonPrimary: 'bg-blue-500 hover:bg-blue-600',
          footerActionLink: 'text-blue-400 hover:text-blue-300',
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
```

## API Route with Clerk

```typescript
// app/api/user/route.ts
import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
  });

  return NextResponse.json(user);
}
```

## Session Claims

```typescript
// middleware.ts
import { clerkMiddleware } from '@clerk/nextjs/server';

export default clerkMiddleware(async (auth) => {
  const { sessionClaims } = await auth();

  // Access custom claims set via Clerk Dashboard or Backend API
  const role = sessionClaims?.metadata?.role;
  const permissions = sessionClaims?.metadata?.permissions;
});
```

## Multi-Session Support

```typescript
'use client';

import { useAuth, useClerk } from '@clerk/nextjs';

export function SessionManager() {
  const { sessionId } = useAuth();
  const { client, setActive } = useClerk();

  const sessions = client.sessions;

  return (
    <div>
      <h3>Active Sessions</h3>
      {sessions.map((session) => (
        <div key={session.id}>
          <span>{session.user?.emailAddresses[0]?.emailAddress}</span>
          {session.id === sessionId ? (
            <span>(current)</span>
          ) : (
            <button onClick={() => setActive({ session: session.id })}>
              Switch
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
```
