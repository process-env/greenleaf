# GreenLeaf v2 - Key Context

**Last Updated:** 2026-01-17

---

## Project Overview

**Name:** GreenLeaf Dispensary
**Type:** Premium Cannabis E-commerce Platform
**Status:** Sprint 3 Complete, PR Ready for Review

### Current Sprint Status
- **Sprint 1 (UI)**: ✅ Complete + Merged
- **Sprint 2 (Auth)**: ✅ Complete, PR open (sprint-2 branch)
- **Sprint 3 (Admin)**: ✅ Complete, PR open (sprint-3 branch)

### Brand Direction
- **Target:** NYC professionals, 25-45, $100k+ income
- **Aesthetic:** Elegant, upscale, minimal
- **Inspiration:** Aesop, Apple Store, Mejuri
- **Vibe:** Premium retail, not "stoner culture"

---

## Session Summary (2026-01-17)

### Completed This Session
1. **Fixed Sprint 2 CodeRabbit issues** - stagger delay, THC 0% display, cart race conditions
2. **Built Sprint 3 Admin Dashboard** - Full admin UI with strain CRUD, inventory management
3. **Fixed Sprint 3 CodeRabbit issues** - framer-motion upgrade, cart security, inventory guards

### Key Security Fixes Applied
- **Cross-user cart exposure**: Session carts now only used if anonymous (`!cart.userId`)
- **Inventory guard**: Cart add validates `existingGrams + newGrams <= inventory.quantity`
- **OrderItem cascade**: Changed to `onDelete: SetNull` to preserve order history

### Important Decisions Made
1. **framer-motion v12**: Upgraded for React 19 compatibility (v11 incompatible)
2. **Cart linking strategy**: Link anonymous carts to users, not merge (simpler)
3. **OrderItem.strainId nullable**: Allows strain deletion without breaking orders
4. **Admin role check**: Uses Clerk `publicMetadata.role === "admin"` at layout level

---

## Key Files Reference

### Configuration
| File | Purpose |
|------|---------|
| `package.json` | Root monorepo config, scripts |
| `turbo.json` | Turborepo task definitions |
| `pnpm-workspace.yaml` | Workspace package definitions |
| `docker-compose.yml` | Local PostgreSQL + pgvector |
| `.env.local` | Environment variables (Clerk keys added) |

### Apps
| Path | Purpose |
|------|---------|
| `apps/web/` | Next.js 15 storefront |
| `apps/web/app/(store)/` | Public storefront routes |
| `apps/web/app/(auth)/` | Auth pages (sign-in, sign-up) |
| `apps/web/app/(admin)/` | **NEW** Admin dashboard routes |
| `apps/web/server/` | tRPC routers |
| `apps/web/components/` | React components |

### New Admin Files (Sprint 3)
| Path | Purpose |
|------|---------|
| `app/(admin)/layout.tsx` | Admin shell with role check |
| `app/(admin)/admin/page.tsx` | Dashboard home with stats |
| `app/(admin)/admin/strains/page.tsx` | Strain list with table |
| `app/(admin)/admin/strains/new/page.tsx` | Create strain form |
| `app/(admin)/admin/strains/[id]/page.tsx` | Edit strain form |
| `app/(admin)/admin/inventory/page.tsx` | Inventory inline editing |
| `components/admin-sidebar.tsx` | Admin navigation |
| `components/admin/strain-form.tsx` | Reusable strain form |
| `server/routers/admin.ts` | Admin API procedures |

### Packages
| Path | Purpose |
|------|---------|
| `packages/db/` | Prisma schema + client |
| `packages/ai/` | LangChain budtender |

---

## Database Schema Changes

### Sprint 2 Changes
```prisma
model Cart {
  userId    String?    @unique  // One cart per user
}
```

### Sprint 3 Changes
```prisma
model OrderItem {
  strainId   String?   // Nullable for strain deletion
  strain     Strain?   @relation(onDelete: SetNull)
}
```

---

## tRPC Procedures Added

### Admin Router (`server/routers/admin.ts`)
| Procedure | Type | Description |
|-----------|------|-------------|
| `admin.stats` | Query | Dashboard stats (strains, inventory, orders, revenue) |
| `admin.strains.list` | Query | List strains with search/filter |
| `admin.strains.get` | Query | Get single strain by ID |
| `admin.strains.create` | Mutation | Create new strain |
| `admin.strains.update` | Mutation | Update existing strain |
| `admin.strains.delete` | Mutation | Delete strain |
| `admin.inventory.list` | Query | List inventory with low stock filter |
| `admin.inventory.update` | Mutation | Update quantity/price |
| `admin.inventory.bulkUpdate` | Mutation | Batch update inventory |

### Auth Middleware
```typescript
// server/trpc.ts
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const client = await clerkClient();
  const user = await client.users.getUser(ctx.userId);
  if (user.publicMetadata?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

---

## Git Branch Status

| Branch | Status | PR |
|--------|--------|-----|
| `main` | Base branch | - |
| `sprint-1` | Merged | ✅ |
| `sprint-2` | Ready for merge | Needs review |
| `sprint-3` | Based on sprint-2 | Needs review |

### To Merge
1. Merge sprint-1 → main (if not done)
2. Merge sprint-2 → main
3. Rebase sprint-3 on main
4. Merge sprint-3 → main

---

## Dependencies & Versions

### Core Stack (Current)
```json
{
  "next": "15.1.4",
  "react": "19.0.0",
  "@trpc/server": "11.0.0-rc.682",
  "prisma": "6.2.1",
  "framer-motion": "^12.x",    // Upgraded for React 19
  "@clerk/nextjs": "^5.x",
  "@tanstack/react-table": "^8.x"
}
```

---

## Environment Variables

### Required
```env
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/greenleaf

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Clerk (Sprint 2)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

---

## To Test Admin Dashboard

1. **Set admin role in Clerk Dashboard:**
   - Go to Users → Select user → Edit Public Metadata
   - Add: `{"role": "admin"}`

2. **Access admin:**
   - Navigate to `/admin`
   - Should see dashboard with stats

3. **Test CRUD:**
   - Create new strain at `/admin/strains/new`
   - Edit existing strain
   - Update inventory inline

---

## Next Steps (Sprint 4)

1. **Order Management** - Admin orders list/detail/status updates
2. **Dashboard Analytics** - Revenue charts, top sellers
3. **Email System** - Resend + React Email for order confirmations

---

## Known Issues & Gotchas

1. **pgvector extension** - Must run `CREATE EXTENSION vector;` manually
2. **Stripe webhooks local** - Need `stripe listen --forward-to localhost:3000/api/stripe/webhook`
3. **Admin access** - Requires Clerk publicMetadata.role = "admin"
4. **Cart session** - Cookie name is `cart_session`, httpOnly
5. **Sprint branches** - sprint-3 depends on sprint-2, merge in order

---

## Common Commands

```bash
# Development
pnpm dev                    # Start dev server
pnpm build                  # Build all packages

# Database
pnpm db:push                # Push schema changes
pnpm db:studio              # Open Prisma Studio

# Git
git checkout sprint-3       # Current active branch
git push                    # Push to update PR
```
