# Tailwind CSS Theme Configuration

## Table of Contents

1. [The @theme Directive](#the-theme-directive)
2. [Theme Namespaces](#theme-namespaces)
3. [Customizing Colors](#customizing-colors)
4. [Customizing Typography](#customizing-typography)
5. [Customizing Spacing](#customizing-spacing)
6. [Custom Animations](#custom-animations)
7. [CSS Variables](#css-variables)
8. [Arbitrary Values](#arbitrary-values)
9. [Layers & Directives](#layers--directives)

---

## The @theme Directive

Theme variables are special CSS variables that tell Tailwind which utility classes to generate.

### Basic Usage

```css
@import "tailwindcss";

@theme {
  --color-brand: oklch(0.72 0.11 221.19);
  --font-display: "Inter", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

This creates utilities: `bg-brand`, `text-brand`, `font-display`, `3xl:`

### Key Difference from :root

```css
/* Regular CSS variable - NO utilities generated */
:root {
  --my-blue: #3b82f6;
}

/* Theme variable - utilities ARE generated */
@theme {
  --color-blue-custom: #3b82f6;
}
```

---

## Theme Namespaces

Each namespace generates specific utilities:

| Namespace | Generated Utilities |
|-----------|---------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `ring-*`, etc. |
| `--font-*` | `font-*` (font families) |
| `--text-*` | `text-*` (font sizes) |
| `--font-weight-*` | `font-*` (weights) |
| `--spacing-*` | `p-*`, `m-*`, `w-*`, `h-*`, `gap-*` |
| `--radius-*` | `rounded-*` |
| `--shadow-*` | `shadow-*` |
| `--breakpoint-*` | `sm:`, `md:`, etc. (responsive) |
| `--ease-*` | `ease-*` (timing functions) |
| `--animate-*` | `animate-*` |
| `--inset-shadow-*` | `inset-shadow-*` |
| `--drop-shadow-*` | `drop-shadow-*` |

---

## Customizing Colors

### Adding New Colors

```css
@theme {
  --color-brand-50: oklch(0.97 0.02 221);
  --color-brand-100: oklch(0.94 0.04 221);
  --color-brand-500: oklch(0.72 0.11 221);
  --color-brand-900: oklch(0.30 0.08 221);
}
```

Use: `bg-brand-500`, `text-brand-100`

### Overriding Default Colors

```css
@theme {
  --color-blue-500: oklch(0.65 0.20 250);
}
```

### Removing Colors

```css
@theme {
  --color-lime-*: initial;  /* Remove all lime shades */
  --color-cyan-*: initial;  /* Remove all cyan shades */
}
```

### Complete Color Reset

```css
@theme {
  --color-*: initial;  /* Remove ALL default colors */

  /* Define only what you need */
  --color-white: #ffffff;
  --color-black: #000000;
  --color-primary: oklch(0.65 0.20 250);
  --color-secondary: oklch(0.75 0.15 150);
}
```

---

## Customizing Typography

### Font Families

```css
@theme {
  --font-sans: "Inter", system-ui, sans-serif;
  --font-display: "Cal Sans", sans-serif;
  --font-mono: "Fira Code", monospace;
}
```

### Font Sizes

```css
@theme {
  --text-tiny: 0.625rem;  /* Creates text-tiny */
  --text-huge: 6rem;      /* Creates text-huge */
}
```

### Font Weights

```css
@theme {
  --font-weight-hairline: 50;
}
```

### Line Heights

```css
@theme {
  --leading-relaxed: 1.75;
}
```

### Letter Spacing

```css
@theme {
  --tracking-mega: 0.25em;
}
```

---

## Customizing Spacing

### The Spacing Scale

```css
@theme {
  --spacing: 0.25rem;  /* Base unit (default) */
}
```

All spacing utilities are calculated as: `calc(var(--spacing) * n)`

### Adding Custom Spacing

```css
@theme {
  --spacing-128: 32rem;  /* Creates w-128, p-128, m-128, etc. */
  --spacing-144: 36rem;
}
```

### Container Sizes

```css
@theme {
  --container-8xl: 96rem;
}
```

---

## Custom Animations

### Defining Animations

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

### Complex Animation

```css
@theme {
  --animate-slide-in: slide-in 0.3s ease-out forwards;

  @keyframes slide-in {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
}
```

### Timing Functions

```css
@theme {
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

Use: `ease-bounce`, `ease-smooth`

---

## CSS Variables

### Accessing Theme Variables in CSS

```css
.custom-component {
  background: var(--color-blue-500);
  padding: var(--spacing-4);
  border-radius: var(--radius-lg);
}
```

### In JavaScript

```javascript
const color = getComputedStyle(document.documentElement)
  .getPropertyValue('--color-blue-500');
```

### Using Theme Variables in @layer

```css
@layer components {
  .btn {
    padding: calc(var(--spacing) * 2) calc(var(--spacing) * 4);
    background: var(--color-blue-500);
    border-radius: var(--radius-md);
  }

  .btn:hover {
    background: var(--color-blue-600);
  }
}
```

### Inline Theme Option

For variables that reference other variables:

```css
@theme inline {
  --font-sans: var(--font-inter);
  --color-primary: var(--color-blue-500);
}
```

### Static Theme Option

Force all CSS variables to be output:

```css
@theme static {
  --color-primary: var(--color-brand);
}
```

---

## Arbitrary Values

When design tokens don't exist, use bracket syntax:

### Arbitrary Values

```html
<div class="bg-[#bada55]">          <!-- Custom color -->
<div class="w-[137px]">              <!-- Exact width -->
<div class="top-[117px]">            <!-- Exact position -->
<div class="grid-cols-[200px_1fr]">  <!-- Custom grid -->
<div class="text-[22px]">            <!-- Custom size -->
<div class="p-[5%]">                 <!-- Percentage -->
<div class="w-[calc(100%-2rem)]">    <!-- Calculation -->
```

### Using CSS Variables

```html
<div class="bg-[var(--my-color)]">
<div class="text-[length:var(--size)]">
```

### Arbitrary Properties

For properties Tailwind doesn't have:

```html
<div class="[mask-type:luminance]">
<div class="[clip-path:circle(50%)]">
<div class="[writing-mode:vertical-rl]">
```

### Arbitrary Variants

```html
<div class="[&.active]:bg-blue-500">
<div class="[&>*]:p-4">
<div class="[&_p]:text-gray-600">
<div class="[@supports(display:grid)]:grid">
```

---

## Layers & Directives

### @layer

```css
/* Base styles - HTML element defaults */
@layer base {
  h1 {
    font-size: var(--text-3xl);
    font-weight: var(--font-weight-bold);
  }
}

/* Components - reusable classes */
@layer components {
  .card {
    background: white;
    border-radius: var(--radius-lg);
    padding: var(--spacing-6);
    box-shadow: var(--shadow-md);
  }

  .btn-primary {
    @apply bg-blue-500 text-white px-4 py-2 rounded-lg;
    @apply hover:bg-blue-600 transition-colors;
  }
}

/* Utilities - single-purpose classes */
@layer utilities {
  .content-auto {
    content-visibility: auto;
  }
}
```

### @apply

Inline existing utilities into custom CSS:

```css
.custom-button {
  @apply px-4 py-2 bg-blue-500 text-white rounded-lg;
  @apply hover:bg-blue-600 focus:ring-2 focus:ring-blue-300;
}
```

**Note:** Prefer using utilities directly in HTML. Use @apply sparingly for:
- Third-party library overrides
- Complex components that must be in CSS

### @utility

Create custom utilities:

```css
@utility content-auto {
  content-visibility: auto;
}

@utility scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
```

### @variant

Apply variants in CSS:

```css
.my-element {
  @variant hover {
    background-color: var(--color-blue-600);
  }

  @variant dark {
    background-color: var(--color-gray-800);
  }
}
```

### @custom-variant

Create new variants:

```css
@custom-variant theme-dark {
  &:where([data-theme="dark"] *) {
    @slot;
  }
}
```

Use: `theme-dark:bg-gray-900`

### @source

Explicitly include files for class detection:

```css
@source "../components/**/*.jsx";
@source "./my-library.js";
```

---

## Best Practices

### 1. Prefer Theme Over Arbitrary

```css
/* Better: Define in theme */
@theme {
  --color-brand: oklch(0.72 0.11 221);
}
/* Use: bg-brand */

/* Avoid: Repeated arbitrary values */
<div class="bg-[oklch(0.72_0.11_221)]">
```

### 2. Use Semantic Names

```css
@theme {
  /* Good: semantic */
  --color-primary: oklch(0.65 0.20 250);
  --color-danger: oklch(0.65 0.25 25);

  /* Avoid: implementation details */
  --color-blue-ish: oklch(0.65 0.20 250);
}
```

### 3. Keep Base Styles Minimal

```css
@layer base {
  /* Only truly global defaults */
  body {
    font-family: var(--font-sans);
  }
}
```

### 4. Use Components Layer Sparingly

Prefer utility composition in HTML over component classes in CSS.

---

**Related:** [utilities.md](utilities.md) | [responsive.md](responsive.md)
