# Sprint 5: Stripe Checkout & Webhooks

**Sprint Duration:** 7 days
**Branch:** sprint-5
**Focus:** Stripe Integration, Checkout Flow, Payment Webhooks

---

## Objectives

1. Set up Stripe checkout session creation
2. Implement webhook handler for payment events
3. Send order confirmation emails on successful payment
4. Create checkout UI flow from cart

---

## Tasks

### 5.1 Stripe Setup
- [x] Add Stripe API keys to environment
- [ ] Install `stripe` package
- [ ] Create Stripe client utility

### 5.2 Checkout API
- [ ] Create checkout session endpoint
- [ ] Include cart items in session metadata
- [ ] Set success/cancel redirect URLs
- [ ] Create order record on session creation

### 5.3 Webhook Handler
- [ ] Create `/api/webhooks/stripe` endpoint
- [ ] Verify webhook signature
- [ ] Handle `checkout.session.completed` event
- [ ] Update order status to PAID
- [ ] Send order confirmation email
- [ ] Handle `payment_intent.payment_failed` event

### 5.4 Cart Checkout Integration
- [ ] Add checkout button to cart
- [ ] Redirect to Stripe checkout
- [ ] Create success page
- [ ] Create cancel page
- [ ] Clear cart after successful payment

### 5.5 Order Flow Updates
- [ ] Link orders to Stripe session ID
- [ ] Deduct inventory on successful payment
- [ ] Handle edge cases (duplicate webhooks, etc.)

---

## Technical Notes

### Stripe Checkout Flow
```text
Cart → Create Session → Redirect to Stripe → Payment → Webhook → Update Order
```

### Webhook Events to Handle
```typescript
// Primary events
checkout.session.completed  // Payment successful
payment_intent.payment_failed  // Payment failed

// Optional events
checkout.session.expired  // Session expired without payment
```

### Checkout Session Creation
```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card'],
  line_items: cartItems.map(item => ({
    price_data: {
      currency: 'usd',
      product_data: {
        name: item.strain.name,
        images: item.strain.imageUrl ? [item.strain.imageUrl] : [],
      },
      unit_amount: item.pricePerGram * 100, // cents
    },
    quantity: item.grams,
  })),
  success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${baseUrl}/cart`,
  metadata: {
    orderId: order.id,
    cartId: cart.id,
  },
});
```

### Webhook Signature Verification
```typescript
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

---

## Environment Variables

```text
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Dependencies

- `stripe` - Stripe Node.js SDK

---

## Success Criteria

- [ ] User can checkout from cart
- [ ] Stripe checkout page displays correct items/total
- [ ] Webhook updates order to PAID on success
- [ ] Order confirmation email sent on payment
- [ ] Inventory deducted after payment
- [ ] Success/cancel pages work correctly
- [ ] Build passes with no errors
