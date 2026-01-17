---
name: tailwindcss
description: Tailwind CSS v4 utility-first framework patterns including responsive design, state variants (hover, focus, group, peer), dark mode, flexbox/grid layouts, spacing system, color palette with opacity modifiers, @theme customization, @container queries, 3D transforms, animations, and modern CSS features. Use when styling components, building responsive layouts, or configuring design tokens.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  tailwindcss: "v4.0"
---

# Tailwind CSS

> **Updated 2026-01-11:** Tailwind CSS v4 is current. Added @container query examples, 3D transform utilities. Oxide engine provides significant performance improvements.

## Purpose

Comprehensive guide for building interfaces with Tailwind CSS v4's utility-first approach. Covers responsive design, state variants, dark mode, layout systems, theme customization, and modern CSS patterns.

## When to Use This Skill

Automatically activates when working on:
- Styling React/Vue/Svelte components
- Building responsive layouts
- Implementing dark mode
- Customizing design tokens with @theme
- Working with flexbox or CSS grid
- Adding hover/focus/group states
- Configuring Tailwind projects

---

## Quick Start

### Installation (Vite)

```bash
npm install tailwindcss @tailwindcss/vite
```

```typescript
// vite.config.ts
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

```css
/* src/index.css */
@import "tailwindcss";
```

### Core Concept: Utility-First

Apply single-purpose classes directly in markup:

```html
<button class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
  Click me
</button>
```

**Benefits:**
- No custom CSS naming required
- Changes only affect the element they're applied to
- Design system constraints prevent inconsistency
- Portable - copy components between projects

---

## Responsive Design

### Breakpoints (Mobile-First)

| Prefix | Min Width | CSS |
|--------|-----------|-----|
| `sm:` | 640px | `@media (width >= 40rem)` |
| `md:` | 768px | `@media (width >= 48rem)` |
| `lg:` | 1024px | `@media (width >= 64rem)` |
| `xl:` | 1280px | `@media (width >= 80rem)` |
| `2xl:` | 1536px | `@media (width >= 96rem)` |

```html
<!-- Stack on mobile, 3 columns on md, 4 on lg -->
<div class="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
```

**Key insight:** Unprefixed utilities apply to ALL sizes. `sm:` means "small and UP", not "only small screens".

### Max-Width Variants

```html
<div class="md:max-lg:flex"><!-- Only between md and lg --></div>
```

### Container Queries

```html
<div class="@container">
  <div class="@md:flex @lg:grid"><!-- Based on container, not viewport --></div>
</div>
```

---

## State Variants

### Interactive States

```html
<button class="
  bg-blue-500
  hover:bg-blue-700
  focus:ring-2 focus:ring-blue-300
  active:bg-blue-800
  disabled:opacity-50 disabled:cursor-not-allowed
">
```

### Form States

```html
<input class="
  border-gray-300
  focus:border-blue-500
  invalid:border-red-500
  required:border-yellow-500
"/>
```

### Group & Peer States

**Group (parent → child):**
```html
<div class="group">
  <h3 class="group-hover:text-blue-500">Title</h3>
  <p class="group-hover:opacity-100 opacity-75">Description</p>
</div>
```

**Peer (sibling → sibling):**
```html
<input class="peer" placeholder="Email" />
<p class="hidden peer-invalid:block text-red-500">Invalid email</p>
```

### Pseudo-Elements

```html
<label class="before:content-['*'] before:text-red-500">Required</label>
<blockquote class="after:content-[''] after:block after:h-1 after:bg-blue-500"></blockquote>
```

### Structural Selectors

```html
<li class="first:pt-0 last:pb-0">Item</li>
<tr class="odd:bg-gray-50 even:bg-white">Row</tr>
```

---

## Dark Mode

### System Preference (Default)

```html
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
```

### Manual Toggle (Class-Based)

```css
/* In your CSS */
@custom-variant dark (&:where(.dark, .dark *));
```

```javascript
// Toggle dark class on <html>
document.documentElement.classList.toggle('dark');
```

### Three-Way Theme (System/Light/Dark)

```javascript
if (localStorage.theme === 'dark' ||
    (!('theme' in localStorage) &&
     window.matchMedia('(prefers-color-scheme: dark)').matches)) {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}
```

---

## Layout: Flexbox

### Common Patterns

```html
<!-- Centered content -->
<div class="flex items-center justify-center h-screen">

<!-- Space between -->
<nav class="flex justify-between items-center">

<!-- Wrap items -->
<div class="flex flex-wrap gap-4">

<!-- Column layout -->
<div class="flex flex-col gap-2">

<!-- Grow to fill space -->
<div class="flex-1">
```

### Flex Utilities

| Class | Effect |
|-------|--------|
| `flex-1` | Grow and shrink equally |
| `flex-auto` | Grow/shrink respecting initial size |
| `flex-initial` | Shrink but don't grow |
| `flex-none` | Don't grow or shrink |

---

## Layout: CSS Grid

### Column Templates

```html
<!-- Fixed columns -->
<div class="grid grid-cols-3 gap-4">

<!-- Responsive grid -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

<!-- Auto-fit with min-max -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
```

### Grid Spanning

```html
<div class="col-span-2">Spans 2 columns</div>
<div class="col-start-2 col-end-4">Columns 2-3</div>
<div class="row-span-2">Spans 2 rows</div>
```

### Gap Utilities

```html
<div class="gap-4">      <!-- All gaps -->
<div class="gap-x-4">    <!-- Horizontal gap -->
<div class="gap-y-2">    <!-- Vertical gap -->
```

---

## Spacing

### Padding & Margin Scale

The spacing scale uses `calc(var(--spacing) * n)`:

| Class | Size |
|-------|------|
| `p-0` | 0 |
| `p-1` | 0.25rem (4px) |
| `p-2` | 0.5rem (8px) |
| `p-4` | 1rem (16px) |
| `p-8` | 2rem (32px) |
| `p-16` | 4rem (64px) |

### Directional Utilities

| Prefix | Applies To |
|--------|------------|
| `p-` / `m-` | All sides |
| `px-` / `mx-` | Left + Right |
| `py-` / `my-` | Top + Bottom |
| `pt-` / `mt-` | Top |
| `pr-` / `mr-` | Right |
| `pb-` / `mb-` | Bottom |
| `pl-` / `ml-` | Left |
| `ps-` / `ms-` | Inline-start (RTL-aware) |
| `pe-` / `me-` | Inline-end (RTL-aware) |

### Negative Margins

```html
<div class="-mt-4">Pulls up 1rem</div>
```

---

## Colors

### Usage Pattern

```html
<div class="
  bg-blue-500        /* Background */
  text-white         /* Text color */
  border-gray-300    /* Border */
  ring-blue-400      /* Focus ring */
  shadow-gray-500    /* Shadow color */
">
```

### Opacity Modifier

```html
<div class="bg-black/50">     <!-- 50% opacity -->
<div class="text-blue-500/75"> <!-- 75% opacity -->
```

### Color Scale

Each color has shades 50-950:
- `50` - Lightest
- `500` - Base
- `950` - Darkest

```html
<div class="bg-blue-50 hover:bg-blue-100">Light hover</div>
<div class="bg-blue-600 hover:bg-blue-700">Dark hover</div>
```

---

## Typography

### Font Size

| Class | Size |
|-------|------|
| `text-xs` | 0.75rem |
| `text-sm` | 0.875rem |
| `text-base` | 1rem |
| `text-lg` | 1.125rem |
| `text-xl` | 1.25rem |
| `text-2xl` - `text-9xl` | Larger |

### Font Weight

`font-thin`, `font-light`, `font-normal`, `font-medium`, `font-semibold`, `font-bold`, `font-extrabold`, `font-black`

### Line Height

`leading-none`, `leading-tight`, `leading-snug`, `leading-normal`, `leading-relaxed`, `leading-loose`

---

## Borders & Shadows

### Border Radius

| Class | Effect |
|-------|--------|
| `rounded-none` | 0 |
| `rounded-sm` | 0.125rem |
| `rounded` | 0.25rem |
| `rounded-md` | 0.375rem |
| `rounded-lg` | 0.5rem |
| `rounded-xl` | 0.75rem |
| `rounded-2xl` | 1rem |
| `rounded-full` | 50% (circles) |

**Directional:** `rounded-t-lg`, `rounded-bl-xl`

### Shadows

```html
<div class="shadow-sm">Subtle</div>
<div class="shadow">Default</div>
<div class="shadow-lg">Large</div>
<div class="shadow-xl">Extra large</div>
<div class="shadow-2xl">Huge</div>
```

**Colored shadows:**
```html
<div class="shadow-lg shadow-blue-500/50">Blue glow</div>
```

---

## Animations & Transitions

### Built-in Animations

```html
<div class="animate-spin">Loading spinner</div>
<div class="animate-ping">Notification pulse</div>
<div class="animate-pulse">Skeleton loader</div>
<div class="animate-bounce">Scroll indicator</div>
```

### Transitions

```html
<button class="
  transition-colors duration-200 ease-in-out
  hover:bg-blue-600
">
```

| Class | Transitions |
|-------|-------------|
| `transition` | Common properties |
| `transition-all` | All properties |
| `transition-colors` | Color properties |
| `transition-opacity` | Opacity |
| `transition-transform` | Transforms |

### Respecting Motion Preferences

```html
<div class="motion-safe:animate-spin motion-reduce:animate-none">
```

---

## Arbitrary Values

When design tokens don't exist:

```html
<div class="top-[117px]">Precise positioning</div>
<div class="bg-[#bada55]">Custom color</div>
<div class="grid-cols-[200px_1fr_100px]">Custom grid</div>
<div class="w-[calc(100%-2rem)]">Calculated width</div>
```

### Arbitrary Properties

```html
<div class="[mask-type:luminance]">
<div class="[--scroll-offset:56px]">
```

---

## Theme Customization (@theme)

### Adding Custom Values

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.72 0.11 221.19);
  --font-display: "Cal Sans", sans-serif;
  --spacing-128: 32rem;
  --breakpoint-3xl: 120rem;
}
```

Creates utilities: `bg-brand`, `font-display`, `w-128`, `3xl:`

### Overriding Defaults

```css
@theme {
  --breakpoint-sm: 30rem;  /* Change sm breakpoint */
  --radius-lg: 1rem;       /* Change large radius */
}
```

### Custom Animations

```css
@theme {
  --animate-wiggle: wiggle 1s ease-in-out infinite;
  @keyframes wiggle {
    0%, 100% { transform: rotate(-3deg); }
    50% { transform: rotate(3deg); }
  }
}
```

Use: `animate-wiggle`

---

## Gotchas & Real-World Warnings

### Breakpoints Are Mobile-First (Counterintuitive)

**`sm:` means "small AND UP", not "only small screens":**

```html
<!-- WRONG mental model: "sm means small screens" -->
<div class="hidden sm:block">  <!-- Shows on 640px AND ABOVE, not below -->

<!-- CORRECT: Unprefixed = all sizes, prefixes = that size and UP -->
<div class="block sm:hidden">   <!-- Shows below 640px, hidden above -->
<div class="hidden sm:block">   <!-- Hidden below 640px, shows above -->

<!-- For "only between md and lg": -->
<div class="hidden md:block lg:hidden">  <!-- Only visible 768px-1023px -->
```

### Dynamic Classes Don't Work

**Tailwind scans files at build time. Dynamic class names are invisible:**

```tsx
// DANGER: Tailwind can't see these classes
const color = 'red';
<div className={`bg-${color}-500`} />  // Won't work!
<div className={`p-${spacing}`} />      // Won't work!

// CORRECT: Use complete class names
const colorClasses = {
  red: 'bg-red-500',
  blue: 'bg-blue-500',
};
<div className={colorClasses[color]} />  // Works!

// Or safelist in config (v4: use CSS)
// tailwind.config.js (v3)
safelist: ['bg-red-500', 'bg-blue-500']
```

### Arbitrary Values Create Inconsistency

**Escape hatch becomes a crutch:**

```html
<!-- DANGER: Arbitrary values everywhere = no design system -->
<div class="mt-[13px] p-[22px] text-[17px] leading-[1.47]">

<!-- These magic numbers create inconsistency -->
<!-- Different developers use different arbitrary values -->

<!-- BETTER: Stick to the scale or extend @theme -->
@theme {
  --spacing-4.5: 1.125rem;  /* If you really need 18px */
}
<div class="mt-4.5">  <!-- Now it's in your design system -->
```

### Purging Removes Classes You Need

**If Tailwind doesn't see a class in your source files, it's gone:**

```tsx
// DANGER: Class comes from database/API
const userTheme = await db.getTheme();  // Returns 'bg-purple-500'
<div className={userTheme} />  // Class might be purged!

// DANGER: Class in file Tailwind doesn't scan
// tailwind.config.js content: ['./src/**/*.tsx']
// But class is in ./lib/constants.ts  // Not scanned!

// FIX: Update content paths
content: [
  './src/**/*.{ts,tsx}',
  './lib/**/*.ts',
]

// Or safelist specific patterns
safelist: [
  { pattern: /^bg-(red|blue|green|purple)-500$/ },
]
```

### @apply Creates Specificity Issues

**Using @apply in components can fight with utility classes:**

```css
/* components.css */
.btn {
  @apply bg-blue-500 text-white;
}
```

```html
<!-- DANGER: Utility might not override @apply -->
<button class="btn bg-red-500">  <!-- Might still be blue! -->

<!-- This happens because @apply creates a rule with equal specificity -->
<!-- and source order determines winner -->

<!-- SAFER: Use @layer to control specificity -->
@layer components {
  .btn {
    @apply bg-blue-500 text-white;
  }
}
```

### Responsive Images Need Explicit Sizing

**Images without dimensions cause layout shift:**

```html
<!-- DANGER: Layout shift as image loads -->
<img src="photo.jpg" class="w-full" />

<!-- BETTER: Reserve space with aspect ratio -->
<div class="aspect-video">
  <img src="photo.jpg" class="w-full h-full object-cover" />
</div>

<!-- Or use explicit dimensions -->
<img src="photo.jpg" class="w-full" width="800" height="450" />
```

### JIT Means Longer Build Times in Dev

**Every class change triggers a rebuild:**

```bash
# First load: fast (cached)
# Change a class: rebuild entire CSS

# With 1000s of unique classes, this adds up
# Arbitrary values are especially slow: [calc(100%-2rem)]

# MITIGATION: Use the design system scale when possible
# Custom values should be rare exceptions
```

### What These Patterns Don't Tell You

1. **Print styles** - Need `print:` variant for print-friendly pages
2. **RTL support** - Use `rtl:` variant and logical properties (`ms-4` not `ml-4`)
3. **Motion preferences** - `motion-safe:` and `motion-reduce:` for accessibility
4. **Container queries** - `@container` is powerful but adds complexity
5. **CSS layers** - Tailwind uses `@layer` which affects cascade
6. **IDE extensions** - Install Tailwind CSS IntelliSense for autocomplete

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Responsive layouts | [responsive.md](resources/responsive.md) |
| State variants | [variants.md](resources/variants.md) |
| Layout patterns | [layout.md](resources/layout.md) |
| Full utility reference | [utilities.md](resources/utilities.md) |
| Theme configuration | [theme.md](resources/theme.md) |

---

## External Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Tailwind CSS v4 Blog Post](https://tailwindcss.com/blog/tailwindcss-v4)
- [Tailwind UI Components](https://tailwindui.com)
- [Headless UI](https://headlessui.com)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 5 resource files
