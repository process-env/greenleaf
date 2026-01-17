---
name: email-patterns
description: Transactional email patterns with Resend and React Email for building and sending beautiful, responsive emails in Next.js applications.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  resend: "4.x"
  react-email: "3.x"
---

# Email Patterns

> **Updated 2026-01-11:** Resend v4, React Email v3.

## Purpose

Complete guide for building and sending transactional emails using Resend and React Email. Covers email templates, sending patterns, and common email workflows.

## When to Use This Skill

Automatically activates when working on:
- Building email templates
- Sending transactional emails
- Password reset emails
- Welcome emails
- Notification emails

---

## Quick Start

### Installation

```bash
npm install resend @react-email/components react-email
```

### Environment Variables

```env
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

### Resend Client

```typescript
// lib/resend.ts
import { Resend } from 'resend';

export const resend = new Resend(process.env.RESEND_API_KEY);
```

### Project Structure

```
src/
├── emails/
│   ├── welcome.tsx
│   ├── password-reset.tsx
│   ├── invoice.tsx
│   └── components/
│       ├── layout.tsx
│       ├── button.tsx
│       └── footer.tsx
└── lib/
    └── resend.ts
```

---

## Email Templates

### Base Layout

```tsx
// emails/components/layout.tsx
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Tailwind,
} from '@react-email/components';

interface LayoutProps {
  preview: string;
  children: React.ReactNode;
}

export function Layout({ preview, children }: LayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded-lg bg-white p-8 shadow-lg">
            {children}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Welcome Email

```tsx
// emails/welcome.tsx
import {
  Button,
  Heading,
  Hr,
  Img,
  Link,
  Section,
  Text,
} from '@react-email/components';
import { Layout } from './components/layout';

interface WelcomeEmailProps {
  name: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ name, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Layout preview={`Welcome to our platform, ${name}!`}>
      <Img
        src="https://yourdomain.com/logo.png"
        alt="Logo"
        width={150}
        height={40}
        className="mx-auto"
      />

      <Heading className="text-2xl font-bold text-gray-900 text-center mt-8">
        Welcome, {name}!
      </Heading>

      <Text className="text-gray-600 mt-4">
        We're excited to have you on board. Your account has been created
        and you can now access all our features.
      </Text>

      <Section className="text-center mt-8">
        <Button
          href={dashboardUrl}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Go to Dashboard
        </Button>
      </Section>

      <Hr className="my-8 border-gray-200" />

      <Text className="text-gray-500 text-sm text-center">
        If you didn't create this account, please{' '}
        <Link href="mailto:support@yourdomain.com" className="text-blue-600">
          contact support
        </Link>
        .
      </Text>
    </Layout>
  );
}

export default WelcomeEmail;
```

### Password Reset Email

```tsx
// emails/password-reset.tsx
import { Button, Heading, Text, Section } from '@react-email/components';
import { Layout } from './components/layout';

interface PasswordResetProps {
  resetUrl: string;
  expiresIn: string;
}

export function PasswordResetEmail({ resetUrl, expiresIn }: PasswordResetProps) {
  return (
    <Layout preview="Reset your password">
      <Heading className="text-2xl font-bold text-gray-900">
        Reset Your Password
      </Heading>

      <Text className="text-gray-600 mt-4">
        We received a request to reset your password. Click the button
        below to choose a new password.
      </Text>

      <Section className="text-center my-8">
        <Button
          href={resetUrl}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium"
        >
          Reset Password
        </Button>
      </Section>

      <Text className="text-gray-500 text-sm">
        This link will expire in {expiresIn}. If you didn't request a
        password reset, you can safely ignore this email.
      </Text>
    </Layout>
  );
}

export default PasswordResetEmail;
```

---

## Sending Emails

### Basic Send

```typescript
// lib/email.ts
import { resend } from './resend';
import WelcomeEmail from '@/emails/welcome';

export async function sendWelcomeEmail(email: string, name: string) {
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: `Welcome to Our Platform, ${name}!`,
    react: WelcomeEmail({ name, dashboardUrl: `${process.env.NEXT_PUBLIC_URL}/dashboard` }),
  });

  if (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }

  return data;
}
```

### With API Route

```typescript
// app/api/email/welcome/route.ts
import { sendWelcomeEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { email, name } = await req.json();

  try {
    await sendWelcomeEmail(email, name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
```

### Batch Sending

```typescript
import { resend } from '@/lib/resend';

const emails = users.map((user) => ({
  from: process.env.EMAIL_FROM!,
  to: user.email,
  subject: 'Weekly Digest',
  react: DigestEmail({ user }),
}));

// Send up to 100 emails at once
const { data, error } = await resend.batch.send(emails);
```

### With Attachments

```typescript
await resend.emails.send({
  from: process.env.EMAIL_FROM!,
  to: email,
  subject: 'Your Invoice',
  react: InvoiceEmail({ invoice }),
  attachments: [
    {
      filename: `invoice-${invoice.id}.pdf`,
      content: pdfBuffer,
    },
  ],
});
```

---

## Preview and Testing

### Email Dev Server

```json
// package.json
{
  "scripts": {
    "email:dev": "email dev --dir src/emails --port 3001"
  }
}
```

```bash
npm run email:dev
# Opens http://localhost:3001 with email previews
```

### Export to HTML

```typescript
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome';

const html = await render(WelcomeEmail({ name: 'John', dashboardUrl: '...' }));
```

---

## Common Patterns

### Email Verification

```typescript
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';

export async function sendVerificationEmail(email: string, userId: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  const verifyUrl = `${process.env.NEXT_PUBLIC_URL}/verify?token=${token}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: 'Verify your email',
    react: VerificationEmail({ verifyUrl }),
  });
}
```

### Rate Limiting Emails

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 emails per hour
});

export async function sendEmailWithRateLimit(userId: string, email: string) {
  const { success } = await ratelimit.limit(`email:${userId}`);

  if (!success) {
    throw new Error('Too many emails. Please try again later.');
  }

  await sendEmail(email);
}
```

---

## Gotchas & Real-World Warnings

### Email Clients Are Chaos

**Your beautiful template will break.** Email clients render HTML like it's 2005:

| Client | Gotchas |
|--------|---------|
| Outlook | Uses Word's rendering engine. Flexbox? No. CSS Grid? No. |
| Gmail | Strips `<style>` blocks in non-GSuite accounts |
| Apple Mail | Relatively modern, but dark mode inverts colors unpredictably |
| Yahoo | Random spacing issues, image blocking |

**React Email helps but isn't magic.** Test in actual email clients, not just the preview server:
- [Litmus](https://litmus.com) or [Email on Acid](https://emailonacid.com) for multi-client testing
- Send test emails to real Gmail, Outlook, Yahoo accounts

**Images get blocked by default.** Don't rely on images for critical information. Many users never enable image loading.

### Deliverability Is Hard

**Emails going to spam is YOUR problem, not Resend's:**

```
Your perfectly coded email → Resend sends it → Spam folder
```

**SPF, DKIM, DMARC must be configured.** Resend docs cover this, but you need DNS access:

```
// Required DNS records (example)
TXT  _dmarc.yourdomain.com  "v=DMARC1; p=none"
TXT  yourdomain.com         "v=spf1 include:resend.com ~all"
CNAME resend._domainkey.yourdomain.com  [from Resend dashboard]
```

**Warm up new sending domains.** Sending 10,000 emails on day 1 from a new domain = spam folder. Start with dozens, ramp up over weeks.

**Monitor your reputation:**
- Resend dashboard shows bounces and complaints
- High bounce rate (>5%) damages your sender reputation
- Complaints (spam reports) are worse than bounces

### Production Gotchas

**Don't send emails synchronously:**

```typescript
// DANGER: User waits for email to send before seeing response
export async function POST(req) {
  await createUser(data);
  await sendWelcomeEmail(email); // If Resend is slow, request times out
  return NextResponse.json({ success: true });
}

// BETTER: Queue the email
export async function POST(req) {
  await createUser(data);
  await emailQueue.add('welcome', { email, name }); // Returns immediately
  return NextResponse.json({ success: true });
}
```

**Resend has rate limits:**
- Free tier: 100 emails/day, 3,000/month
- Burst limits apply even on paid plans
- Batch endpoint has its own limits (100 emails per request)

**Attachments have size limits.** 40MB total per email. Large PDFs need different solutions (link to download instead).

### Testing Is Tricky

**Don't email real users from development:**

```typescript
// DANGER: Oops, emailed 500 production users from localhost
const users = await prisma.user.findMany();
for (const user of users) {
  await sendNewsletter(user.email);
}

// SAFER: Environment checks
if (process.env.NODE_ENV !== 'production') {
  console.log('Would send to:', email);
  return;
}
```

**Preview server ≠ real rendering.** The React Email preview uses a modern browser. Outlook uses Word. Test both.

### What These Patterns Don't Tell You

1. **Unsubscribe handling** - CAN-SPAM requires unsubscribe links in marketing emails
2. **Bounce processing** - Remove bounced emails from your list or face deliverability issues
3. **Complaint handling** - Resend webhooks can notify you of spam reports
4. **Transactional vs marketing** - Different legal requirements, often need separate sending domains
5. **Internationalization** - Right-to-left languages, Unicode in subject lines, timezone handling
6. **Email verification before sending** - Don't send to unverified addresses; they might be typos or spam traps

---

## Anti-Patterns to Avoid

- Sending emails synchronously in request handlers
- Not using templates for consistent branding
- Hardcoding email addresses
- Not handling send failures gracefully
- Sending too many emails (rate limiting)

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Build templates | [react-email-components.md](resources/react-email-components.md) |
| Send emails | [resend-integration.md](resources/resend-integration.md) |
| Common templates | [email-templates.md](resources/email-templates.md) |
| Preview/testing | [testing-emails.md](resources/testing-emails.md) |

---

## Resource Files

### [react-email-components.md](resources/react-email-components.md)
Components: Html, Body, Container, Button, Text, Img, etc.

### [resend-integration.md](resources/resend-integration.md)
Client setup, sending, batch, attachments, webhooks

### [email-templates.md](resources/email-templates.md)
Welcome, password reset, invoice, notifications

### [testing-emails.md](resources/testing-emails.md)
Dev server, preview, unit testing, render to HTML

---

## External Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email](https://react.email)
- [React Email Components](https://react.email/docs/components)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 4 resource files
