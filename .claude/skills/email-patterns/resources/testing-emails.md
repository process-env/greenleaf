# Testing Emails

## Development Server

### Setup

```bash
# Install React Email CLI
npm install -D react-email

# Add script to package.json
{
  "scripts": {
    "email:dev": "email dev --dir src/emails --port 3001"
  }
}
```

### Run Dev Server

```bash
npm run email:dev
# Opens http://localhost:3001 with email previews
```

### Preview Component

```tsx
// emails/welcome.tsx

// Props for preview
WelcomeEmail.PreviewProps = {
  userName: 'John Doe',
  dashboardUrl: 'https://example.com/dashboard',
} satisfies WelcomeEmailProps;

export default WelcomeEmail;
```

## Render to HTML

```typescript
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome';

// Render to HTML string
const html = await render(
  WelcomeEmail({
    userName: 'John',
    dashboardUrl: 'https://example.com/dashboard',
  })
);

// Render to plain text
const text = await render(
  WelcomeEmail({ userName: 'John', dashboardUrl: '...' }),
  { plainText: true }
);
```

## Unit Testing

```typescript
// emails/__tests__/welcome.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import WelcomeEmail from '../welcome';

describe('WelcomeEmail', () => {
  it('should render user name', async () => {
    const html = await render(
      WelcomeEmail({
        userName: 'John Doe',
        dashboardUrl: 'https://example.com',
      })
    );

    expect(html).toContain('John Doe');
    expect(html).toContain('Welcome');
  });

  it('should include dashboard link', async () => {
    const html = await render(
      WelcomeEmail({
        userName: 'John',
        dashboardUrl: 'https://example.com/dashboard',
      })
    );

    expect(html).toContain('href="https://example.com/dashboard"');
  });

  it('should render plain text version', async () => {
    const text = await render(
      WelcomeEmail({
        userName: 'John',
        dashboardUrl: 'https://example.com',
      }),
      { plainText: true }
    );

    expect(text).toContain('Welcome');
    expect(text).toContain('John');
  });
});
```

## Integration Testing

```typescript
// tests/email-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendWelcomeEmail } from '@/lib/email-service';
import { resend } from '@/lib/resend';

vi.mock('@/lib/resend', () => ({
  resend: {
    emails: {
      send: vi.fn(),
    },
  },
}));

describe('Email Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should send welcome email', async () => {
    vi.mocked(resend.emails.send).mockResolvedValue({
      data: { id: 'email-123' },
      error: null,
    });

    await sendWelcomeEmail('user@example.com', 'John');

    expect(resend.emails.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['user@example.com'],
        subject: expect.stringContaining('John'),
      })
    );
  });

  it('should handle send errors', async () => {
    vi.mocked(resend.emails.send).mockResolvedValue({
      data: null,
      error: { name: 'validation_error', message: 'Invalid email' },
    });

    await expect(
      sendWelcomeEmail('invalid', 'John')
    ).rejects.toThrow('Failed to send email');
  });
});
```

## Preview API Route

```typescript
// app/api/email/preview/route.ts (development only)
import { render } from '@react-email/render';
import WelcomeEmail from '@/emails/welcome';
import PasswordResetEmail from '@/emails/password-reset';
import { NextResponse } from 'next/server';

const templates = {
  welcome: WelcomeEmail,
  'password-reset': PasswordResetEmail,
};

export async function GET(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const template = searchParams.get('template') as keyof typeof templates;

  if (!template || !templates[template]) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }

  const Component = templates[template];
  const html = await render(Component(Component.PreviewProps));

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
```

## Snapshot Testing

```typescript
// emails/__tests__/snapshots.test.tsx
import { describe, it, expect } from 'vitest';
import { render } from '@react-email/render';
import WelcomeEmail from '../welcome';

describe('Email Snapshots', () => {
  it('should match welcome email snapshot', async () => {
    const html = await render(
      WelcomeEmail({
        userName: 'Test User',
        dashboardUrl: 'https://example.com',
      })
    );

    expect(html).toMatchSnapshot();
  });
});
```

## Test Mode with Resend

```typescript
// Use test API key for development
const resend = new Resend(
  process.env.NODE_ENV === 'test'
    ? 're_test_xxxxx'
    : process.env.RESEND_API_KEY
);
```

## Email Inbox Testing

For comprehensive email testing, consider:

- **Mailtrap** - Email sandbox for testing
- **Mailhog** - Local SMTP testing server
- **Ethereal** - Fake SMTP service

```typescript
// Development SMTP configuration
if (process.env.NODE_ENV === 'development') {
  // Use Ethereal or Mailtrap for testing
  const testAccount = await nodemailer.createTestAccount();
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
}
```

## Linting

```bash
# Check email HTML validity
npx email lint --dir src/emails
```
