# GreenLeaf v2 - Key Context

**Last Updated:** 2026-01-17

---

## Project Overview

**Name:** GreenLeaf Dispensary
**Type:** Premium Cannabis E-commerce Platform
**Status:** v1 Complete, v2 Enhancement Phase

### Brand Direction
- **Target:** NYC professionals, 25-45, $100k+ income
- **Aesthetic:** Elegant, upscale, minimal
- **Inspiration:** Aesop, Apple Store, Mejuri
- **Vibe:** Premium retail, not "stoner culture"

---

## Key Files Reference

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Root monorepo config, scripts |
| `turbo.json` | Turborepo task definitions |
| `pnpm-workspace.yaml` | Workspace package definitions |
| `docker-compose.yml` | Local PostgreSQL + pgvector |
| `.env.example` | Environment variable template |

### Apps
| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js 15 storefront |
| `apps/web/app/` | App Router pages and layouts |
| `apps/web/server/` | tRPC routers |
| `apps/web/components/` | React components |
| `apps/scraper/` | Firecrawl data scraper |

### Packages
| Path | Purpose |
|------|---------|
| `packages/db/` | Prisma schema + client |
| `packages/ai/` | LangChain budtender |
| `packages/ui/` | Shared UI components |
| `packages/config/` | Shared configs |

### Infrastructure
| Path | Purpose |
|------|---------|
| `infra/` | Terraform AWS configs |
| `infra/main.tf` | Provider configuration |
| `infra/ecs.tf` | Fargate service |
| `infra/rds.tf` | PostgreSQL database |

---

## Key Decisions Made

### Architecture
1. **Monorepo with Turborepo** - Shared packages, optimized builds
2. **Next.js 15 App Router** - Server Components, streaming
3. **tRPC v11** - End-to-end type safety
4. **Prisma + pgvector** - ORM with vector search
5. **LangChain** - RAG-powered AI budtender

### Authentication (v2)
- **Decision:** Use Clerk for authentication
- **Rationale:** Fast integration, OAuth support, session management
- **Alternative considered:** Auth.js v5 (more work, less features)

### Age Verification (v2)
- **Decision:** Modal gate with 24h cookie
- **Rationale:** Legal compliance, minimal UX friction
- **Implementation:** Client-side modal + server middleware check

### Email System (v2)
- **Decision:** Resend + React Email
- **Rationale:** Modern DX, free tier, great templates
- **Alternative considered:** SendGrid (more complex)

---

## Dependencies & Versions

### Core Stack
```json
{
  "next": "15.1.4",
  "react": "19.0.0",
  "@trpc/server": "11.0.0-rc.682",
  "@trpc/react-query": "11.0.0-rc.682",
  "prisma": "6.2.1",
  "@langchain/openai": "0.3.17",
  "stripe": "17.5.0",
  "tailwindcss": "3.4.17"
}
```

### To Add in v2
```json
{
  "framer-motion": "^11.x",
  "@clerk/nextjs": "latest",
  "resend": "latest",
  "@react-email/components": "latest",
  "@sentry/nextjs": "latest",
  "vitest": "latest",
  "@playwright/test": "latest"
}
```

---

## Environment Variables

### Required (Current)
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/greenleaf
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
OPENAI_API_KEY=sk-proj-...
FIRECRAWL_API_KEY=fc-...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### New for v2
```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Resend
RESEND_API_KEY=re_...

# Sentry
SENTRY_DSN=https://...@sentry.io/...
SENTRY_AUTH_TOKEN=...

# Redis (Upstash)
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Design System

### Color Palette (Dark Luxury)
```css
--background: #0A0A0A;      /* Near black */
--surface: #141414;          /* Card backgrounds */
--surface-hover: #1A1A1A;    /* Hover states */
--border: #262626;           /* Subtle borders */
--accent: #C4A052;           /* Muted gold */
/* OR --accent: #8B9A6B;     /* Sage green alternative */
--text: #FAFAFA;             /* Primary text */
--text-muted: #6B6B6B;       /* Secondary text */
```

### Typography
```css
--font-heading: 'Geist Sans', sans-serif;
--font-body: 'Inter', sans-serif;
--line-height-relaxed: 1.7;
--letter-spacing-tight: -0.02em;
```

### Animation Principles
- Duration: 200-300ms
- Easing: ease-out for entrances, ease-in-out for hovers
- Spring: stiffness 300, damping 30 for interactions
- Stagger: 50-100ms between items in lists

### Component Patterns
- Cards: Large padding (p-6 to p-8), subtle borders
- Buttons: No shadows, subtle hover color shift
- Images: Object-cover, subtle rounded corners
- Spacing: Generous (gap-6 to gap-8 between sections)

---

## Database Schema Summary

### Current Models
- **Strain** - Cannabis strains with embeddings
- **Inventory** - Stock levels and pricing
- **Cart** - Session-based shopping cart
- **CartItem** - Items in cart
- **Order** - Completed purchases
- **OrderItem** - Items in order

### To Add in v2
- **User** - Clerk-synced user records (optional, for preferences)
- **AgeVerification** - Audit log of verifications

---

## API Routes

### tRPC Procedures
| Procedure | Type | Description |
|-----------|------|-------------|
| `strains.list` | Query | Get strains with filters |
| `strains.bySlug` | Query | Get single strain |
| `strains.featured` | Query | Get featured strains |
| `strains.search` | Query | Vector similarity search |
| `cart.get` | Query | Get current cart |
| `cart.add` | Mutation | Add item to cart |
| `cart.update` | Mutation | Update quantity |
| `cart.remove` | Mutation | Remove item |
| `checkout.create` | Mutation | Create Stripe session |
| `orders.list` | Query | List user orders |

### REST Endpoints
| Route | Method | Description |
|-------|--------|-------------|
| `/api/chat` | POST | AI budtender streaming |
| `/api/stripe/webhook` | POST | Stripe webhooks |
| `/api/health` | GET | Health check |

---

## Sprint Workflow

### Process
1. **Sprint Planning** → `scrum-leader` agent creates sprint plan
2. **Development** → Implement tasks, mark progress
3. **Sprint Review** → `scrum-leader` creates review
4. **PR Creation** → `sprint-code-reviewer` creates PR
5. **Code Review** → CodeRabbit reviews automatically
6. **Merge** → After approval
7. **Next Sprint** → Repeat

### File Locations
```
dev/
├── active/greenleaf-v2/        # Master plan and tasks
└── sprints/
    └── sprint-N/               # Sprint-specific docs
        ├── sprint-N-plan.md
        ├── sprint-N-status.md
        ├── sprint-N-review.md
        └── sprint-N-pr-summary.md
```

---

## External Service Accounts Needed

| Service | Purpose | Free Tier |
|---------|---------|-----------|
| Clerk | Auth | 10k MAU |
| Resend | Email | 3k/month |
| Sentry | Errors | 5k events |
| Upstash | Redis | 10k/day |
| Vercel | Hosting | Hobby tier |
| AWS | Infra | Free tier + ~$50/mo |

---

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build all packages
pnpm lint                   # Run linting
pnpm type-check             # TypeScript check

# Database
pnpm db:push                # Push schema changes
pnpm db:studio              # Open Prisma Studio
pnpm seed                   # Seed database

# Docker
docker-compose up -d        # Start Postgres
docker-compose down         # Stop Postgres

# Git
git checkout -b sprint-N    # Start sprint branch
gh pr create                # Create PR
```

---

## Known Issues & Gotchas

1. **pgvector extension** - Must run `CREATE EXTENSION vector;` manually on new DBs
2. **Stripe webhooks local** - Need `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. **OpenAI rate limits** - Embedding generation has 100ms delays built in
4. **Cart session** - Cookie name is `cart_session`, httpOnly
5. **tRPC RC version** - Using release candidate, API may change

---

## Useful Links

- [Next.js 15 Docs](https://nextjs.org/docs)
- [tRPC v11 Docs](https://trpc.io/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Clerk Docs](https://clerk.com/docs)
- [LangChain JS](https://js.langchain.com/docs)
- [Stripe Docs](https://stripe.com/docs)
- [Resend Docs](https://resend.com/docs)
