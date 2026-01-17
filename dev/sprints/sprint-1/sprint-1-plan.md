# Sprint 1 Plan - Premium UI Foundation

**Sprint Goal:** Transform GreenLeaf into a premium, elegant experience with Framer Motion animations and refined design system targeting NYC professionals.

**Start Date:** 2026-01-17
**Branch:** `sprint-1`
**Story Points Committed:** 35 tasks (L sprint)

---

## Sprint Backlog

### High Priority - Foundation

- [ ] **0.1.1** Install `framer-motion` package (S)
- [ ] **0.1.2** Create `lib/motion.ts` with reusable variants (M)
- [ ] **0.1.3** Create `components/motion/` directory structure (S)
- [ ] **0.1.4** Build `FadeIn` wrapper component (M)
- [ ] **0.1.5** Build `SlideUp` wrapper component (M)
- [ ] **0.1.6** Build `StaggerContainer` for lists (M)

### High Priority - Design System

- [ ] **0.2.1** Update `tailwind.config.ts` with luxury dark palette (M)
- [ ] **0.2.2** Update CSS variables in `globals.css` (M)
- [ ] **0.2.3** Define color tokens for consistent usage (S)
- [ ] **0.3.1** Verify/configure Geist font loading (S)
- [ ] **0.3.2** Define typography scale in Tailwind (M)
- [ ] **0.3.3** Increase line-heights for luxury feel (S)

### High Priority - Core Components

- [ ] **0.4.1** Update Button variants (minimal, no shadows) (M)
- [ ] **0.4.2** Refine Card component (more padding, subtle borders) (M)
- [ ] **0.4.3** Update Badge component (pill style, muted) (S)
- [ ] **0.4.4** Create shimmer Skeleton component (M)
- [ ] **0.4.5** Add smooth focus states to interactive elements (S)

### Medium Priority - Page Transitions

- [ ] **0.5.1** Create `PageTransition` wrapper component (M)
- [ ] **0.5.2** Add fade-in on route changes (M)
- [ ] **0.5.3** Configure AnimatePresence for exits (M)

### Medium Priority - Homepage

- [ ] **0.6.1** Redesign hero section (bold typography, minimal) (L)
- [ ] **0.6.2** Add entrance animation to hero (M)
- [ ] **0.6.3** Refine featured strains grid layout (M)
- [ ] **0.6.4** Add stagger animation to strain cards (M)
- [ ] **0.6.5** Update features section styling (M)
- [ ] **0.6.6** Polish footer (minimal, clean) (S)

### Medium Priority - Strain Pages

- [ ] **0.7.1** Redesign strain cards (more whitespace) (L)
- [ ] **0.7.2** Add hover scale + shadow micro-interaction (M)
- [ ] **0.7.3** Implement stagger animation on catalog load (M)
- [ ] **0.7.4** Refine filter sidebar styling (M)
- [ ] **0.8.1** Refine strain detail page layout (L)
- [ ] **0.8.2** Polish "Add to Cart" interaction (M)

### Lower Priority - Cart & Chat

- [ ] **0.9.1** Convert cart to slide-out drawer (L)
- [ ] **0.9.2** Add smooth open/close animation (M)
- [ ] **0.9.3** Add remove animation (fade + collapse) (M)
- [ ] **0.10.1** Refine chat container styling (M)
- [ ] **0.10.2** Add message entrance animations (M)

---

## Definition of Done

- [ ] Framer Motion installed and working
- [ ] Dark luxury color palette applied site-wide
- [ ] All pages have smooth entrance animations
- [ ] Strain cards have hover micro-interactions
- [ ] Homepage looks premium and minimal
- [ ] No TypeScript errors (`pnpm type-check`)
- [ ] No lint errors (`pnpm lint`)
- [ ] Build succeeds (`pnpm build`)
- [ ] PR created and CodeRabbit approved

---

## Technical Approach

### Motion Variants (lib/motion.ts)
```typescript
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.3 }
};

export const slideUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" }
};

export const stagger = {
  animate: { transition: { staggerChildren: 0.1 } }
};
```

### Color Palette
```css
:root {
  --background: 0 0% 4%;        /* #0A0A0A */
  --foreground: 0 0% 98%;       /* #FAFAFA */
  --card: 0 0% 8%;              /* #141414 */
  --card-foreground: 0 0% 98%;
  --primary: 43 50% 54%;        /* #C4A052 gold */
  --muted: 0 0% 42%;            /* #6B6B6B */
  --border: 0 0% 15%;           /* #262626 */
}
```

---

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Framer Motion bundle size | Use tree-shaking, lazy load heavy animations |
| Animation performance on mobile | Test on real devices, use transform/opacity only |
| Design inconsistency | Create design tokens, review all pages |
| Scope creep | Stick to listed tasks, defer nice-to-haves |

---

## Daily Focus Areas

**Day 1-2:** Foundation (Framer Motion setup, motion components, color palette)
**Day 3-4:** Core components (Button, Card, Badge, Skeleton, typography)
**Day 5-6:** Homepage redesign with animations
**Day 7-8:** Strain catalog and detail pages
**Day 9-10:** Cart drawer, chat polish, final review

---

## Success Metrics

- Site feels noticeably more premium
- Animations are smooth (60fps)
- Color palette is cohesive
- Typography has proper hierarchy
- NYC professional would not be embarrassed browsing
