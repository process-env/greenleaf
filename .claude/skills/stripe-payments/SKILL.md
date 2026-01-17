---
name: stripe-payments
description: Stripe payment integration for subscriptions, checkout sessions, webhooks, and customer management in Next.js applications.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  stripe: "17.x"
  stripe-js: "4.x"
---

# Stripe Payments

> **Updated 2026-01-11:** Stripe SDK v17, @stripe/stripe-js v4.

## Purpose

Complete guide for integrating Stripe payments into Next.js applications. Covers Checkout sessions, subscriptions, webhooks, and customer management.

## When to Use This Skill

Automatically activates when working on:
- Payment processing
- Subscription management
- Stripe Checkout integration
- Webhook handling
- Customer billing

---

## Quick Start

### Installation

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Server Client

```typescript
// lib/stripe.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
});
```

### Client Setup

```typescript
// lib/stripe-client.ts
import { loadStripe } from '@stripe/stripe-js';

export const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);
```

---

## Checkout Sessions

### Create Checkout Session

```typescript
// app/api/checkout/route.ts
import { stripe } from '@/lib/stripe';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { priceId } = await req.json();

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    customer_email: session.user.email!,
    metadata: {
      userId: session.user.id,
    },
    subscription_data: {
      metadata: {
        userId: session.user.id,
      },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
```

### Checkout Button

```typescript
'use client';

import { useState } from 'react';

export function CheckoutButton({ priceId }: { priceId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);

    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    });

    const { url } = await response.json();
    window.location.href = url;
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Loading...' : 'Subscribe'}
    </button>
  );
}
```

### One-Time Payment

```typescript
const checkoutSession = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Product Name',
          description: 'Product description',
          images: ['https://example.com/image.jpg'],
        },
        unit_amount: 2000, // $20.00
      },
      quantity: 1,
    },
  ],
  success_url: `${process.env.NEXT_PUBLIC_URL}/success`,
  cancel_url: `${process.env.NEXT_PUBLIC_URL}/cancel`,
});
```

---

## Webhooks

### Webhook Handler

```typescript
// app/api/webhooks/stripe/route.ts
import { stripe } from '@/lib/stripe';
import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = headers().get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error('Webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customerId },
  });
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}
```

---

## Customer Portal

```typescript
// app/api/portal/route.ts
import { stripe } from '@/lib/stripe';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No customer found' }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

---

## Subscription Management

### Check Subscription Status

```typescript
// lib/subscription.ts
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function getSubscription() {
  const session = await auth();
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      subscriptionStatus: true,
      subscriptionPriceId: true,
      currentPeriodEnd: true,
    },
  });

  return user;
}

export async function isSubscribed(): Promise<boolean> {
  const subscription = await getSubscription();

  return (
    subscription?.subscriptionStatus === 'active' ||
    subscription?.subscriptionStatus === 'trialing'
  );
}

export async function isPro(): Promise<boolean> {
  const subscription = await getSubscription();

  return (
    subscription?.subscriptionPriceId === process.env.STRIPE_PRO_PRICE_ID &&
    (subscription?.subscriptionStatus === 'active' ||
      subscription?.subscriptionStatus === 'trialing')
  );
}
```

### Cancel Subscription

```typescript
// app/api/subscription/cancel/route.ts
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { subscriptionId: true },
  });

  if (!user?.subscriptionId) {
    return NextResponse.json({ error: 'No subscription' }, { status: 400 });
  }

  await stripe.subscriptions.update(user.subscriptionId, {
    cancel_at_period_end: true,
  });

  return NextResponse.json({ success: true });
}
```

---

## Embedded Checkout

```typescript
'use client';

import { EmbeddedCheckout, EmbeddedCheckoutProvider } from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe-client';

export function EmbeddedCheckoutForm({ clientSecret }: { clientSecret: string }) {
  return (
    <EmbeddedCheckoutProvider
      stripe={stripePromise}
      options={{ clientSecret }}
    >
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
```

---

## Gotchas & Real-World Warnings

### Webhooks Are Your Source of Truth

**Never trust checkout success URL alone.** Users can manipulate URLs or close the browser before redirect.

```typescript
// DANGER: User could visit this URL directly
// app/success/page.tsx
export default function SuccessPage() {
  // DON'T grant access here without webhook confirmation
  return <div>Thanks for subscribing!</div>;
}

// CORRECT: Webhook marks subscription as active, UI checks database state
const { subscriptionStatus } = await getUser();
if (subscriptionStatus !== 'active') {
  redirect('/pricing');
}
```

**Webhooks arrive out of order.** `customer.subscription.created` might arrive AFTER `invoice.paid`. Handle all states independently.

**Webhooks can fire multiple times.** Stripe retries failed webhooks. Make handlers idempotent:

```typescript
// DANGER: User gets 3 welcome emails if webhook retries
async function handleCheckoutComplete(session) {
  await sendWelcomeEmail(session.customer_email);
}

// CORRECT: Check if already processed
async function handleCheckoutComplete(session) {
  const existing = await prisma.order.findUnique({
    where: { stripeSessionId: session.id }
  });
  if (existing) return; // Already processed

  await prisma.order.create({ data: { stripeSessionId: session.id, ... } });
  await sendWelcomeEmail(session.customer_email);
}
```

### Test Mode vs Live Mode

**Completely separate data.** Test mode customers, subscriptions, webhooks are isolated. You can't "promote" test data to live.

**Webhook endpoints are per-mode.** Register separate webhook URLs for test and live, or check `event.livemode` in handlers.

**Price IDs differ between modes.** `price_test_xxx` ≠ `price_live_xxx`. Use environment variables.

```typescript
// DANGER: Hardcoded test price ID
const priceId = 'price_1234';

// CORRECT: Environment-specific
const priceId = process.env.STRIPE_PRO_PRICE_ID;
```

### Subscription State Machine Is Complex

Subscriptions aren't just "active" or "cancelled":

| Status | What It Means |
|--------|---------------|
| `active` | Paying customer |
| `trialing` | In trial, no charge yet |
| `past_due` | Payment failed, retrying |
| `canceled` | Cancelled but might have access until period end |
| `unpaid` | All retries failed |
| `incomplete` | Initial payment failed |
| `incomplete_expired` | Gave up on initial payment |
| `paused` | Manually paused |

**`cancel_at_period_end: true` is NOT `status: 'canceled'`:**

```typescript
// User clicked "cancel" but still has access
subscription.cancel_at_period_end = true;
subscription.status = 'active'; // Still active!
subscription.current_period_end = '2024-02-01'; // Access until here

// Only after period ends:
subscription.status = 'canceled';
```

### Money Mistakes

**Amounts are in cents.** `$20.00` = `2000`. Off by 100x is an expensive bug.

```typescript
// DANGER: Charges $20,000 instead of $20
unit_amount: 20.00

// CORRECT: Cents
unit_amount: 2000
```

**Currency matters.** JPY has no decimal places. EUR uses comma as decimal in display.

### What These Patterns Don't Tell You

1. **Refunds** - Customer disputes, partial refunds, proration calculations
2. **Tax collection** - Stripe Tax exists but adds complexity
3. **Invoice customization** - Default invoices are ugly; customers expect branding
4. **Dunning** - Failed payment retry logic, email sequences, grace periods
5. **Upgrade/downgrade proration** - Mid-cycle plan changes get complicated
6. **Multi-currency** - Different prices per region, currency conversion
7. **PCI compliance** - Never log full card numbers, even in errors

---

## Anti-Patterns to Avoid

- Trusting client-side price data
- Not validating webhook signatures
- Storing card details (use Stripe Elements)
- Not handling failed payments
- Hardcoding price IDs

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Set up Checkout | [checkout.md](resources/checkout.md) |
| Handle webhooks | [webhooks.md](resources/webhooks.md) |
| Manage subscriptions | [subscriptions.md](resources/subscriptions.md) |
| Customer management | [customer-management.md](resources/customer-management.md) |

---

## Resource Files

### [checkout.md](resources/checkout.md)
Checkout sessions, embedded checkout, payment intents

### [webhooks.md](resources/webhooks.md)
Event handling, signature verification, testing

### [subscriptions.md](resources/subscriptions.md)
Plans, trials, upgrades, cancellations

### [customer-management.md](resources/customer-management.md)
Customer creation, payment methods, invoices

---

## External Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 4 resource files
