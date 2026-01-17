# GreenLeaf v2 - Key Context

**Last Updated:** 2026-01-17

---

## Project Overview

**Name:** GreenLeaf Dispensary
**Type:** Premium Cannabis E-commerce Platform
**Status:** Sprint 7 Complete, PR Ready for Review

### Current Sprint Status
- **Sprint 1 (UI)**: ✅ Complete + Merged
- **Sprint 2 (Auth)**: ✅ Complete + Merged
- **Sprint 3 (Admin Part 1)**: ✅ Complete + Merged
- **Sprint 4 (Orders + Email)**: ✅ Complete + Merged
- **Sprint 5 (Stripe Checkout)**: ✅ Complete + Merged
- **Sprint 6 (Testing)**: ✅ Complete (PR merged)
- **Sprint 7 (Hardening)**: ✅ Complete, PR open (sprint-7 branch)

### Brand Direction
- **Target:** NYC professionals, 25-45, $100k+ income
- **Aesthetic:** Elegant, upscale, minimal
- **Inspiration:** Aesop, Apple Store, Mejuri
- **Vibe:** Premium retail, not "stoner culture"

---

## Session Summary (2026-01-17)

### Completed This Session

1. **Sprint 5 - Stripe Checkout & Webhooks** (continued from previous session)
   - Fixed CodeRabbit issues: negative inventory protection, Stripe integer quantity
   - Merged to main

2. **Sprint 6 - Testing Infrastructure**
   - Vitest setup with jsdom environment
   - Test utilities and mocks for Next.js, Clerk, Prisma, Resend, @react-email
   - Unit tests for utilities (cn, formatPrice, formatGrams, slugify) - 14 tests
   - Unit tests for cart tRPC procedures - 7 tests
   - Playwright E2E configuration
   - Basic E2E tests for homepage, catalog, cart
   - GitHub Actions CI workflow (lint, typecheck, unit tests, E2E)
   - **21 total unit tests passing**

3. **Sprint 7 - Production Hardening**
   - Sentry error tracking (@sentry/nextjs v10)
   - Rate limiting with Upstash Redis
   - Pino structured JSON logging
   - Security headers (HSTS, X-Frame-Options, etc.)
   - Global error boundary component
   - Performance optimizations (compression, caching)

### Key Technical Decisions

1. **Vitest mocks via aliases**: Used `resolve.alias` in vitest.config.ts to mock @clerk/nextjs, @greenleaf/db, next/headers, resend, @react-email/components
2. **pnpm issue with MINGW64**: Commands produce no output; use `node -e "execSync(...)"` wrapper to see output
3. **Sprint-7 based on sprint-6**: Due to sprint-6 merge timing, sprint-7 branched from sprint-6

### Important Files Created This Session

**Sprint 6:**
- `apps/web/vitest.config.ts` - Vitest configuration with aliases
- `apps/web/playwright.config.ts` - Playwright E2E config
- `apps/web/test/setup.ts` - Test setup with mocks
- `apps/web/test/mocks/` - Mock files for Clerk, DB, Resend, etc.
- `apps/web/test/helpers/` - Test utilities (render, trpc caller)
- `apps/web/lib/utils.test.ts` - Utility function tests
- `apps/web/server/routers/cart.test.ts` - Cart procedure tests
- `apps/web/e2e/home.spec.ts` - E2E tests
- `.github/workflows/ci.yml` - CI pipeline

**Sprint 7:**
- `apps/web/sentry.client.config.ts` - Sentry client config
- `apps/web/sentry.server.config.ts` - Sentry server config
- `apps/web/sentry.edge.config.ts` - Sentry edge config
- `apps/web/instrumentation.ts` - Next.js 15 instrumentation
- `apps/web/app/global-error.tsx` - Global error boundary
- `apps/web/lib/rate-limit.ts` - Upstash rate limiter
- `apps/web/lib/logger.ts` - Pino structured logger
- `apps/web/next.config.ts` - Updated with security headers + Sentry

---

## Environment Variables (Current)

```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/greenleaf

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
CLERK_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_SECRET_HERE

# Resend
RESEND_API_KEY=re_YOUR_KEY_HERE

# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Sentry (Sprint 7 - NEW)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=

# Upstash Redis (Sprint 7 - NEW, optional)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Logging
LOG_LEVEL=info
```

---

## Git Branch Status

| Branch | Status | PR |
|--------|--------|-----|
| `main` | Updated with Sprint 5 | - |
| `sprint-6` | Merged (user confirmed) | ✅ |
| `sprint-7` | Ready for merge | Open - needs review |

### Current Branch: `sprint-7`
- Based on: `sprint-6`
- Commits: 1 (`feat(hardening): Sprint 7 - Production hardening`)

---

## Test Commands

```bash
# Unit tests
pnpm --filter @greenleaf/web test:run

# Unit tests with coverage
pnpm --filter @greenleaf/web test:coverage

# E2E tests (requires dev server or starts one)
pnpm --filter @greenleaf/web test:e2e

# E2E tests with UI
pnpm --filter @greenleaf/web test:e2e:ui
```

---

## Next Steps (After Sprint 7 Merge)

1. **Set up Sentry project** and add DSN to environment
2. **Set up Upstash Redis** for rate limiting (optional but recommended)
3. **Phase 7: AWS Deployment** (if continuing)
   - ECS/Fargate setup
   - RDS PostgreSQL
   - CloudFront CDN
   - Route 53 DNS

---

## Known Issues & Gotchas

1. **pgvector extension** - Must run `CREATE EXTENSION vector;` manually
2. **Stripe webhooks local** - Need `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
3. **Admin access** - Requires Clerk publicMetadata.role = "admin"
4. **Cart session** - Cookie name is `cart_session`
5. **pnpm on MINGW64** - Use node wrapper to see command output
6. **Sentry** - DSN required to enable, disabled without it
7. **Rate limiting** - Disabled without Upstash credentials

---

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build all packages
pnpm tsc --noEmit          # TypeScript check

# Database
pnpm db:push                # Push schema changes
pnpm db:studio              # Open Prisma Studio

# Testing
pnpm test:run               # Run unit tests
pnpm test:e2e               # Run E2E tests

# Git
git checkout sprint-7       # Current active branch
git push                    # Push to update PR

# Stripe (local webhooks)
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```
