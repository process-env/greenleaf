# Sprint 3: Admin Dashboard - Part 1

**Sprint Duration:** 7 days
**Branch:** sprint-3
**Focus:** Admin Layout, Strain CRUD, Inventory Management

---

## Objectives

1. Create admin route group with protected layout
2. Implement admin role check using Clerk publicMetadata
3. Build strain management CRUD interface
4. Build inventory management interface
5. Create admin dashboard home with overview stats

---

## Tasks

### 3.1 Admin Layout
- [ ] Create `/app/(admin)/` route group
- [ ] Build admin sidebar navigation component
- [ ] Create admin layout with sidebar + main content
- [ ] Add role-based access check (isAdmin)
- [ ] Create admin dashboard home page
- [ ] Style with dark premium aesthetic

### 3.2 Role-Based Access
- [ ] Add `publicMetadata.role` field in Clerk
- [ ] Create `useIsAdmin` hook to check role
- [ ] Create admin middleware to protect routes
- [ ] Redirect non-admins to home page
- [ ] Add admin tRPC procedures

### 3.3 Strain Management
- [ ] Create strains list page with data table
- [ ] Add strain create form with validation
- [ ] Add strain edit form
- [ ] Add strain delete with confirmation dialog
- [ ] Create strain tRPC CRUD procedures
- [ ] Add form validation with zod

### 3.4 Inventory Management
- [ ] Create inventory overview page
- [ ] Add inline quantity editing
- [ ] Add inline price editing
- [ ] Show low stock alerts (< 10g)
- [ ] Create inventory tRPC procedures

---

## Technical Notes

### Admin Role Strategy
```typescript
// Check admin role in Clerk publicMetadata
const { user } = useUser();
const isAdmin = user?.publicMetadata?.role === "admin";

// Server-side check in tRPC
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const user = await clerkClient.users.getUser(ctx.userId);
  if (user.publicMetadata?.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next();
});
```

### Admin Routes Structure
```
/app/(admin)/
  layout.tsx          - Admin shell with sidebar
  admin/
    page.tsx          - Dashboard home
    strains/
      page.tsx        - Strain list
      new/page.tsx    - Create strain
      [id]/page.tsx   - Edit strain
    inventory/
      page.tsx        - Inventory management
```

### Data Table Library
Use @tanstack/react-table with shadcn/ui DataTable pattern for:
- Sorting
- Filtering
- Pagination
- Row selection

---

## Dependencies

- `@tanstack/react-table` - Data table functionality
- `@clerk/nextjs` - Already installed (role check)
- Existing: shadcn/ui components (Table, Dialog, Form)

---

## Success Criteria

- [ ] Admin layout renders with sidebar navigation
- [ ] Only admins can access /admin routes
- [ ] Admin can create new strains
- [ ] Admin can edit existing strains
- [ ] Admin can delete strains (with confirmation)
- [ ] Admin can update inventory quantities
- [ ] Admin can update prices
- [ ] Low stock items are highlighted
- [ ] Build passes with no type errors
