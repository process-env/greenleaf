# Stripe Subscriptions

## Create Subscription

```typescript
// Direct API (without Checkout)
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  payment_behavior: 'default_incomplete',
  payment_settings: { save_default_payment_method: 'on_subscription' },
  expand: ['latest_invoice.payment_intent'],
});

// Return client secret for payment
const invoice = subscription.latest_invoice as Stripe.Invoice;
const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;
return { clientSecret: paymentIntent.client_secret };
```

## Subscription Status

```typescript
type SubscriptionStatus =
  | 'active'        // Paid and active
  | 'trialing'      // In trial period
  | 'past_due'      // Payment failed, retrying
  | 'canceled'      // Subscription canceled
  | 'unpaid'        // All payment retries failed
  | 'incomplete'    // Initial payment failed
  | 'incomplete_expired'; // Initial payment expired

async function isActiveSubscription(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionStatus: true },
  });

  return ['active', 'trialing'].includes(user?.subscriptionStatus || '');
}
```

## Trials

```typescript
// Create subscription with trial
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: 14,
    trial_settings: {
      end_behavior: {
        missing_payment_method: 'cancel', // or 'pause'
      },
    },
  },
  // ...
});

// Check if in trial
const isTrialing = subscription.status === 'trialing';
const trialEnd = new Date(subscription.trial_end! * 1000);
```

## Plan Changes

### Upgrade/Downgrade

```typescript
// Get current subscription
const subscription = await stripe.subscriptions.retrieve(subscriptionId);

// Update to new price (prorate by default)
const updated = await stripe.subscriptions.update(subscriptionId, {
  items: [
    {
      id: subscription.items.data[0].id,
      price: newPriceId,
    },
  ],
  proration_behavior: 'create_prorations', // or 'none' or 'always_invoice'
});
```

### Preview Proration

```typescript
const preview = await stripe.invoices.retrieveUpcoming({
  customer: customerId,
  subscription: subscriptionId,
  subscription_items: [
    {
      id: subscription.items.data[0].id,
      price: newPriceId,
    },
  ],
});

// Show user the prorated amount
const prorationAmount = preview.amount_due / 100;
```

## Cancel Subscription

```typescript
// Cancel at period end (recommended)
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true,
});

// Cancel immediately
await stripe.subscriptions.cancel(subscriptionId);

// Reactivate canceled subscription
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: false,
});
```

## Pause Subscription

```typescript
// Pause collection (subscription stays active, no charges)
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: {
    behavior: 'mark_uncollectible', // or 'keep_as_draft' or 'void'
    resumes_at: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // Resume in 30 days
  },
});

// Resume
await stripe.subscriptions.update(subscriptionId, {
  pause_collection: '',
});
```

## Usage-Based Billing

```typescript
// Create metered price
const price = await stripe.prices.create({
  currency: 'usd',
  product: productId,
  recurring: {
    interval: 'month',
    usage_type: 'metered',
  },
  billing_scheme: 'per_unit',
  unit_amount: 10, // $0.10 per unit
});

// Report usage
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: 100, // Units used
  timestamp: Math.floor(Date.now() / 1000),
  action: 'increment', // or 'set'
});
```

## Multiple Subscriptions

```typescript
// Customer can have multiple subscriptions
const subscriptions = await stripe.subscriptions.list({
  customer: customerId,
  status: 'all',
});

// Check for specific product
const hasProPlan = subscriptions.data.some(
  (sub) =>
    sub.status === 'active' &&
    sub.items.data.some((item) => item.price.product === 'prod_xxx')
);
```

## Subscription Metadata

```typescript
// Store custom data
await stripe.subscriptions.update(subscriptionId, {
  metadata: {
    userId: user.id,
    plan: 'pro',
    teamId: team.id,
  },
});

// Retrieve in webhooks
const userId = subscription.metadata.userId;
```
