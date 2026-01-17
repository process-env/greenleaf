# Sprint 2: Authentication & Age Verification

**Sprint Duration:** 7 days
**Branch:** sprint-2
**Focus:** Clerk Auth + Age Gate

---

## Objectives

1. Implement Clerk authentication for user management
2. Create protected routes for orders, profile, checkout success
3. Link anonymous carts to users on login
4. Add age verification modal for legal compliance

---

## Tasks

### 2.1 Clerk Setup
- [ ] Install `@clerk/nextjs` package
- [ ] Add Clerk env vars to `.env.local`
- [ ] Configure `ClerkProvider` in root layout
- [ ] Add Clerk middleware for route protection
- [ ] Test sign up / sign in flow

### 2.2 Auth Integration
- [ ] Create auth middleware (`middleware.ts`)
- [ ] Define public routes (home, strains, budtender)
- [ ] Define protected routes (orders, profile, checkout success)
- [ ] Add `SignInButton` / `UserButton` to header
- [ ] Update tRPC context to include `userId`
- [ ] Create `protectedProcedure` in tRPC

### 2.3 Cart-User Linking
- [ ] Add optional `userId` to Cart model
- [ ] Update cart.get to check userId if logged in
- [ ] Merge anonymous cart on login
- [ ] Update cart procedures for auth

### 2.4 Age Verification
- [ ] Create `AgeVerificationModal` component
- [ ] Add age verification state/cookie logic
- [ ] Create middleware to check age cookie
- [ ] Style modal with shadcn/ui Dialog
- [ ] Add "Remember for 24 hours" checkbox
- [ ] Test age gate flow

---

## Technical Notes

### Clerk Configuration
- Use Clerk's Next.js App Router integration
- Enable email/password + social providers (Google)
- Configure redirect URLs for sign-in/sign-up

### Route Protection Strategy
```
Public Routes:
- / (homepage)
- /strains (catalog)
- /strains/[slug] (detail)
- /budtender (AI chat)
- /cart (view cart)

Protected Routes:
- /orders (order history)
- /orders/[id] (order detail)
- /profile (user settings)
- /checkout/success (post-purchase)
```

### Cart Merge Strategy
1. On login, check for anonymous cart (via session cookie)
2. Check for existing user cart
3. If both exist, merge items (sum quantities)
4. Delete anonymous cart after merge
5. Update session to use user cart

---

## Dependencies

- `@clerk/nextjs` - Auth provider
- Existing: shadcn/ui Dialog for age modal

---

## Success Criteria

- [ ] Users can sign up/sign in via Clerk
- [ ] Protected routes redirect unauthenticated users
- [ ] Cart persists across login/logout
- [ ] Age verification blocks underage users
- [ ] Build passes with no type errors
