# Auth.js v5 Advanced Setup

## Database Adapters

### Prisma Adapter

```typescript
// auth.ts
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // ...
});
```

```prisma
// prisma/schema.prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  role          String    @default("user")
  accounts      Account[]
  sessions      Session[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}
```

### Drizzle Adapter

```typescript
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';

export const { handlers, auth } = NextAuth({
  adapter: DrizzleAdapter(db),
  // ...
});
```

## Callbacks

```typescript
export const { handlers, auth } = NextAuth({
  callbacks: {
    // Called when JWT is created or updated
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign in
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      // Handle update trigger from useSession().update()
      if (trigger === 'update') {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id },
        });
        if (dbUser) {
          token.name = dbUser.name;
          token.role = dbUser.role;
        }
      }

      return token;
    },

    // Called whenever session is checked
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },

    // Called on sign in
    async signIn({ user, account, profile }) {
      // Block sign in for banned users
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email! },
      });

      if (dbUser?.banned) {
        return false; // Reject sign in
      }

      return true; // Allow sign in
    },

    // Called on redirect
    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allow same-origin URLs
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
});
```

## Events

```typescript
export const { handlers, auth } = NextAuth({
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      if (isNewUser) {
        // Send welcome email
        await sendWelcomeEmail(user.email!);
      }

      // Log sign in
      await prisma.auditLog.create({
        data: {
          action: 'SIGN_IN',
          userId: user.id,
          metadata: { provider: account?.provider },
        },
      });
    },

    async signOut({ token }) {
      await prisma.auditLog.create({
        data: {
          action: 'SIGN_OUT',
          userId: token.id as string,
        },
      });
    },

    async createUser({ user }) {
      // Initialize user settings
      await prisma.userSettings.create({
        data: { userId: user.id },
      });
    },

    async linkAccount({ user, account }) {
      // Account linked (OAuth connected)
      console.log(`${account.provider} linked for ${user.email}`);
    },
  },
});
```

## Custom Pages

```typescript
export const { handlers, auth } = NextAuth({
  pages: {
    signIn: '/login',
    signOut: '/logout',
    error: '/auth/error',
    verifyRequest: '/auth/verify',
    newUser: '/onboarding',
  },
});

// app/login/page.tsx
import { signIn, providerMap } from '@/auth';

export default function LoginPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string; error?: string };
}) {
  return (
    <div>
      {searchParams.error && (
        <div className="error">
          {searchParams.error === 'CredentialsSignin'
            ? 'Invalid credentials'
            : 'An error occurred'}
        </div>
      )}

      <form
        action={async (formData) => {
          'use server';
          await signIn('credentials', {
            email: formData.get('email'),
            password: formData.get('password'),
            redirectTo: searchParams.callbackUrl ?? '/dashboard',
          });
        }}
      >
        <input name="email" type="email" required />
        <input name="password" type="password" required />
        <button type="submit">Sign in</button>
      </form>

      <div className="divider">Or continue with</div>

      {Object.values(providerMap).map((provider) => (
        <form
          key={provider.id}
          action={async () => {
            'use server';
            await signIn(provider.id, {
              redirectTo: searchParams.callbackUrl ?? '/dashboard',
            });
          }}
        >
          <button type="submit">
            Sign in with {provider.name}
          </button>
        </form>
      ))}
    </div>
  );
}
```

## Email Verification

```typescript
import Resend from 'next-auth/providers/resend';

export const { handlers, auth } = NextAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: 'noreply@yourdomain.com',
    }),
  ],
  // ...
});
```

## Refresh Token Rotation

```typescript
async jwt({ token, account }) {
  if (account) {
    return {
      ...token,
      accessToken: account.access_token,
      refreshToken: account.refresh_token,
      expiresAt: account.expires_at,
    };
  }

  // Return previous token if not expired
  if (Date.now() < (token.expiresAt as number) * 1000) {
    return token;
  }

  // Refresh the token
  try {
    const response = await fetch('https://oauth.provider.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken as string,
        client_id: process.env.CLIENT_ID!,
        client_secret: process.env.CLIENT_SECRET!,
      }),
    });

    const tokens = await response.json();

    return {
      ...token,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? token.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000 + tokens.expires_in),
    };
  } catch {
    return { ...token, error: 'RefreshTokenError' };
  }
}
```
