# Skill Version Registry

**Last Updated:** 2026-01-11
**Schema Version:** 2.0

This file tracks the version status of all Claude Code skills and their framework dependencies.

---

## Version Status Overview

| Skill | Version | Last Updated | Status | Framework Versions |
|-------|---------|--------------|--------|-------------------|
| ai-sdk-agents | 2.0.0 | 2026-01-11 | Updated | AI SDK 6.x |
| auth-patterns | 1.0.0 | 2026-01-11 | New | Auth.js 5.x, Clerk 6.x |
| backend-dev-guidelines | 2.0.0 | 2026-01-11 | Updated | Node.js 20+, Sentry v9 |
| convex-realtime | 2.0.0 | 2026-01-11 | Updated | Convex 1.31+ |
| drizzle-orm | 1.0.0 | 2026-01-11 | New | Drizzle ORM 0.36+, drizzle-kit 0.30+ |
| email-patterns | 1.0.0 | 2026-01-11 | New | Resend 4.x, React Email 3.x |
| error-tracking | 2.0.0 | 2026-01-11 | Updated | Sentry v9/v10 |
| firecrawl | 2.0.0 | 2026-01-11 | Updated | Firecrawl v2.7 |
| framer-motion | 2.0.0 | 2026-01-11 | Updated | Motion 12.x |
| frontend-dev-guidelines | 2.0.0 | 2026-01-11 | Updated | React 19.2, MUI v7.3 |
| inngest | 2.0.0 | 2026-01-11 | Updated | Inngest v3.42+ |
| maplibre-animation | 2.0.0 | 2026-01-11 | Updated | MapLibre GL 5.x |
| nextjs-patterns | 2.0.0 | 2026-01-11 | Updated | Next.js 15/16 |
| postgres-optimization | 2.0.0 | 2026-01-11 | Updated | PostgreSQL 17 |
| react-hooks | 2.0.0 | 2026-01-11 | Updated | React 19.2 |
| redis-patterns | 2.0.0 | 2026-01-11 | Updated | ioredis 5.9+ |
| route-tester | 1.0.0 | 2023-11-12 | Stable | N/A |
| shadcn-patterns | 2.0.0 | 2026-01-11 | Updated | shadcn/ui 2.5+ |
| skill-developer | 2.0.0 | 2026-01-11 | Updated | N/A |
| stripe-payments | 1.0.0 | 2026-01-11 | New | Stripe 17.x, Stripe.js 4.x |
| tailwindcss | 2.0.0 | 2026-01-11 | Updated | Tailwind CSS v4 |
| testing-patterns | 1.0.0 | 2026-01-11 | New | Vitest 4.x, Playwright 1.50+, MSW 2.x |
| tomtom-maps | 2.0.0 | 2026-01-11 | Deprecated | Web SDK v6 (EOL 2026-02) |
| trpc-patterns | 1.0.0 | 2026-01-11 | New | tRPC 11.x, TanStack Query 5.x |
| zustand-state | 2.0.0 | 2026-01-11 | Updated | Zustand v5.x |

---

## Framework Version Reference

Current framework versions as of 2026-01-11:

### Frontend
| Framework | Current Version | Skill Coverage |
|-----------|----------------|----------------|
| React | 19.2 | frontend-dev-guidelines, react-hooks |
| Next.js | 16.x | nextjs-patterns |
| Tailwind CSS | v4.0 | tailwindcss |
| MUI | v7.3.6 | frontend-dev-guidelines |
| Motion (Framer) | 12.25 | framer-motion |
| shadcn/ui | 2.5+ | shadcn-patterns |
| Zustand | 5.0.8 | zustand-state |

### Backend
| Framework | Current Version | Skill Coverage |
|-----------|----------------|----------------|
| Node.js | 20/22 LTS | backend-dev-guidelines |
| Sentry | v9/v10 | error-tracking, backend-dev-guidelines |
| PostgreSQL | 17.x | postgres-optimization |
| Redis/ioredis | 5.9.x | redis-patterns |
| Prisma | 6.x | backend-dev-guidelines |
| Drizzle ORM | 0.36+ | drizzle-orm |
| tRPC | 11.x | trpc-patterns |

### Authentication
| Framework | Current Version | Skill Coverage |
|-----------|----------------|----------------|
| Auth.js | 5.x | auth-patterns |
| Clerk | 6.x | auth-patterns |

### Testing
| Framework | Current Version | Skill Coverage |
|-----------|----------------|----------------|
| Vitest | 4.x | testing-patterns |
| Playwright | 1.50+ | testing-patterns |
| MSW | 2.x | testing-patterns |
| React Testing Library | 16.x | testing-patterns |

### Payments & Email
| Platform | Current Version | Skill Coverage |
|----------|----------------|----------------|
| Stripe | 17.x | stripe-payments |
| Stripe.js | 4.x | stripe-payments |
| Resend | 4.x | email-patterns |
| React Email | 3.x | email-patterns |

### Platforms & APIs
| Platform | Current Version | Skill Coverage |
|----------|----------------|----------------|
| Vercel AI SDK | 6.x | ai-sdk-agents |
| Inngest | 3.42+ | inngest |
| Convex | 1.31+ | convex-realtime |
| Firecrawl | 2.7+ | firecrawl |
| MapLibre GL | 5.15 | maplibre-animation |
| TomTom SDK | v6 (deprecated) | tomtom-maps |

---

## Update History

### 2026-01-11 - New Skills Addition (v2.1.0)
- Added 6 new complementary skills for robust development environment:
  - **testing-patterns** - Vitest 4.x, React Testing Library, Playwright E2E, MSW v2
  - **auth-patterns** - Auth.js v5 and Clerk 6.x authentication patterns
  - **trpc-patterns** - tRPC v11 type-safe APIs with React Query
  - **drizzle-orm** - Type-safe SQL with Drizzle ORM 0.36+
  - **stripe-payments** - Stripe 17.x payments, subscriptions, webhooks
  - **email-patterns** - Resend 4.x and React Email 3.x transactional emails
- Updated skill-rules.json with triggers for all new skills
- Total skill count: 25 (19 existing + 6 new)

### 2026-01-11 - Major Update (v2.0.0)
- Added version metadata to all skills
- Updated nextjs-patterns for Next.js 15/16 (use cache, PPR)
- Updated ai-sdk-agents for AI SDK 6 (agent abstraction)
- Updated framer-motion to Motion rebrand
- Updated inngest for v3.42+ features
- Updated Sentry patterns to v9 across error-tracking and backend-dev-guidelines
- Updated frontend-dev-guidelines for React 19.2
- Added deprecation warning to tomtom-maps
- Created VERSIONS.md and DEPRECATIONS.md tracking files

### 2023-11-12 - Initial Release (v1.0.0)
- Initial skill set created
- 19 skills covering frontend, backend, database, and specialized domains

---

## Maintenance Schedule

**Quarterly Review:**
- Check framework release notes for breaking changes
- Verify code examples still compile
- Update deprecated APIs

**Version Bump Guidelines:**
- **Patch (x.x.1):** Typo fixes, minor clarifications
- **Minor (x.1.0):** New examples, expanded coverage, non-breaking updates
- **Major (x.0.0):** Framework version updates, breaking pattern changes, deprecations
