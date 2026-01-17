# Stripe Webhooks

## Webhook Handler

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
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
```

## Event Handlers

```typescript
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;

  if (session.mode === 'subscription') {
    // Subscription checkout completed
    await prisma.user.update({
      where: { id: userId },
      data: { stripeCustomerId: customerId },
    });
  } else if (session.mode === 'payment') {
    // One-time payment completed
    await prisma.order.create({
      data: {
        userId,
        stripeSessionId: session.id,
        amount: session.amount_total! / 100,
        status: 'completed',
      },
    });
  }
}

async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPriceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: subscription.status,
      subscriptionPriceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionId: null,
      subscriptionStatus: 'canceled',
      subscriptionPriceId: null,
    },
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  await prisma.payment.create({
    data: {
      stripeCustomerId: customerId,
      stripeInvoiceId: invoice.id,
      amount: invoice.amount_paid / 100,
      status: 'paid',
    },
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Find user and send notification
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
  });

  if (user) {
    await sendPaymentFailedEmail(user.email, {
      invoiceUrl: invoice.hosted_invoice_url,
      amount: invoice.amount_due / 100,
    });
  }
}
```

## Testing Webhooks

### Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Test Mode Events

```typescript
// Test webhook signature verification
const payload = JSON.stringify({ type: 'test' });
const signature = stripe.webhooks.generateTestHeaderString({
  payload,
  secret: process.env.STRIPE_WEBHOOK_SECRET!,
});
```

## Important Events

| Event | When it fires |
|-------|---------------|
| `checkout.session.completed` | Customer completed checkout |
| `customer.subscription.created` | New subscription created |
| `customer.subscription.updated` | Subscription changed |
| `customer.subscription.deleted` | Subscription canceled |
| `invoice.paid` | Invoice payment succeeded |
| `invoice.payment_failed` | Invoice payment failed |
| `customer.created` | New customer created |
| `payment_intent.succeeded` | Payment completed |
| `payment_intent.payment_failed` | Payment failed |

## Idempotency

```typescript
// Handle duplicate events
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const existing = await prisma.user.findFirst({
    where: { subscriptionId: subscription.id },
  });

  if (existing) {
    // Already processed
    return;
  }

  // Process subscription...
}
```

## Webhook Retry

Stripe retries failed webhooks with exponential backoff:
- First retry: ~1 hour
- Second retry: ~3 hours
- Third retry: ~6 hours
- Final attempts over 3 days

Return 2xx status to acknowledge receipt.
