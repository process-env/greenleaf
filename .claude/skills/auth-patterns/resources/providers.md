# OAuth Providers Setup

## Google OAuth

```typescript
// auth.ts
import Google from 'next-auth/providers/google';

export const { handlers, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
});
```

### Google Cloud Setup
1. Go to Google Cloud Console
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://yourdomain.com/api/auth/callback/google`

## GitHub OAuth

```typescript
import GitHub from 'next-auth/providers/github';

export const { handlers, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          scope: 'read:user user:email',
        },
      },
    }),
  ],
});
```

### GitHub Setup
1. Go to GitHub Settings > Developer Settings > OAuth Apps
2. Add callback URL: `https://yourdomain.com/api/auth/callback/github`

## Discord OAuth

```typescript
import Discord from 'next-auth/providers/discord';

export const { handlers, auth } = NextAuth({
  providers: [
    Discord({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email guilds',
        },
      },
    }),
  ],
});
```

## Microsoft/Azure AD

```typescript
import AzureAD from 'next-auth/providers/azure-ad';

export const { handlers, auth } = NextAuth({
  providers: [
    AzureAD({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
    }),
  ],
});
```

## Credentials Provider

```typescript
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          throw new Error('Invalid input');
        }

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.password) {
          throw new Error('Invalid credentials');
        }

        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
});
```

## Magic Link (Email)

```typescript
import Resend from 'next-auth/providers/resend';

export const { handlers, auth } = NextAuth({
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: 'noreply@yourdomain.com',
      // Custom email template
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const { host } = new URL(url);
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: provider.from,
            to: identifier,
            subject: `Sign in to ${host}`,
            html: `
              <body>
                <h1>Sign in to ${host}</h1>
                <p>Click the link below to sign in:</p>
                <a href="${url}">Sign in</a>
                <p>If you didn't request this, ignore this email.</p>
              </body>
            `,
          }),
        });
      },
    }),
  ],
});
```

## Nodemailer Provider

```typescript
import Nodemailer from 'next-auth/providers/nodemailer';

export const { handlers, auth } = NextAuth({
  providers: [
    Nodemailer({
      server: {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
      from: process.env.EMAIL_FROM,
    }),
  ],
});
```

## Multiple Providers

```typescript
export const { handlers, auth, signIn } = NextAuth({
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
      // ... credentials config
    }),
  ],
  callbacks: {
    async signIn({ account }) {
      // Allow OAuth without email verification
      if (account?.provider !== 'credentials') {
        return true;
      }
      // Require email verification for credentials
      const user = await prisma.user.findUnique({
        where: { email: user.email },
      });
      return !!user?.emailVerified;
    },
  },
});
```

## Provider Map for UI

```typescript
// auth.ts
import type { BuiltInProviderType } from 'next-auth/providers';

export const providerMap = {
  github: { id: 'github', name: 'GitHub', icon: 'github' },
  google: { id: 'google', name: 'Google', icon: 'google' },
  discord: { id: 'discord', name: 'Discord', icon: 'discord' },
} satisfies Record<string, { id: string; name: string; icon: string }>;

// Usage in login page
{Object.values(providerMap).map((provider) => (
  <form
    key={provider.id}
    action={async () => {
      'use server';
      await signIn(provider.id);
    }}
  >
    <button type="submit">
      <Icon name={provider.icon} />
      Continue with {provider.name}
    </button>
  </form>
))}
```
