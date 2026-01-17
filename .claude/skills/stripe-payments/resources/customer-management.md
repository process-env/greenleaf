# Stripe Customer Management

## Create Customer

```typescript
// Create customer
const customer = await stripe.customers.create({
  email: user.email,
  name: user.name,
  metadata: {
    userId: user.id,
  },
});

// Save customer ID
await prisma.user.update({
  where: { id: user.id },
  data: { stripeCustomerId: customer.id },
});
```

## Get or Create Customer

```typescript
async function getOrCreateCustomer(user: User): Promise<string> {
  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Check if customer exists by email
  const existing = await stripe.customers.list({
    email: user.email,
    limit: 1,
  });

  if (existing.data.length > 0) {
    const customerId = existing.data[0].id;
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId },
    });
    return customerId;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}
```

## Update Customer

```typescript
await stripe.customers.update(customerId, {
  email: newEmail,
  name: newName,
  address: {
    line1: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    postal_code: '94105',
    country: 'US',
  },
});
```

## Payment Methods

### List Payment Methods

```typescript
const paymentMethods = await stripe.paymentMethods.list({
  customer: customerId,
  type: 'card',
});

// Return formatted list
return paymentMethods.data.map((pm) => ({
  id: pm.id,
  brand: pm.card?.brand,
  last4: pm.card?.last4,
  expMonth: pm.card?.exp_month,
  expYear: pm.card?.exp_year,
  isDefault: pm.id === customer.invoice_settings.default_payment_method,
}));
```

### Add Payment Method

```typescript
// Create Setup Intent for adding payment method
const setupIntent = await stripe.setupIntents.create({
  customer: customerId,
  payment_method_types: ['card'],
  usage: 'off_session', // For future payments
});

return { clientSecret: setupIntent.client_secret };
```

### Set Default Payment Method

```typescript
await stripe.customers.update(customerId, {
  invoice_settings: {
    default_payment_method: paymentMethodId,
  },
});
```

### Remove Payment Method

```typescript
await stripe.paymentMethods.detach(paymentMethodId);
```

## Customer Portal

```typescript
// app/api/portal/route.ts
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No customer' }, { status: 400 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
```

### Portal Configuration

Configure in Stripe Dashboard or via API:

```typescript
const configuration = await stripe.billingPortal.configurations.create({
  features: {
    customer_update: {
      enabled: true,
      allowed_updates: ['email', 'address', 'phone'],
    },
    invoice_history: { enabled: true },
    payment_method_update: { enabled: true },
    subscription_cancel: { enabled: true },
    subscription_pause: { enabled: true },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price'],
      products: [
        {
          product: 'prod_xxx',
          prices: ['price_basic', 'price_pro'],
        },
      ],
    },
  },
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: 'https://example.com/privacy',
    terms_of_service_url: 'https://example.com/terms',
  },
});
```

## Invoices

```typescript
// List invoices
const invoices = await stripe.invoices.list({
  customer: customerId,
  limit: 10,
});

// Get specific invoice
const invoice = await stripe.invoices.retrieve(invoiceId);

// Get invoice PDF
const pdfUrl = invoice.invoice_pdf;
const hostedUrl = invoice.hosted_invoice_url;
```

## Billing History

```typescript
async function getBillingHistory(customerId: string) {
  const [invoices, charges] = await Promise.all([
    stripe.invoices.list({ customer: customerId, limit: 20 }),
    stripe.charges.list({ customer: customerId, limit: 20 }),
  ]);

  return {
    invoices: invoices.data.map((inv) => ({
      id: inv.id,
      amount: inv.amount_paid / 100,
      status: inv.status,
      date: new Date(inv.created * 1000),
      pdfUrl: inv.invoice_pdf,
    })),
    charges: charges.data.map((charge) => ({
      id: charge.id,
      amount: charge.amount / 100,
      status: charge.status,
      date: new Date(charge.created * 1000),
      description: charge.description,
    })),
  };
}
```

## Delete Customer

```typescript
// Delete customer and all associated data
await stripe.customers.del(customerId);

// Update local database
await prisma.user.update({
  where: { stripeCustomerId: customerId },
  data: {
    stripeCustomerId: null,
    subscriptionId: null,
    subscriptionStatus: null,
  },
});
```
