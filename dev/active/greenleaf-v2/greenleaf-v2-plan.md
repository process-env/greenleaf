# GreenLeaf Dispensary v2 - Comprehensive Development Plan

**Last Updated:** 2026-01-17

---

## Executive Summary

GreenLeaf Dispensary v2 is a premium cannabis e-commerce platform targeting **NYC professionals earning $100k+**. The design philosophy is **elegant, upscale, and minimal** - think Aesop meets Apple Store, not your typical dispensary.

**Brand Positioning:**
- **Target:** NYC professionals, 25-45, $100k+ income
- **Aesthetic:** Minimal, sophisticated, high-end retail feel
- **Tone:** Knowledgeable, approachable, never "stoner culture"
- **Experience:** Seamless, fast, premium - like ordering from Net-A-Porter

**Tech Enhancements for v2:**
- Framer Motion for buttery-smooth animations
- shadcn/ui with custom dark/neutral color palette
- Micro-interactions that feel premium
- Typography-forward design (Geist, Inter)

**Goal:** Create a dispensary experience that NYC professionals aren't embarrassed to have open on their laptop at a coffee shop.

---

## Current State Analysis

### What Works (v1 Strengths)
| Feature | Status | Quality |
|---------|--------|---------|
| Strain Catalog | Complete | Good - filters, search, pagination |
| AI Budtender | Complete | Good - RAG, streaming, LangChain |
| Shopping Cart | Complete | Good - session-based, real-time |
| Stripe Checkout | Complete | Good - webhooks, order creation |
| Database Schema | Complete | Good - pgvector, proper relations |
| Monorepo Structure | Complete | Good - Turborepo, shared packages |
| UI Components | Complete | Good - shadcn/ui, Tailwind |

### Critical Gaps (v1 Weaknesses)
| Gap | Impact | Priority |
|-----|--------|----------|
| No Authentication | Users can't track orders | P0 |
| No Age Verification | Legal compliance risk | P0 |
| No Admin Dashboard | Manual DB management | P1 |
| No Email Notifications | Poor UX | P1 |
| No Testing | Reliability risk | P1 |
| No Error Tracking | Blind to production issues | P2 |
| Hardcoded Strain Data | Scraper not functional | P2 |
| No Rate Limiting | Security risk | P2 |

### Technical Debt
- Cart data lost on browser close (cookie-only)
- N+1 queries in cart/strain fetches
- No input validation middleware
- Magic strings in Stripe API version
- Console.error only logging
- No CORS configuration

---

## Proposed Future State (v2)

### Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                        CloudFront CDN                           │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                    Application Load Balancer                    │
└─────────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────────┐
│                      ECS Fargate Cluster                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Next.js Web   │  │   Next.js Web   │  │   Next.js Web   │ │
│  │   (Container)   │  │   (Container)   │  │   (Container)   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
        │                       │                       │
┌───────┴───────┐       ┌───────┴───────┐       ┌───────┴───────┐
│  RDS Postgres │       │    Redis      │       │    Resend     │
│   + pgvector  │       │   (Cache)     │       │   (Email)     │
└───────────────┘       └───────────────┘       └───────────────┘
```

### New Features
1. **Premium UI Overhaul** - Framer Motion animations, refined shadcn/ui
2. **Authentication** - Clerk for OAuth + session management
3. **Age Verification** - Elegant modal gate with cookie persistence
4. **Admin Dashboard** - Product/order/user management
5. **Email System** - Resend + React Email templates
6. **Testing Suite** - Vitest + Playwright + MSW
7. **Error Tracking** - Sentry integration
8. **Rate Limiting** - Redis-backed API protection

### Design Direction
```
Color Palette (Dark, Sophisticated):
- Background: #0A0A0A (near black)
- Surface: #141414 (card backgrounds)
- Accent: #C4A052 (muted gold) or #8B9A6B (sage green)
- Text: #FAFAFA (off-white)
- Muted: #6B6B6B (secondary text)

Typography:
- Headings: Geist Sans (clean, modern)
- Body: Inter (readable, professional)
- Accent: Optional serif for luxury feel

Animation Principles:
- Subtle, never flashy
- 200-300ms durations
- Ease-out for entrances
- Spring physics for interactions
- Stagger reveals for lists
```

---

## Implementation Phases

### Phase 0: Premium UI Foundation (P0)
**Objective:** Establish upscale visual identity with Framer Motion

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 0.1 | Install framer-motion package | S | None |
| 0.2 | Create motion component library | M | 0.1 |
| 0.3 | Update Tailwind color palette (dark luxury) | M | None |
| 0.4 | Refine typography (Geist + Inter) | S | None |
| 0.5 | Create fade-in/slide-up page transitions | M | 0.2 |
| 0.6 | Add stagger animations for product grids | M | 0.2 |
| 0.7 | Create hover micro-interactions for cards | M | 0.2 |
| 0.8 | Refine Header with scroll effects | M | 0.2 |
| 0.9 | Update Button variants (subtle, premium) | S | 0.3 |
| 0.10 | Create loading skeletons with shimmer | M | 0.2 |
| 0.11 | Redesign homepage hero (minimal, bold) | L | 0.2-0.5 |
| 0.12 | Redesign strain cards (clean, spacious) | L | 0.2, 0.7 |
| 0.13 | Update strain detail page (gallery feel) | L | 0.2 |
| 0.14 | Refine cart sidebar (sleek drawer) | M | 0.2 |
| 0.15 | Polish AI budtender chat UI | M | 0.2 |

**Acceptance Criteria:**
- [ ] Every page has smooth entrance animations
- [ ] Product grid staggers in elegantly
- [ ] Hover states feel responsive and premium
- [ ] Color palette is cohesive dark/gold or dark/sage
- [ ] Typography hierarchy is clear and sophisticated
- [ ] Site feels like a luxury retail experience

---

### Phase 1: Foundation & Auth (P0)
**Objective:** Add user authentication and age verification

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 1.1 | Install and configure Clerk | M | None |
| 1.2 | Create auth middleware | S | 1.1 |
| 1.3 | Add protected routes (orders, profile) | M | 1.2 |
| 1.4 | Link cart to user account | M | 1.2 |
| 1.5 | Build age verification modal | M | None |
| 1.6 | Add age verification cookie | S | 1.5 |
| 1.7 | Update tRPC context with auth | M | 1.1 |

**Acceptance Criteria:**
- [ ] Users can sign up/login via Google, email
- [ ] Protected routes redirect to login
- [ ] Cart persists across sessions for logged-in users
- [ ] Age modal appears on first visit
- [ ] Age verification cookie expires in 24h

### Phase 2: Admin Dashboard (P1)
**Objective:** Build admin interface for store management

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 2.1 | Create admin layout with sidebar | M | Phase 1 |
| 2.2 | Build strain CRUD pages | L | 2.1 |
| 2.3 | Build inventory management | M | 2.1 |
| 2.4 | Build order management | M | 2.1 |
| 2.5 | Add role-based access (isAdmin) | M | 2.1 |
| 2.6 | Create dashboard analytics | M | 2.4 |
| 2.7 | Add image upload (S3/Cloudinary) | L | 2.2 |

**Acceptance Criteria:**
- [ ] Admin can create/edit/delete strains
- [ ] Admin can manage inventory levels
- [ ] Admin can view/update order status
- [ ] Admin sees sales dashboard
- [ ] Only users with admin role can access

### Phase 3: Email & Notifications (P1)
**Objective:** Implement transactional email system

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 3.1 | Set up Resend integration | S | None |
| 3.2 | Create React Email templates | M | 3.1 |
| 3.3 | Send order confirmation emails | M | 3.2 |
| 3.4 | Send shipping/fulfillment emails | M | 3.2 |
| 3.5 | Add welcome email on signup | S | 3.2, Phase 1 |
| 3.6 | Create email preview endpoint | S | 3.2 |

**Acceptance Criteria:**
- [ ] Order confirmation sent after payment
- [ ] Status update email on fulfillment
- [ ] Welcome email on new account
- [ ] All emails have responsive design
- [ ] Email templates use React Email

### Phase 4: Testing Suite (P1)
**Objective:** Add comprehensive test coverage

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 4.1 | Configure Vitest for packages | M | None |
| 4.2 | Write unit tests for AI package | M | 4.1 |
| 4.3 | Write unit tests for tRPC routers | L | 4.1 |
| 4.4 | Configure Playwright for E2E | M | None |
| 4.5 | Write E2E tests for checkout flow | L | 4.4 |
| 4.6 | Set up MSW for API mocking | M | 4.1 |
| 4.7 | Add CI pipeline (GitHub Actions) | M | 4.1, 4.4 |

**Acceptance Criteria:**
- [ ] Unit tests for all tRPC procedures
- [ ] Unit tests for LangChain chain/retriever
- [ ] E2E test: browse → cart → checkout
- [ ] E2E test: AI budtender conversation
- [ ] CI runs tests on every PR
- [ ] Minimum 70% code coverage

### Phase 5: Production Hardening (P2)
**Objective:** Make the app production-ready

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 5.1 | Add Sentry error tracking | M | None |
| 5.2 | Implement rate limiting (Redis) | M | None |
| 5.3 | Add request logging | S | None |
| 5.4 | Optimize database queries | M | None |
| 5.5 | Add input validation middleware | M | None |
| 5.6 | Configure CORS properly | S | None |
| 5.7 | Add health check endpoints | S | None |
| 5.8 | Set up Redis caching | L | 5.2 |

**Acceptance Criteria:**
- [ ] All errors captured in Sentry
- [ ] API rate limited to 100 req/min per IP
- [ ] Structured JSON logging
- [ ] No N+1 queries
- [ ] All inputs validated with Zod
- [ ] Health endpoints return status

### Phase 6: Scraper Enhancement (P2)
**Objective:** Make Firecrawl scraper functional

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 6.1 | Update Firecrawl extraction schema | M | None |
| 6.2 | Add retry logic and error handling | M | 6.1 |
| 6.3 | Implement incremental scraping | M | 6.2 |
| 6.4 | Add image downloading/hosting | L | 6.1 |
| 6.5 | Create scraper scheduling (cron) | M | 6.3 |
| 6.6 | Add duplicate detection | S | 6.3 |

**Acceptance Criteria:**
- [ ] Scraper extracts real Leafly data
- [ ] Failed requests retry 3 times
- [ ] Only new strains are added
- [ ] Images stored in S3/CDN
- [ ] Scraper can run on schedule

### Phase 7: AWS Deployment (P3)
**Objective:** Deploy to production AWS infrastructure

| Task | Description | Effort | Dependencies |
|------|-------------|--------|--------------|
| 7.1 | Finalize Terraform configs | L | All phases |
| 7.2 | Set up ECR repositories | S | 7.1 |
| 7.3 | Create GitHub Actions deploy | M | 7.2 |
| 7.4 | Configure Secrets Manager | M | 7.1 |
| 7.5 | Set up CloudWatch monitoring | M | 7.1 |
| 7.6 | Configure auto-scaling | M | 7.1 |
| 7.7 | Set up custom domain + SSL | M | 7.1 |
| 7.8 | Deploy and verify | L | All |

**Acceptance Criteria:**
- [ ] App deployed to ECS Fargate
- [ ] RDS running with pgvector
- [ ] CloudFront serving static assets
- [ ] Auto-scaling on CPU/memory
- [ ] Custom domain with SSL
- [ ] Zero-downtime deployments

---

## Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Clerk integration complexity | Medium | High | Start with basic email auth, add OAuth later |
| Firecrawl API changes | Medium | Medium | Keep fallback strain data, add monitoring |
| AWS costs exceed budget | Medium | Medium | Use Fargate Spot, right-size RDS |
| pgvector performance issues | Low | High | Add proper indexing, monitor query times |
| Stripe webhook failures | Low | High | Add retry logic, dead letter queue |
| E2E tests flaky | High | Medium | Use proper waits, mock external services |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Test Coverage | >70% | Jest/Vitest coverage report |
| Lighthouse Score | >90 | Chrome DevTools audit |
| API Response Time (p95) | <200ms | Sentry/CloudWatch |
| Error Rate | <0.1% | Sentry dashboard |
| Checkout Completion | >80% | Stripe dashboard |
| AI Response Time | <3s | Custom logging |
| Deployment Frequency | >5/week | GitHub Actions |
| Zero Critical Bugs | 0 | Sentry alerts |

---

## Required Resources & Dependencies

### External Services
| Service | Purpose | Cost |
|---------|---------|------|
| Clerk | Authentication | Free tier (10k MAU) |
| Resend | Transactional email | Free tier (3k/month) |
| Sentry | Error tracking | Free tier (5k errors) |
| Redis (Upstash) | Rate limiting, caching | Free tier |
| AWS | Infrastructure | ~$50-100/month |
| OpenAI | Embeddings, chat | ~$5-20/month |
| Firecrawl | Web scraping | ~$20/month |
| Stripe | Payments | 2.9% + $0.30 per txn |

### Development Tools
- Vitest - Unit testing
- Playwright - E2E testing
- MSW - API mocking
- React Email - Email templates
- GitHub Actions - CI/CD

### Team Knowledge Requirements
- Next.js 15 App Router
- tRPC v11
- Clerk authentication
- LangChain/RAG patterns
- AWS ECS/Fargate
- Terraform basics

---

## Timeline Overview

```
Week 1:    Phase 0 - Premium UI Foundation (Framer Motion, Design System)
Week 2-3:  Phase 1 - Authentication & Age Verification
Week 4-5:  Phase 2 - Admin Dashboard
Week 6:    Phase 3 - Email Notifications
Week 7-8:  Phase 4 - Testing Suite
Week 9:    Phase 5 - Production Hardening
Week 10:   Phase 6 - Scraper Enhancement
Week 11:   Phase 7 - AWS Deployment
```

**Total Estimated Duration:** 11 weeks (part-time) / 6 weeks (full-time)

---

## Implementation Priority Order

1. **Phase 0** - UI first! The brand experience is critical for this demographic
2. **Phase 1** - Auth is foundational for everything
3. **Phase 4** - Tests should be written alongside code
4. **Phase 3** - Emails needed for order flow
5. **Phase 2** - Admin dashboard for management
6. **Phase 5** - Hardening before deployment
7. **Phase 6** - Scraper is nice-to-have
8. **Phase 7** - Deployment after everything works

---

## Appendix: Tech Stack Versions

| Package | Current | Target |
|---------|---------|--------|
| Next.js | 15.1.4 | 15.x latest |
| React | 19.0.0 | 19.x latest |
| tRPC | 11.0.0-rc | 11.x stable |
| Prisma | 6.2.1 | 6.x latest |
| TypeScript | 5.x | 5.x latest |
| Tailwind | 3.4.17 | 3.4.x (stable) |
| LangChain | 0.3.x | 0.3.x latest |
| **Framer Motion** | - | **11.x latest** |
| shadcn/ui | present | refined |
| Geist Font | present | keep |

## Design References

**Inspiration Sites:**
- Aesop (aesop.com) - minimal, text-focused, premium feel
- Apple Store - clean product presentation
- Mejuri (mejuri.com) - modern luxury e-commerce
- Need Supply (archive) - editorial product pages

**Key UX Principles:**
1. Whitespace is luxury - don't crowd the layout
2. Let typography breathe - generous line heights
3. Subtle motion > flashy effects
4. Dark mode default - sophisticated evening browsing
5. Product imagery is hero - minimal UI chrome
