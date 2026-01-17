# GreenLeaf v2 - Task Checklist

**Last Updated:** 2026-01-17
**Target Demographic:** NYC Professionals, $100k+
**Design:** Elegant, Upscale, Minimal

---

## Phase 0: Premium UI Foundation (P0) - SPRINT 1

### 0.1 Framer Motion Setup
- [ ] Install `framer-motion` package
- [ ] Create `lib/motion.ts` with reusable variants
- [ ] Create `components/motion/` directory
- [ ] Build `FadeIn` wrapper component
- [ ] Build `SlideUp` wrapper component
- [ ] Build `StaggerContainer` for lists

### 0.2 Color Palette Refinement
- [ ] Update `tailwind.config.ts` with luxury palette
- [ ] Define dark background colors (#0A0A0A, #141414)
- [ ] Choose accent color (gold #C4A052 or sage #8B9A6B)
- [ ] Update CSS variables in `globals.css`
- [ ] Create color tokens for consistent usage

### 0.3 Typography System
- [ ] Verify Geist font is properly loaded
- [ ] Add Inter as body font fallback
- [ ] Define type scale (heading sizes, body, captions)
- [ ] Increase line-heights for luxury feel
- [ ] Add letter-spacing adjustments

### 0.4 Component Refinements
- [ ] Update Button variants (minimal, no shadows)
- [ ] Refine Card component (more padding, subtle borders)
- [ ] Update Badge component (pill style, muted colors)
- [ ] Create shimmer Skeleton component
- [ ] Add smooth focus states

### 0.5 Page Transitions
- [ ] Create `PageTransition` wrapper component
- [ ] Add fade-in on route changes
- [ ] Add subtle slide-up for content
- [ ] Configure AnimatePresence for exit animations

### 0.6 Homepage Redesign
- [ ] Redesign hero section (bold typography, minimal)
- [ ] Add entrance animation to hero
- [ ] Refine featured strains grid
- [ ] Add stagger animation to strain cards
- [ ] Update "Why GreenLeaf" section styling
- [ ] Polish footer (minimal, clean)

### 0.7 Strain Catalog Refinements
- [ ] Redesign strain cards (more whitespace)
- [ ] Add hover scale + shadow micro-interaction
- [ ] Implement stagger animation on load
- [ ] Refine filter sidebar styling
- [ ] Add smooth filter transitions
- [ ] Polish pagination styling

### 0.8 Strain Detail Page
- [ ] Create gallery-style image presentation
- [ ] Add image zoom on hover
- [ ] Refine product info layout (generous spacing)
- [ ] Polish "Add to Cart" interaction
- [ ] Add smooth quantity selector
- [ ] Refine "Similar Strains" carousel

### 0.9 Cart Experience
- [ ] Convert cart to slide-out drawer
- [ ] Add smooth open/close animation
- [ ] Polish cart item cards
- [ ] Add remove animation (fade out + collapse)
- [ ] Refine checkout button styling

### 0.10 AI Budtender Polish
- [ ] Refine chat container styling
- [ ] Add typing indicator animation
- [ ] Polish message bubble styling
- [ ] Add smooth message entrance
- [ ] Refine suggested prompts styling

---

## Phase 1: Authentication & Age Verification (P0) - SPRINT 2

### 1.1 Clerk Setup
- [ ] Install `@clerk/nextjs` package
- [ ] Create Clerk application (dev + prod)
- [ ] Add Clerk env vars to `.env.local`
- [ ] Configure `ClerkProvider` in root layout
- [ ] Add Clerk middleware for route protection
- [ ] Test sign up / sign in flow

### 1.2 Auth Integration
- [ ] Create auth middleware (`middleware.ts`)
- [ ] Define public routes (home, strains, budtender)
- [ ] Define protected routes (orders, profile, checkout success)
- [ ] Add `SignInButton` / `UserButton` to header
- [ ] Update tRPC context to include `userId`
- [ ] Create `protectedProcedure` in tRPC

### 1.3 Cart-User Linking
- [ ] Add optional `userId` to Cart model
- [ ] Update cart.get to check userId if logged in
- [ ] Merge anonymous cart on login
- [ ] Update cart procedures for auth

### 1.4 Age Verification
- [ ] Create `AgeVerificationModal` component
- [ ] Add age verification state/cookie logic
- [ ] Create middleware to check age cookie
- [ ] Style modal with shadcn/ui Dialog
- [ ] Add "Remember for 24 hours" checkbox
- [ ] Test age gate flow

---

## Phase 2: Admin Dashboard (P1)

### 2.1 Admin Layout
- [ ] Create `/admin` route group
- [ ] Build admin sidebar navigation
- [ ] Add admin role check middleware
- [ ] Create admin dashboard home page
- [ ] Add Clerk `publicMetadata.role` for admin check

### 2.2 Strain Management
- [ ] Create strains list page with table
- [ ] Add strain create form
- [ ] Add strain edit form
- [ ] Add strain delete with confirmation
- [ ] Implement image upload (Cloudinary/S3)
- [ ] Add bulk actions (delete, update stock)

### 2.3 Inventory Management
- [ ] Create inventory overview page
- [ ] Add quick stock update interface
- [ ] Add price update interface
- [ ] Show low stock alerts
- [ ] Add inventory history log

### 2.4 Order Management
- [ ] Create orders list page
- [ ] Add order detail view
- [ ] Add order status update buttons
- [ ] Add order search/filter
- [ ] Show order timeline

### 2.5 Dashboard Analytics
- [ ] Create sales overview cards
- [ ] Add revenue chart (daily/weekly/monthly)
- [ ] Add top selling strains widget
- [ ] Add recent orders widget
- [ ] Add inventory alerts widget

---

## Phase 3: Email Notifications (P1)

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

## Phase 4: Testing Suite (P1)

### 4.1 Vitest Setup
- [ ] Install vitest and dependencies
- [ ] Create vitest.config.ts
- [ ] Set up test utilities and mocks
- [ ] Configure coverage reporting

### 4.2 Unit Tests - Packages
- [ ] Test `@greenleaf/ai` chain functions
- [ ] Test `@greenleaf/ai` retriever functions
- [ ] Test `@greenleaf/db` client exports
- [ ] Test utility functions

### 4.3 Unit Tests - tRPC
- [ ] Test strains router procedures
- [ ] Test cart router procedures
- [ ] Test checkout router procedures
- [ ] Test orders router procedures
- [ ] Mock Prisma client for tests

### 4.4 Playwright Setup
- [ ] Install @playwright/test
- [ ] Create playwright.config.ts
- [ ] Set up test fixtures
- [ ] Configure CI reporter

### 4.5 E2E Tests
- [ ] Test homepage loads
- [ ] Test strain catalog browsing
- [ ] Test strain detail page
- [ ] Test add to cart flow
- [ ] Test checkout flow (mock Stripe)
- [ ] Test AI budtender conversation
- [ ] Test age verification flow

### 4.6 CI Pipeline
- [ ] Create GitHub Actions workflow
- [ ] Run lint on PR
- [ ] Run type-check on PR
- [ ] Run unit tests on PR
- [ ] Run E2E tests on PR
- [ ] Add test status badge to README

---

## Phase 5: Production Hardening (P2)

### 5.1 Error Tracking
- [ ] Install @sentry/nextjs
- [ ] Run Sentry wizard setup
- [ ] Configure Sentry DSN
- [ ] Add error boundaries
- [ ] Test error capture

### 5.2 Rate Limiting
- [ ] Install @upstash/ratelimit
- [ ] Create rate limit middleware
- [ ] Apply to API routes
- [ ] Apply to tRPC procedures
- [ ] Configure limits per route

### 5.3 Logging
- [ ] Add structured logging utility
- [ ] Log API requests
- [ ] Log errors with context
- [ ] Log important business events
- [ ] Configure log levels by env

### 5.4 Performance
- [ ] Audit database queries for N+1
- [ ] Add Prisma query logging in dev
- [ ] Optimize strain list query
- [ ] Add Redis caching for hot data
- [ ] Implement ISR for strain pages

### 5.5 Security
- [ ] Add input validation middleware
- [ ] Configure CORS properly
- [ ] Add security headers
- [ ] Audit for XSS vectors
- [ ] Review Stripe webhook signature

### 5.6 Health Checks
- [ ] Expand /api/health endpoint
- [ ] Check database connection
- [ ] Check Redis connection
- [ ] Check external service status
- [ ] Add readiness/liveness probes

---

## Phase 6: Scraper Enhancement (P2)

### 6.1 Firecrawl Improvements
- [ ] Update extraction schema for current Leafly
- [ ] Add proper error handling
- [ ] Add retry logic (3 attempts)
- [ ] Add rate limiting to respect robots.txt
- [ ] Log scraping progress

### 6.2 Data Pipeline
- [ ] Implement incremental scraping
- [ ] Add duplicate detection by slug
- [ ] Update existing strains vs insert
- [ ] Download and host images
- [ ] Generate embeddings for new strains

### 6.3 Scheduling
- [ ] Create scraper cron job
- [ ] Add Inngest or similar for scheduling
- [ ] Run weekly scrape
- [ ] Send admin notification on completion
- [ ] Log scrape statistics

---

## Phase 7: AWS Deployment (P3)

### 7.1 Infrastructure
- [ ] Review and update Terraform configs
- [ ] Configure variables for environment
- [ ] Run terraform plan
- [ ] Apply VPC and networking
- [ ] Apply RDS PostgreSQL
- [ ] Apply ECS cluster

### 7.2 Container Setup
- [ ] Create optimized Dockerfile
- [ ] Set up ECR repository
- [ ] Build and push image
- [ ] Test container locally
- [ ] Configure task definition

### 7.3 CI/CD
- [ ] Create GitHub Actions deploy workflow
- [ ] Add AWS credentials to secrets
- [ ] Deploy on merge to main
- [ ] Add rollback capability
- [ ] Configure blue/green deployment

### 7.4 DNS & SSL
- [ ] Configure Route 53 (or external DNS)
- [ ] Set up ACM certificate
- [ ] Configure CloudFront
- [ ] Set up custom domain
- [ ] Verify SSL working

### 7.5 Monitoring
- [ ] Set up CloudWatch dashboards
- [ ] Configure alarms for errors
- [ ] Configure alarms for latency
- [ ] Set up log groups
- [ ] Configure auto-scaling triggers

### 7.6 Final Verification
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Verify Stripe webhooks
- [ ] Verify email sending
- [ ] Verify AI budtender
- [ ] Load test with Artillery or k6
- [ ] Update README with live URL

---

## Progress Summary

| Phase | Tasks | Completed | Remaining |
|-------|-------|-----------|-----------|
| **Phase 0: UI** | **35** | **0** | **35** |
| Phase 1: Auth | 20 | 0 | 20 |
| Phase 2: Admin | 21 | 0 | 21 |
| Phase 3: Email | 13 | 0 | 13 |
| Phase 4: Testing | 24 | 0 | 24 |
| Phase 5: Hardening | 20 | 0 | 20 |
| Phase 6: Scraper | 12 | 0 | 12 |
| Phase 7: AWS | 21 | 0 | 21 |
| **Total** | **166** | **0** | **166** |

---

## Sprint Allocation

| Sprint | Focus | Tasks |
|--------|-------|-------|
| **Sprint 1** | **Premium UI + Framer Motion** | **Phase 0 (35 tasks)** |
| Sprint 2 | Clerk Auth + Age Gate | Phase 1 (20 tasks) |
| Sprint 3 | Admin Dashboard Part 1 | Phase 2.1-2.3 (15 tasks) |
| Sprint 4 | Admin + Email | Phase 2.4-2.5, Phase 3 (19 tasks) |
| Sprint 5 | Testing Foundation | Phase 4.1-4.3 (15 tasks) |
| Sprint 6 | E2E + CI | Phase 4.4-4.6 (9 tasks) |
| Sprint 7 | Hardening | Phase 5 (20 tasks) |
| Sprint 8 | Scraper + Deploy Prep | Phase 6 (12 tasks) |
| Sprint 9 | AWS Deployment | Phase 7 (21 tasks) |
