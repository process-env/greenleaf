# Protected Routes Patterns

## Middleware-Based Protection

### Auth.js Middleware

```typescript
// middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Public routes
  const publicRoutes = ['/', '/login', '/register', '/about'];
  const isPublic = publicRoutes.includes(pathname);

  // Auth routes (redirect if logged in)
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(pathname);

  // Admin routes
  const isAdminRoute = pathname.startsWith('/admin');

  // API routes
  const isApiRoute = pathname.startsWith('/api');

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  if (!isPublic && !isLoggedIn) {
    const callbackUrl = encodeURIComponent(pathname);
    return NextResponse.redirect(
      new URL(`/login?callbackUrl=${callbackUrl}`, req.url)
    );
  }

  if (isAdminRoute && req.auth?.user?.role !== 'admin') {
    return NextResponse.redirect(new URL('/unauthorized', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Clerk Middleware

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
]);

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, request) => {
  const { userId, sessionClaims } = await auth();

  // Allow public routes
  if (isPublicRoute(request)) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!userId) {
    await auth.protect();
  }

  // Check admin access
  if (isAdminRoute(request)) {
    const role = sessionClaims?.metadata?.role;
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return NextResponse.next();
});
```

## Role-Based Access Control (RBAC)

### Role Definitions

```typescript
// lib/permissions.ts
export const ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const PERMISSIONS = {
  'users:read': [ROLES.ADMIN, ROLES.MODERATOR],
  'users:write': [ROLES.ADMIN],
  'users:delete': [ROLES.ADMIN],
  'posts:read': [ROLES.ADMIN, ROLES.MODERATOR, ROLES.USER],
  'posts:write': [ROLES.ADMIN, ROLES.MODERATOR, ROLES.USER],
  'posts:delete': [ROLES.ADMIN, ROLES.MODERATOR],
  'settings:manage': [ROLES.ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function hasRole(userRole: Role, requiredRoles: Role[]): boolean {
  return requiredRoles.includes(userRole);
}
```

### Server-Side Check

```typescript
// lib/auth.ts
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { hasPermission, Permission, Role } from './permissions';

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect('/login');
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  const role = session.user.role as Role;

  if (!hasPermission(role, permission)) {
    redirect('/unauthorized');
  }

  return session;
}

// Usage in page
export default async function UsersPage() {
  await requirePermission('users:read');
  const users = await getUsers();
  return <UserList users={users} />;
}
```

### Client-Side Check

```typescript
'use client';

import { useSession } from 'next-auth/react';
import { hasPermission, Permission, Role } from '@/lib/permissions';

export function usePermission(permission: Permission): boolean {
  const { data: session } = useSession();
  if (!session?.user?.role) return false;
  return hasPermission(session.user.role as Role, permission);
}

export function PermissionGate({
  permission,
  children,
  fallback = null,
}: {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const hasAccess = usePermission(permission);
  return hasAccess ? <>{children}</> : <>{fallback}</>;
}

// Usage
<PermissionGate permission="users:delete">
  <DeleteUserButton userId={user.id} />
</PermissionGate>
```

## API Route Protection

### Auth.js API Protection

```typescript
// app/api/admin/users/route.ts
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

  if (session.user.role !== 'admin') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  const users = await getUsers();
  return NextResponse.json(users);
}
```

### Reusable API Middleware

```typescript
// lib/api-auth.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

type Handler = (
  req: Request,
  context: { params: Record<string, string>; session: Session }
) => Promise<Response>;

export function withAuth(handler: Handler) {
  return async (req: Request, context: { params: Record<string, string> }) => {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handler(req, { ...context, session });
  };
}

export function withRole(role: string, handler: Handler) {
  return withAuth(async (req, context) => {
    if (context.session.user.role !== role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    return handler(req, context);
  });
}

// Usage
// app/api/admin/route.ts
import { withRole } from '@/lib/api-auth';

export const GET = withRole('admin', async (req, { session }) => {
  return NextResponse.json({ data: 'Admin only data' });
});
```

## Route Groups

```
app/
├── (public)/           # Public routes
│   ├── page.tsx        # Home
│   ├── about/
│   └── contact/
├── (auth)/             # Auth routes (redirect if logged in)
│   ├── login/
│   └── register/
├── (protected)/        # Protected routes
│   ├── layout.tsx      # Auth check in layout
│   ├── dashboard/
│   └── settings/
└── (admin)/            # Admin routes
    ├── layout.tsx      # Admin check in layout
    └── admin/
```

```typescript
// app/(protected)/layout.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  return <>{children}</>;
}
```
