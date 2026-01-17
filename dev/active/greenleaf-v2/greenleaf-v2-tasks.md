# GreenLeaf v2 - Task Checklist

**Last Updated:** 2026-01-17
**Target Demographic:** NYC Professionals, $100k+
**Design:** Elegant, Upscale, Minimal

---

## Phase 0: Premium UI Foundation (P0) - SPRINT 1 ✅ COMPLETE

### 0.1-0.10 UI Foundation ✅
- [x] Framer Motion setup with reusable variants
- [x] Color palette refinement (dark luxury theme)
- [x] Typography system (Geist + Inter)
- [x] Component refinements (Button, Card, Badge, Skeleton)
- [x] Page transitions with AnimatePresence
- [x] All page refinements (home, catalog, detail, cart, budtender)

---

## Phase 1: Authentication & Age Verification (P0) - SPRINT 2 ✅ COMPLETE

### 1.1-1.4 Auth System ✅
- [x] Clerk setup and integration
- [x] Auth middleware with public/protected routes
- [x] Sign-in/sign-up pages
- [x] tRPC context with userId
- [x] Cart-user linking with security fixes
- [x] Age verification modal

---

## Phase 2: Admin Dashboard (P1) - SPRINT 3 ✅ COMPLETE

### 2.1-2.3 Admin Foundation ✅
- [x] Admin layout with role check
- [x] Dashboard home with stats
- [x] Strain CRUD (list, create, edit, delete)
- [x] Inventory management (inline editing, low stock alerts)
- [ ] Image upload (Cloudinary/S3) - Future
- [ ] Bulk actions - Future

---

## Phase 3: Order Management & Email (P1) - SPRINT 4 ✅ COMPLETE

### 3.1 Order Management ✅
- [x] Orders list page with filters
- [x] Order detail view with items
- [x] Order status update functionality
- [x] Order timeline display
- [x] Search by order ID or email
- [x] tRPC procedures (list, get, updateStatus, stats, topSellers, recent)

### 3.2 Dashboard Analytics ✅
- [x] Revenue stats (today, week, month)
- [x] Top-selling strains widget
- [x] Recent orders table
- [x] Order status breakdown with progress bars
- [x] Inventory status card

### 3.3 Resend Email Setup ✅
- [x] Install resend and @react-email/components
- [x] Add RESEND_API_KEY to env
- [x] Create email utility with server-only guard
- [x] Validate API key before instantiation

### 3.4 Email Templates ✅
- [x] Base email layout (GreenLeaf branding)
- [x] Order confirmation template
- [x] Order shipped template
- [x] Email preview endpoint (dev only)

### 3.5 Email Integration ✅
- [x] Send on order status change (PAID → FULFILLED)
- [x] Error handling and logging

---

## Phase 4: Stripe Checkout & Webhooks (P1) - SPRINT 5 ✅ COMPLETE

### 4.1 Stripe Setup ✅
- [x] Add Stripe API keys to environment
- [x] Install stripe package
- [x] Create Stripe client utility with server-only guard

### 4.2 Checkout API ✅
- [x] Update checkout.create for user/session carts
- [x] Validate inventory before checkout
- [x] Create pending Order with pricePerGram
- [x] Create Stripe checkout session
- [x] Set success/cancel redirect URLs

### 4.3 Webhook Handler ✅
- [x] Create /api/webhooks/stripe endpoint
- [x] Verify webhook signature
- [x] Handle checkout.session.completed event
- [x] Update order status to PAID
- [x] Save customer email from Stripe
- [x] Deduct inventory atomically (with negative protection)
- [x] Clear cart after payment
- [x] Send order confirmation email
- [x] Handle checkout.session.expired event

### 4.4 Schema Updates ✅
- [x] Add pricePerGram field to OrderItem model
- [x] Run Prisma migration

---

## Phase 5: Testing Suite (P1) - SPRINT 6 ✅ COMPLETE

### 5.1 Vitest Setup ✅
- [x] Install vitest and testing dependencies
- [x] Configure vitest.config.ts with aliases for mocks
- [x] Set up test utilities (render, trpc caller)

### 5.2 Test Mocks ✅
- [x] Mock @clerk/nextjs (auth, clerkClient, components)
- [x] Mock @greenleaf/db (Prisma with vitest-mock-extended)
- [x] Mock next/headers (cookies, headers)
- [x] Mock server-only
- [x] Mock resend
- [x] Mock @react-email/components

### 5.3 Unit Tests ✅
- [x] Test utility functions (cn, formatPrice, formatGrams, slugify) - 14 tests
- [x] Test cart tRPC procedures (get, add, itemCount) - 7 tests
- [x] **Total: 21 tests passing**

### 5.4 Playwright E2E Setup ✅
- [x] Install Playwright
- [x] Configure playwright.config.ts
- [x] Create basic E2E tests (homepage, catalog, cart)

### 5.5 CI Pipeline ✅
- [x] GitHub Actions workflow (.github/workflows/ci.yml)
- [x] Lint and typecheck job
- [x] Unit tests job
- [x] E2E tests job (with Playwright)

---

## Phase 6: Production Hardening (P2) - SPRINT 7 ✅ COMPLETE

### 6.1 Sentry Error Tracking ✅
- [x] Install @sentry/nextjs
- [x] Create sentry.client.config.ts
- [x] Create sentry.server.config.ts
- [x] Create sentry.edge.config.ts
- [x] Create instrumentation.ts for Next.js 15
- [x] Add global-error.tsx boundary
- [x] Wrap next.config.ts with withSentryConfig
- [x] Configure source map upload, tunnel route

### 6.2 Rate Limiting ✅
- [x] Install @upstash/ratelimit and @upstash/redis
- [x] Create lib/rate-limit.ts utility
- [x] Add standard rate limiter (10 req/10s)
- [x] Add strict rate limiter (5 req/1m)
- [x] Add checkout rate limiter (3 req/1m)
- [x] Graceful fallback when Redis not configured

### 6.3 Structured Logging ✅
- [x] Install pino and pino-pretty
- [x] Create lib/logger.ts with JSON output
- [x] Configure pretty printing for development
- [x] Add domain-specific child loggers (orders, auth, cart, payment, admin)
- [x] Configure sensitive field redaction

### 6.4 Security Headers ✅
- [x] Add Strict-Transport-Security
- [x] Add X-Frame-Options
- [x] Add X-Content-Type-Options
- [x] Add Referrer-Policy
- [x] Add Permissions-Policy
- [x] Add X-DNS-Prefetch-Control

### 6.5 Performance ✅
- [x] Enable compression in Next.js
- [x] Add cache headers for static assets (images, fonts)

### 6.6 Health Checks ✅
- [x] Health endpoint already exists at /api/health

---

## Phase 7: AWS Deployment (P3) - SPRINT 8+ (Future)

### 7.1 Infrastructure
- [ ] Set up AWS account/IAM
- [ ] Create VPC with public/private subnets
- [ ] Set up RDS PostgreSQL
- [ ] Configure ECS/Fargate cluster

### 7.2 Application Deployment
- [ ] Create Dockerfile
- [ ] Set up ECR repository
- [ ] Create ECS task definition
- [ ] Configure ALB and target groups

### 7.3 CDN & DNS
- [ ] Set up CloudFront distribution
- [ ] Configure Route 53 hosted zone
- [ ] Set up SSL certificates

---

## Progress Summary

| Phase | Tasks | Completed | Remaining |
|-------|-------|-----------|-----------|
| **Phase 0: UI** | 35 | 35 | 0 ✅ |
| **Phase 1: Auth** | 22 | 22 | 0 ✅ |
| **Phase 2: Admin** | 15 | 15 | 0 ✅ |
| **Phase 3: Orders/Email** | 19 | 19 | 0 ✅ |
| **Phase 4: Stripe** | 15 | 15 | 0 ✅ |
| **Phase 5: Testing** | 18 | 18 | 0 ✅ |
| **Phase 6: Hardening** | 20 | 20 | 0 ✅ |
| Phase 7: AWS | 21 | 0 | 21 |
| **Total** | **165** | **144** | **21** |

---

## Sprint Allocation (Updated)

| Sprint | Focus | Status |
|--------|-------|--------|
| **Sprint 1** | Premium UI + Framer Motion | ✅ Complete + Merged |
| **Sprint 2** | Clerk Auth + Age Gate | ✅ Complete + Merged |
| **Sprint 3** | Admin Dashboard Part 1 | ✅ Complete + Merged |
| **Sprint 4** | Orders + Email System | ✅ Complete + Merged |
| **Sprint 5** | Stripe Checkout + Webhooks | ✅ Complete + Merged |
| **Sprint 6** | Testing Foundation | ✅ Complete + Merged |
| **Sprint 7** | Hardening | ✅ Complete, PR Open |
| Sprint 8 | AWS Deployment | Planned |

---

## Handoff Notes for Next Session

### Current State
- **Branch:** `sprint-7` (pushed to origin)
- **PR Status:** Open, waiting for review/merge
- **All code committed:** Yes

### To Continue
1. Wait for sprint-7 PR to be approved/merged
2. After merge, checkout main and pull: `git checkout main && git pull`
3. Set up Sentry DSN and Upstash Redis credentials
4. Start Sprint 8 (AWS Deployment) or other work

### Environment Ready
- Stripe keys configured in `.env.local`
- Resend API key configured
- Clerk keys configured
- Database schema up-to-date
- New env vars needed for Sentry/Upstash (optional)

### Test Commands
```bash
# Run dev server
pnpm dev

# Run unit tests (21 passing)
pnpm --filter @greenleaf/web test:run

# TypeScript check
pnpm tsc --noEmit

# Test Stripe webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

### pnpm Shell Issue (MINGW64)
pnpm commands produce no output in MINGW64 bash. Use this wrapper:
```bash
node -e "const {execSync} = require('child_process'); console.log(execSync('pnpm <command>', {encoding: 'utf8'}))"
```
