# GreenLeaf v2 - Task Checklist

**Last Updated:** 2026-01-17
**Target Demographic:** NYC Professionals, $100k+
**Design:** Elegant, Upscale, Minimal

---

## Phase 0: Premium UI Foundation (P0) - SPRINT 1 ✅ COMPLETE

### 0.1 Framer Motion Setup ✅
- [x] Install `framer-motion` package
- [x] Create `lib/motion.ts` with reusable variants
- [x] Create `components/motion/` directory
- [x] Build `FadeIn` wrapper component
- [x] Build `SlideUp` wrapper component
- [x] Build `StaggerContainer` for lists

### 0.2 Color Palette Refinement ✅
- [x] Update `tailwind.config.ts` with luxury palette
- [x] Define dark background colors (#0A0A0A, #141414)
- [x] Choose accent color (gold #C4A052)
- [x] Update CSS variables in `globals.css`
- [x] Create color tokens for consistent usage

### 0.3 Typography System ✅
- [x] Verify Geist font is properly loaded
- [x] Add Inter as body font fallback
- [x] Define type scale (heading sizes, body, captions)
- [x] Increase line-heights for luxury feel
- [x] Add letter-spacing adjustments

### 0.4 Component Refinements ✅
- [x] Update Button variants (minimal, no shadows)
- [x] Refine Card component (more padding, subtle borders)
- [x] Update Badge component (pill style, muted colors)
- [x] Create shimmer Skeleton component
- [x] Add smooth focus states

### 0.5 Page Transitions ✅
- [x] Create `PageTransition` wrapper component
- [x] Add fade-in on route changes
- [x] Add subtle slide-up for content
- [x] Configure AnimatePresence for exit animations

### 0.6-0.10 Page Refinements ✅
- [x] Homepage redesign with animations
- [x] Strain catalog with stagger animations
- [x] Strain detail page polish
- [x] Cart experience improvements
- [x] AI Budtender chat polish

---

## Phase 1: Authentication & Age Verification (P0) - SPRINT 2 ✅ COMPLETE

### 1.1 Clerk Setup ✅
- [x] Install `@clerk/nextjs` package
- [x] Add Clerk env vars to `.env.local`
- [x] Configure `ClerkProvider` in root layout
- [x] Add Clerk middleware for route protection
- [x] Configure dark theme for Clerk components

### 1.2 Auth Integration ✅
- [x] Create auth middleware (`middleware.ts`)
- [x] Define public routes (home, strains, budtender, cart)
- [x] Define protected routes (orders, profile)
- [x] Add `SignInButton` / `UserButton` to header
- [x] Update tRPC context to include `userId`
- [x] Create `protectedProcedure` in tRPC
- [x] Create sign-in page (`/sign-in`)
- [x] Create sign-up page (`/sign-up`)

### 1.3 Cart-User Linking ✅
- [x] Add optional `userId` to Cart model (with @unique)
- [x] Update cart.get to check userId if logged in
- [x] Link anonymous cart on login (not merge - simpler)
- [x] Update all cart procedures for auth
- [x] Fix cross-user cart exposure (security fix)
- [x] Add inventory guard for total cart quantity

### 1.4 Age Verification ✅
- [x] Create `AgeVerificationModal` component
- [x] Add age verification state/cookie logic
- [x] Style modal with shadcn/ui Dialog
- [x] Add "Remember for 24 hours" checkbox
- [x] Create Checkbox UI component

---

## Phase 2: Admin Dashboard (P1) - SPRINT 3 ✅ COMPLETE (Part 1)

### 2.1 Admin Layout ✅
- [x] Create `/app/(admin)/` route group
- [x] Build admin sidebar navigation
- [x] Add admin role check middleware (layout level)
- [x] Create admin dashboard home page
- [x] Add Clerk `publicMetadata.role` for admin check

### 2.2 Strain Management ✅
- [x] Create strains list page with table
- [x] Add strain create form
- [x] Add strain edit form
- [x] Add strain delete with confirmation
- [x] tRPC CRUD procedures (`admin.strains.*`)
- [ ] Implement image upload (Cloudinary/S3) - Sprint 4
- [ ] Add bulk actions (delete, update stock) - Sprint 4

### 2.3 Inventory Management ✅
- [x] Create inventory overview page
- [x] Add inline quantity editing
- [x] Add inline price editing
- [x] Show low stock alerts
- [ ] Add inventory history log - Sprint 4

### 2.4 Order Management (Sprint 4)
- [ ] Create orders list page
- [ ] Add order detail view
- [ ] Add order status update buttons
- [ ] Add order search/filter
- [ ] Show order timeline

### 2.5 Dashboard Analytics (Sprint 4)
- [ ] Create sales overview cards
- [ ] Add revenue chart (daily/weekly/monthly)
- [ ] Add top selling strains widget
- [ ] Add recent orders widget
- [ ] Add inventory alerts widget

---

## Phase 3: Email Notifications (P1) - Sprint 4

### 3.1 Resend Setup
- [ ] Install `resend` and `@react-email/components`
- [ ] Create Resend account and API key
- [ ] Add RESEND_API_KEY to env
- [ ] Create `packages/email` package
- [ ] Set up email utility function

### 3.2 Email Templates
- [ ] Create base email layout
- [ ] Create order confirmation template
- [ ] Create shipping notification template
- [ ] Create welcome email template
- [ ] Add email preview endpoint (`/api/email/preview`)

### 3.3 Email Integration
- [ ] Send order confirmation on checkout.completed webhook
- [ ] Send shipping email on order status change
- [ ] Send welcome email on Clerk user.created webhook
- [ ] Add email to order model if not present
- [ ] Test all email flows

---

## Phase 4: Testing Suite (P1) - Sprint 5-6

### 4.1-4.6 Testing (Future)
- [ ] Vitest setup
- [ ] Unit tests for packages
- [ ] Unit tests for tRPC
- [ ] Playwright E2E setup
- [ ] E2E tests
- [ ] CI Pipeline

---

## Phase 5: Production Hardening (P2) - Sprint 7

### 5.1-5.6 Hardening (Future)
- [ ] Sentry error tracking
- [ ] Rate limiting (Upstash)
- [ ] Structured logging
- [ ] Performance optimization
- [ ] Security audit
- [ ] Health checks

---

## Phase 6: Scraper Enhancement (P2) - Sprint 8
(Future)

---

## Phase 7: AWS Deployment (P3) - Sprint 9
(Future)

---

## Progress Summary

| Phase | Tasks | Completed | Remaining |
|-------|-------|-----------|-----------|
| **Phase 0: UI** | **35** | **35** | **0** ✅ |
| **Phase 1: Auth** | **22** | **22** | **0** ✅ |
| **Phase 2: Admin** | **21** | **15** | **6** |
| Phase 3: Email | 13 | 0 | 13 |
| Phase 4: Testing | 24 | 0 | 24 |
| Phase 5: Hardening | 20 | 0 | 20 |
| Phase 6: Scraper | 12 | 0 | 12 |
| Phase 7: AWS | 21 | 0 | 21 |
| **Total** | **168** | **72** | **96** |

---

## Sprint Allocation (Updated)

| Sprint | Focus | Status |
|--------|-------|--------|
| **Sprint 1** | **Premium UI + Framer Motion** | ✅ Complete |
| **Sprint 2** | **Clerk Auth + Age Gate** | ✅ Complete |
| **Sprint 3** | **Admin Dashboard Part 1** | ✅ Complete |
| Sprint 4 | Admin Part 2 + Email | Next |
| Sprint 5 | Testing Foundation | Planned |
| Sprint 6 | E2E + CI | Planned |
| Sprint 7 | Hardening | Planned |
| Sprint 8 | Scraper + Deploy Prep | Planned |
| Sprint 9 | AWS Deployment | Planned |
