# Tailwind CSS Responsive Design

## Table of Contents

1. [Breakpoint System](#breakpoint-system)
2. [Mobile-First Approach](#mobile-first-approach)
3. [Breakpoint Ranges](#breakpoint-ranges)
4. [Container Queries](#container-queries)
5. [Custom Breakpoints](#custom-breakpoints)
6. [Responsive Patterns](#responsive-patterns)

---

## Breakpoint System

### Default Breakpoints

| Prefix | Min Width | Rem | CSS Media Query |
|--------|-----------|-----|-----------------|
| *(none)* | 0px | - | Default (all sizes) |
| `sm:` | 640px | 40rem | `@media (width >= 40rem)` |
| `md:` | 768px | 48rem | `@media (width >= 48rem)` |
| `lg:` | 1024px | 64rem | `@media (width >= 64rem)` |
| `xl:` | 1280px | 80rem | `@media (width >= 80rem)` |
| `2xl:` | 1536px | 96rem | `@media (width >= 96rem)` |

### Usage

```html
<div class="w-full md:w-1/2 lg:w-1/3">
  Full width on mobile, half on md, third on lg
</div>
```

---

## Mobile-First Approach

Tailwind uses min-width breakpoints. **Unprefixed utilities apply to all screen sizes.**

### Common Mistake

```html
<!-- WRONG thinking: "sm: means small screens only" -->
<div class="hidden sm:block">

<!-- CORRECT understanding: "hidden by default, block at 640px AND UP" -->
```

### The Right Way

1. Style for mobile first (unprefixed classes)
2. Add larger breakpoint overrides
3. Each breakpoint affects that size AND LARGER

```html
<div class="
  text-sm        /* Mobile: small text */
  md:text-base   /* 768px+: base text */
  lg:text-lg     /* 1024px+: large text */
">
```

---

## Breakpoint Ranges

### Max-Width Variants

Target only UP TO a breakpoint:

```html
<div class="max-md:hidden">Hidden below 768px</div>
<div class="max-lg:text-sm">Small text below 1024px</div>
```

Available: `max-sm:`, `max-md:`, `max-lg:`, `max-xl:`, `max-2xl:`

### Targeting Specific Ranges

Combine min and max:

```html
<div class="md:max-lg:flex">
  <!-- Flex ONLY between 768px and 1024px -->
</div>

<div class="sm:max-md:bg-blue-500">
  <!-- Blue background only between 640px and 768px -->
</div>
```

### Arbitrary Breakpoints

```html
<div class="min-[320px]:text-sm">Above 320px</div>
<div class="max-[600px]:hidden">Hidden below 600px</div>
```

---

## Container Queries

Style based on **container size**, not viewport.

### Setup

```html
<div class="@container">
  <div class="@md:flex @lg:grid">
    <!-- Responds to container width, not screen width -->
  </div>
</div>
```

### Container Breakpoints

| Variant | Width |
|---------|-------|
| `@xs:` | 320px |
| `@sm:` | 384px |
| `@md:` | 448px |
| `@lg:` | 512px |
| `@xl:` | 576px |
| `@2xl:` | 672px |
| `@3xl:` | 768px |
| `@4xl:` | 896px |
| `@5xl:` | 1024px |
| `@6xl:` | 1152px |
| `@7xl:` | 1280px |

### Named Containers

```html
<div class="@container/main">
  <div class="@container/sidebar">
    <div class="@lg/main:flex @md/sidebar:grid">
      <!-- Target specific containers -->
    </div>
  </div>
</div>
```

### Max Container Queries

```html
<div class="@max-md:hidden">Hidden when container < 448px</div>
```

---

## Custom Breakpoints

### Adding New Breakpoints

```css
@theme {
  --breakpoint-xs: 20rem;   /* 320px */
  --breakpoint-3xl: 120rem; /* 1920px */
}
```

Use: `xs:flex`, `3xl:grid`

### Overriding Defaults

```css
@theme {
  --breakpoint-sm: 30rem;  /* Change sm from 640px to 480px */
}
```

### Complete Reset

```css
@theme {
  --breakpoint-*: initial;  /* Remove all defaults */
  --breakpoint-mobile: 30rem;
  --breakpoint-tablet: 48rem;
  --breakpoint-desktop: 64rem;
}
```

---

## Responsive Patterns

### Responsive Navigation

```html
<nav class="flex flex-col md:flex-row md:items-center md:justify-between">
  <div class="flex items-center justify-between">
    <span>Logo</span>
    <button class="md:hidden">Menu</button>
  </div>
  <ul class="hidden md:flex md:gap-6">
    <li>Link 1</li>
    <li>Link 2</li>
  </ul>
</nav>
```

### Responsive Grid

```html
<!-- 1 col → 2 col → 3 col → 4 col -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div>Card</div>
  <div>Card</div>
  <div>Card</div>
  <div>Card</div>
</div>
```

### Responsive Typography

```html
<h1 class="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold">
  Heading
</h1>
```

### Responsive Spacing

```html
<section class="px-4 py-8 md:px-8 md:py-16 lg:px-16 lg:py-24">
  <div class="max-w-4xl mx-auto">Content</div>
</section>
```

### Show/Hide Elements

```html
<!-- Mobile only -->
<div class="md:hidden">Mobile menu</div>

<!-- Desktop only -->
<div class="hidden md:block">Desktop sidebar</div>

<!-- Specific range -->
<div class="hidden sm:block lg:hidden">Tablet only</div>
```

### Responsive Flex Direction

```html
<div class="flex flex-col md:flex-row gap-4">
  <aside class="w-full md:w-64">Sidebar</aside>
  <main class="flex-1">Content</main>
</div>
```

---

## Best Practices

### 1. Start Mobile

Always design mobile-first, then enhance:

```html
<!-- Good: mobile-first -->
<div class="p-4 md:p-8 lg:p-12">

<!-- Avoid: desktop-first (harder to maintain) -->
<div class="p-12 md:p-8 sm:p-4">
```

### 2. Use Semantic Breakpoints

Don't chase specific devices:

```html
<!-- Good: content-based -->
<div class="max-w-prose mx-auto">

<!-- Avoid: device-specific -->
<div class="max-w-[375px] md:max-w-[768px]">
```

### 3. Test All Breakpoints

Common widths to test:
- 320px (small phones)
- 375px (iPhone)
- 640px (sm breakpoint)
- 768px (md breakpoint / tablets)
- 1024px (lg breakpoint)
- 1280px (xl breakpoint)
- 1536px (2xl breakpoint)

---

**Related:** [layout.md](layout.md) | [utilities.md](utilities.md)
