# Stripe Checkout

## Checkout Sessions

### Subscription Checkout

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  payment_method_types: ['card'],
  line_items: [
    {
      price: 'price_xxx', // Stripe Price ID
      quantity: 1,
    },
  ],
  success_url: `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/pricing`,
  customer_email: user.email,
  metadata: {
    userId: user.id,
  },
  subscription_data: {
    trial_period_days: 14,
    metadata: { userId: user.id },
  },
  allow_promotion_codes: true,
  billing_address_collection: 'required',
});
```

### One-Time Payment

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: [
    {
      price_data: {
        currency: 'usd',
        product_data: {
          name: 'Premium Package',
          description: 'One-time purchase',
          images: ['https://example.com/image.jpg'],
        },
        unit_amount: 4999, // $49.99 in cents
      },
      quantity: 1,
    },
  ],
  success_url: `${baseUrl}/success`,
  cancel_url: `${baseUrl}/cancel`,
});
```

### Multiple Items

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: cart.items.map((item) => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.name,
        images: [item.image],
      },
      unit_amount: item.price * 100,
    },
    quantity: item.quantity,
  })),
  success_url: `${baseUrl}/success`,
  cancel_url: `${baseUrl}/cart`,
  shipping_address_collection: {
    allowed_countries: ['US', 'CA', 'GB'],
  },
});
```

## Embedded Checkout

### Server: Create Client Secret

```typescript
// app/api/checkout/embedded/route.ts
export async function POST(req: Request) {
  const { priceId } = await req.json();

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    ui_mode: 'embedded',
    return_url: `${process.env.NEXT_PUBLIC_URL}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  return NextResponse.json({ clientSecret: session.client_secret });
}
```

### Client: Render Embedded Checkout

```tsx
'use client';

import { useEffect, useState } from 'react';
import {
  EmbeddedCheckout,
  EmbeddedCheckoutProvider,
} from '@stripe/react-stripe-js';
import { stripePromise } from '@/lib/stripe-client';

export function EmbeddedCheckoutForm({ priceId }: { priceId: string }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    fetch('/api/checkout/embedded', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId }),
    })
      .then((res) => res.json())
      .then((data) => setClientSecret(data.clientSecret));
  }, [priceId]);

  if (!clientSecret) return <div>Loading...</div>;

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

## Payment Intents (Custom UI)

### Create Payment Intent

```typescript
// app/api/payment-intent/route.ts
export async function POST(req: Request) {
  const { amount } = await req.json();

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount * 100,
    currency: 'usd',
    automatic_payment_methods: { enabled: true },
  });

  return NextResponse.json({ clientSecret: paymentIntent.client_secret });
}
```

### Payment Form

```tsx
'use client';

import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { useState } from 'react';

export function PaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success`,
      },
    });

    if (error) {
      setError(error.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement />
      {error && <div className="text-red-500">{error}</div>}
      <button disabled={!stripe || loading}>
        {loading ? 'Processing...' : 'Pay'}
      </button>
    </form>
  );
}
```

## Session Status

```typescript
// app/api/checkout/status/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('session_id');

  if (!sessionId) {
    return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  return NextResponse.json({
    status: session.status,
    customer_email: session.customer_details?.email,
    payment_status: session.payment_status,
  });
}
```

## Tax Calculation

```typescript
const session = await stripe.checkout.sessions.create({
  // ...
  automatic_tax: { enabled: true },
  tax_id_collection: { enabled: true },
});
```
