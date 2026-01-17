# Sprint 4: Order Management + Email System

**Sprint Duration:** 7 days
**Branch:** sprint-4
**Focus:** Admin Orders, Dashboard Analytics, Resend Email

---

## Objectives

1. Complete admin order management (list, detail, status updates)
2. Add dashboard analytics (charts, top sellers, recent orders)
3. Set up Resend email integration
4. Create email templates for order confirmations

---

## Tasks

### 4.1 Order Management
- [ ] Create orders list page with filters
- [ ] Add order detail view with items
- [ ] Add order status update functionality
- [ ] Show order timeline/history
- [ ] Add search by order ID or email
- [ ] Create admin.orders tRPC procedures

### 4.2 Dashboard Analytics
- [ ] Add revenue stats (today, week, month)
- [ ] Create top selling strains widget
- [ ] Add recent orders table
- [ ] Show order status breakdown
- [ ] Add inventory value calculation

### 4.3 Resend Setup
- [ ] Install `resend` package
- [ ] Add RESEND_API_KEY to env
- [ ] Create email utility function
- [ ] Set up email sending service

### 4.4 Email Templates
- [ ] Create base email layout component
- [ ] Create order confirmation template
- [ ] Create order shipped template
- [ ] Add email preview endpoint (dev only)

### 4.5 Email Integration
- [ ] Send confirmation on Stripe checkout.completed
- [ ] Send status update email on order change
- [ ] Add email field to Order model if missing

---

## Technical Notes

### Order Status Flow
```
PENDING → PAID → FULFILLED → (complete)
                ↘ CANCELLED
```

### Admin Orders tRPC Procedures
```typescript
admin.orders.list      // List with pagination, filters
admin.orders.get       // Single order with items
admin.orders.updateStatus  // Change status, trigger email
admin.orders.search    // Search by ID or email
```

### Resend Integration
```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOrderConfirmation(order: Order) {
  await resend.emails.send({
    from: 'GreenLeaf <orders@greenleaf.com>',
    to: order.email,
    subject: `Order Confirmed #${order.id}`,
    react: OrderConfirmationEmail({ order }),
  });
}
```

### Email Templates Structure
```
components/emails/
  base-layout.tsx      # Shared header/footer
  order-confirmation.tsx
  order-shipped.tsx
```

---

## Dependencies

- `resend` - Email sending API
- `@react-email/components` - Email template components (optional)

---

## Success Criteria

- [ ] Admin can view all orders with pagination
- [ ] Admin can filter orders by status
- [ ] Admin can update order status
- [ ] Dashboard shows revenue metrics
- [ ] Order confirmation email sent on purchase
- [ ] Status update email sent on fulfillment
- [ ] Build passes with no errors
