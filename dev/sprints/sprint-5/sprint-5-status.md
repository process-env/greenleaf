# Sprint 5 Status Report

**Generated:** 2026-01-17
**Sprint Day:** 1 of 7
**Branch:** sprint-5

---

## Progress Summary

- **Completed:** 19 tasks
- **In Progress:** 0 tasks
- **Remaining:** 0 tasks
- **Velocity:** Excellent

---

## Task Status

### Stripe Setup (100%)
- [x] Add Stripe API keys to environment
- [x] Install stripe package
- [x] Create Stripe client utility

### Checkout API (100%)
- [x] Create checkout session endpoint
- [x] Include cart items in session metadata
- [x] Set success/cancel redirect URLs
- [x] Create order record on session creation

### Webhook Handler (100%)
- [x] Create /api/webhooks/stripe endpoint
- [x] Verify webhook signature
- [x] Handle checkout.session.completed event
- [x] Update order status to PAID
- [x] Send order confirmation email
- [x] Handle checkout.session.expired event

### Cart Checkout Integration (100%)
- [x] Checkout button on cart page (already exists)
- [x] Checkout success page (already exists)
- [x] Clear cart after successful payment (in webhook)

### Order Flow Updates (100%)
- [x] Link orders to Stripe session ID
- [x] Deduct inventory on successful payment
- [x] Add pricePerGram to OrderItem schema

---

## Build Status

| Check | Status |
|-------|--------|
| TypeScript | Pass |
| Build | Pass |

---

## Files Created/Modified

### New Files
- `apps/web/lib/stripe.ts` - Stripe client utility with server-only guard
- `apps/web/app/api/webhooks/stripe/route.ts` - Webhook handler

### Modified Files
- `apps/web/server/routers/checkout.ts` - Updated checkout flow with proper cart lookup
- `packages/db/prisma/schema.prisma` - Added pricePerGram to OrderItem
- `apps/web/.env.local` - Added Stripe keys
- `dev/sprints/current-sprint.txt` - Updated to sprint-5

---

## Checkout Flow

```text
1. User clicks "Proceed to Checkout" on cart page
2. checkout.create mutation creates pending Order + Stripe session
3. User redirected to Stripe Checkout
4. On payment success → Stripe webhook fires
5. Webhook handler:
   - Updates order status to PAID
   - Saves customer email
   - Deducts inventory
   - Clears cart
   - Sends confirmation email
6. User redirected to success page
```

---

## Testing Notes

To test webhooks locally:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET` in `.env.local`

Test cards:
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
