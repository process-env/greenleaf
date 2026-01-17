# React Email Components

## Core Components

### Html

```tsx
import { Html } from '@react-email/components';

<Html lang="en" dir="ltr">
  {/* Email content */}
</Html>
```

### Head

```tsx
import { Head } from '@react-email/components';

<Head>
  <title>Email Title</title>
  <meta name="description" content="Email description" />
</Head>
```

### Preview

```tsx
import { Preview } from '@react-email/components';

// Shows in email client preview (hidden in body)
<Preview>Welcome to our platform! Here's what you need to know...</Preview>
```

### Body

```tsx
import { Body } from '@react-email/components';

<Body style={{ backgroundColor: '#f6f9fc', fontFamily: 'sans-serif' }}>
  {/* Email content */}
</Body>
```

### Container

```tsx
import { Container } from '@react-email/components';

<Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
  {/* Centered content */}
</Container>
```

### Section

```tsx
import { Section } from '@react-email/components';

<Section style={{ padding: '24px', backgroundColor: '#ffffff' }}>
  {/* Section content */}
</Section>
```

## Typography

### Heading

```tsx
import { Heading } from '@react-email/components';

<Heading as="h1" style={{ fontSize: '24px', fontWeight: 'bold' }}>
  Welcome!
</Heading>

<Heading as="h2" style={{ fontSize: '20px' }}>
  Getting Started
</Heading>
```

### Text

```tsx
import { Text } from '@react-email/components';

<Text style={{ fontSize: '16px', lineHeight: '24px', color: '#333' }}>
  Thank you for signing up. We're excited to have you on board.
</Text>
```

### Link

```tsx
import { Link } from '@react-email/components';

<Link
  href="https://example.com"
  style={{ color: '#0066cc', textDecoration: 'underline' }}
>
  Visit our website
</Link>
```

## Interactive

### Button

```tsx
import { Button } from '@react-email/components';

<Button
  href="https://example.com/dashboard"
  style={{
    backgroundColor: '#0066cc',
    color: '#ffffff',
    padding: '12px 24px',
    borderRadius: '4px',
    textDecoration: 'none',
    display: 'inline-block',
  }}
>
  Go to Dashboard
</Button>
```

## Media

### Img

```tsx
import { Img } from '@react-email/components';

<Img
  src="https://example.com/logo.png"
  alt="Company Logo"
  width={150}
  height={50}
  style={{ margin: '0 auto' }}
/>
```

## Layout

### Row and Column

```tsx
import { Row, Column } from '@react-email/components';

<Row>
  <Column style={{ width: '50%' }}>
    <Text>Left column</Text>
  </Column>
  <Column style={{ width: '50%' }}>
    <Text>Right column</Text>
  </Column>
</Row>
```

### Hr

```tsx
import { Hr } from '@react-email/components';

<Hr style={{ borderColor: '#e6e6e6', margin: '24px 0' }} />
```

## Tailwind Integration

```tsx
import { Tailwind } from '@react-email/components';

export function Email() {
  return (
    <Tailwind
      config={{
        theme: {
          extend: {
            colors: {
              brand: '#007bff',
            },
          },
        },
      }}
    >
      <Html>
        <Body className="bg-gray-100">
          <Container className="mx-auto max-w-xl p-8">
            <Heading className="text-2xl font-bold text-brand">
              Welcome!
            </Heading>
            <Button className="bg-brand text-white px-6 py-3 rounded">
              Get Started
            </Button>
          </Container>
        </Body>
      </Html>
    </Tailwind>
  );
}
```

## Complete Template

```tsx
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Img,
  Hr,
  Link,
  Tailwind,
} from '@react-email/components';

interface EmailProps {
  userName: string;
  actionUrl: string;
}

export function WelcomeEmail({ userName, actionUrl }: EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to our platform, {userName}!</Preview>
      <Tailwind>
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto my-10 max-w-[600px] rounded-lg bg-white shadow-lg">
            <Section className="p-8">
              <Img
                src="https://example.com/logo.png"
                alt="Logo"
                width={120}
                className="mx-auto"
              />

              <Heading className="mt-8 text-center text-2xl font-bold text-gray-900">
                Welcome, {userName}!
              </Heading>

              <Text className="mt-4 text-gray-600">
                We're thrilled to have you join us. Your account is ready
                and you can start exploring right away.
              </Text>

              <Section className="mt-8 text-center">
                <Button
                  href={actionUrl}
                  className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white"
                >
                  Get Started
                </Button>
              </Section>

              <Hr className="my-8 border-gray-200" />

              <Text className="text-center text-sm text-gray-500">
                If you have any questions, reply to this email or contact{' '}
                <Link href="mailto:support@example.com" className="text-blue-600">
                  support@example.com
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export default WelcomeEmail;
```
