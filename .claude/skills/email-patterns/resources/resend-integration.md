# Resend Integration

## Client Setup

```typescript
// lib/resend.ts
import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required');
}

export const resend = new Resend(process.env.RESEND_API_KEY);
```

## Send Email

### Basic Send

```typescript
import { resend } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';

const { data, error } = await resend.emails.send({
  from: 'Acme <noreply@acme.com>',
  to: ['user@example.com'],
  subject: 'Welcome to Acme',
  react: WelcomeEmail({ userName: 'John' }),
});

if (error) {
  console.error('Failed to send email:', error);
  throw new Error('Email failed');
}

console.log('Email sent:', data?.id);
```

### Multiple Recipients

```typescript
await resend.emails.send({
  from: 'Team <team@acme.com>',
  to: ['user1@example.com', 'user2@example.com'],
  cc: ['manager@acme.com'],
  bcc: ['audit@acme.com'],
  subject: 'Team Update',
  react: TeamUpdateEmail({ content }),
});
```

### Reply-To

```typescript
await resend.emails.send({
  from: 'Support <noreply@acme.com>',
  to: [user.email],
  replyTo: 'support@acme.com',
  subject: 'Support Ticket #123',
  react: SupportEmail({ ticket }),
});
```

## Attachments

```typescript
// Buffer attachment
await resend.emails.send({
  from: 'Billing <billing@acme.com>',
  to: [user.email],
  subject: 'Your Invoice',
  react: InvoiceEmail({ invoice }),
  attachments: [
    {
      filename: `invoice-${invoice.id}.pdf`,
      content: pdfBuffer, // Buffer
    },
  ],
});

// URL attachment
await resend.emails.send({
  from: 'Reports <reports@acme.com>',
  to: [user.email],
  subject: 'Monthly Report',
  react: ReportEmail(),
  attachments: [
    {
      filename: 'report.pdf',
      path: 'https://example.com/reports/monthly.pdf',
    },
  ],
});
```

## Batch Sending

```typescript
const emails = users.map((user) => ({
  from: 'Newsletter <newsletter@acme.com>',
  to: [user.email],
  subject: 'Weekly Digest',
  react: DigestEmail({ user, articles }),
}));

// Send up to 100 emails in one request
const { data, error } = await resend.batch.send(emails);

// Returns array of results
data?.forEach((result, index) => {
  if (result.error) {
    console.error(`Failed to send to ${users[index].email}`);
  }
});
```

## Scheduled Emails

```typescript
await resend.emails.send({
  from: 'Reminders <reminders@acme.com>',
  to: [user.email],
  subject: 'Your trial is ending soon',
  react: TrialEndingEmail({ user }),
  scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
});
```

## Tags and Headers

```typescript
await resend.emails.send({
  from: 'Marketing <marketing@acme.com>',
  to: [user.email],
  subject: 'New Feature Announcement',
  react: AnnouncementEmail({ feature }),
  tags: [
    { name: 'category', value: 'marketing' },
    { name: 'campaign', value: 'feature-launch' },
  ],
  headers: {
    'X-Entity-Ref-ID': `campaign-${campaignId}`,
  },
});
```

## API Routes

```typescript
// app/api/email/welcome/route.ts
import { resend } from '@/lib/resend';
import WelcomeEmail from '@/emails/welcome';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, name } = await req.json();

    const { data, error } = await resend.emails.send({
      from: 'Acme <welcome@acme.com>',
      to: [email],
      subject: `Welcome to Acme, ${name}!`,
      react: WelcomeEmail({ userName: name }),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data?.id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 }
    );
  }
}
```

## Email Service Layer

```typescript
// lib/email-service.ts
import { resend } from './resend';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';
import InvoiceEmail from '@/emails/invoice';

const FROM_ADDRESS = process.env.EMAIL_FROM || 'noreply@acme.com';

export async function sendWelcomeEmail(email: string, name: string) {
  return resend.emails.send({
    from: `Acme <${FROM_ADDRESS}>`,
    to: [email],
    subject: `Welcome to Acme, ${name}!`,
    react: WelcomeEmail({ userName: name, dashboardUrl: '/dashboard' }),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_URL}/reset-password?token=${token}`;

  return resend.emails.send({
    from: `Acme <${FROM_ADDRESS}>`,
    to: [email],
    subject: 'Reset your password',
    react: PasswordResetEmail({ resetUrl, expiresIn: '1 hour' }),
  });
}

export async function sendInvoiceEmail(email: string, invoice: Invoice) {
  return resend.emails.send({
    from: `Acme Billing <billing@acme.com>`,
    to: [email],
    subject: `Invoice #${invoice.number}`,
    react: InvoiceEmail({ invoice }),
    attachments: [
      {
        filename: `invoice-${invoice.number}.pdf`,
        content: await generateInvoicePdf(invoice),
      },
    ],
  });
}
```

## Error Handling

```typescript
import { Resend } from 'resend';

const { data, error } = await resend.emails.send({
  // ...
});

if (error) {
  // Error types
  switch (error.name) {
    case 'validation_error':
      // Invalid parameters
      break;
    case 'not_found':
      // Resource not found
      break;
    case 'rate_limit_exceeded':
      // Too many requests
      break;
    case 'internal_server_error':
      // Resend server error
      break;
  }

  console.error('Email error:', error.message);
}
```
