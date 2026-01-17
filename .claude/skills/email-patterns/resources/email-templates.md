# Common Email Templates

## Welcome Email

```tsx
// emails/welcome.tsx
import {
  Body, Button, Container, Head, Heading, Html,
  Img, Preview, Section, Text, Tailwind,
} from '@react-email/components';

interface WelcomeEmailProps {
  userName: string;
  dashboardUrl: string;
}

export function WelcomeEmail({ userName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Acme, {userName}!</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Img src="https://acme.com/logo.png" alt="Acme" width={120} className="mx-auto" />

            <Heading className="mt-8 text-center text-2xl font-bold">
              Welcome, {userName}!
            </Heading>

            <Text className="mt-4 text-gray-600">
              Thanks for signing up. We're excited to have you on board.
              Here's what you can do next:
            </Text>

            <ul className="mt-4 space-y-2 text-gray-600">
              <li>Complete your profile</li>
              <li>Explore our features</li>
              <li>Connect with other users</li>
            </ul>

            <Section className="mt-8 text-center">
              <Button
                href={dashboardUrl}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white"
              >
                Go to Dashboard
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Password Reset

```tsx
// emails/password-reset.tsx
interface PasswordResetProps {
  resetUrl: string;
  expiresIn: string;
}

export function PasswordResetEmail({ resetUrl, expiresIn }: PasswordResetProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your password</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold">Reset Your Password</Heading>

            <Text className="mt-4 text-gray-600">
              We received a request to reset your password. Click the button
              below to choose a new password.
            </Text>

            <Section className="my-8 text-center">
              <Button
                href={resetUrl}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white"
              >
                Reset Password
              </Button>
            </Section>

            <Text className="text-sm text-gray-500">
              This link will expire in {expiresIn}. If you didn't request this,
              you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Email Verification

```tsx
// emails/verify-email.tsx
interface VerifyEmailProps {
  verifyUrl: string;
  userName: string;
}

export function VerifyEmailEmail({ verifyUrl, userName }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verify your email address</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold">Verify Your Email</Heading>

            <Text className="mt-4 text-gray-600">
              Hi {userName}, please verify your email address to complete
              your registration.
            </Text>

            <Section className="my-8 text-center">
              <Button
                href={verifyUrl}
                className="rounded-lg bg-green-600 px-6 py-3 text-white"
              >
                Verify Email
              </Button>
            </Section>

            <Text className="text-sm text-gray-500">
              If you didn't create an account, please ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Invoice

```tsx
// emails/invoice.tsx
interface InvoiceEmailProps {
  invoice: {
    number: string;
    date: string;
    dueDate: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    total: number;
  };
  payUrl: string;
}

export function InvoiceEmail({ invoice, payUrl }: InvoiceEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Invoice #{invoice.number}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold">
              Invoice #{invoice.number}
            </Heading>

            <Section className="mt-4">
              <Text className="text-gray-600">Date: {invoice.date}</Text>
              <Text className="text-gray-600">Due: {invoice.dueDate}</Text>
            </Section>

            <Section className="mt-6 rounded border p-4">
              {invoice.items.map((item, i) => (
                <Row key={i} className="border-b py-2">
                  <Column className="w-1/2">
                    <Text>{item.name}</Text>
                  </Column>
                  <Column className="w-1/4 text-right">
                    <Text>x{item.quantity}</Text>
                  </Column>
                  <Column className="w-1/4 text-right">
                    <Text>${item.price.toFixed(2)}</Text>
                  </Column>
                </Row>
              ))}
              <Row className="mt-4">
                <Column className="w-3/4 text-right">
                  <Text className="font-bold">Total:</Text>
                </Column>
                <Column className="w-1/4 text-right">
                  <Text className="font-bold">${invoice.total.toFixed(2)}</Text>
                </Column>
              </Row>
            </Section>

            <Section className="mt-8 text-center">
              <Button
                href={payUrl}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white"
              >
                Pay Now
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Notification

```tsx
// emails/notification.tsx
interface NotificationEmailProps {
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

export function NotificationEmail({
  title,
  message,
  actionUrl,
  actionText,
}: NotificationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{title}</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Heading className="text-xl font-bold">{title}</Heading>
            <Text className="mt-4 text-gray-600">{message}</Text>

            {actionUrl && actionText && (
              <Section className="mt-6 text-center">
                <Button
                  href={actionUrl}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  {actionText}
                </Button>
              </Section>
            )}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

## Magic Link

```tsx
// emails/magic-link.tsx
interface MagicLinkEmailProps {
  loginUrl: string;
  expiresIn: string;
}

export function MagicLinkEmail({ loginUrl, expiresIn }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Your login link</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-xl rounded-lg bg-white p-8">
            <Heading className="text-2xl font-bold">Sign In</Heading>

            <Text className="mt-4 text-gray-600">
              Click the button below to sign in to your account. No password needed!
            </Text>

            <Section className="my-8 text-center">
              <Button
                href={loginUrl}
                className="rounded-lg bg-blue-600 px-6 py-3 text-white"
              >
                Sign In
              </Button>
            </Section>

            <Text className="text-sm text-gray-500">
              This link expires in {expiresIn}. If you didn't request this,
              you can safely ignore this email.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```
