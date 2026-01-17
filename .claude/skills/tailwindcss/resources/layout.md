# Tailwind CSS Layout Patterns

## Table of Contents

1. [Flexbox](#flexbox)
2. [CSS Grid](#css-grid)
3. [Positioning](#positioning)
4. [Container](#container)
5. [Common Layout Patterns](#common-layout-patterns)
6. [Sizing](#sizing)

---

## Flexbox

### Enable Flex

```html
<div class="flex">      <!-- display: flex -->
<div class="inline-flex"> <!-- display: inline-flex -->
```

### Direction

```html
<div class="flex flex-row">     <!-- Default: horizontal -->
<div class="flex flex-col">     <!-- Vertical stack -->
<div class="flex flex-row-reverse">  <!-- Right to left -->
<div class="flex flex-col-reverse">  <!-- Bottom to top -->
```

### Wrap

```html
<div class="flex flex-wrap">     <!-- Wrap to new lines -->
<div class="flex flex-nowrap">   <!-- Single line (default) -->
<div class="flex flex-wrap-reverse"> <!-- Wrap upward -->
```

### Justify Content (Main Axis)

```html
<div class="flex justify-start">    <!-- Pack at start -->
<div class="flex justify-end">      <!-- Pack at end -->
<div class="flex justify-center">   <!-- Center items -->
<div class="flex justify-between">  <!-- Space between -->
<div class="flex justify-around">   <!-- Space around -->
<div class="flex justify-evenly">   <!-- Equal space -->
```

### Align Items (Cross Axis)

```html
<div class="flex items-start">    <!-- Align to top -->
<div class="flex items-end">      <!-- Align to bottom -->
<div class="flex items-center">   <!-- Center vertically -->
<div class="flex items-baseline"> <!-- Align text baselines -->
<div class="flex items-stretch">  <!-- Stretch to fill (default) -->
```

### Gap

```html
<div class="flex gap-4">    <!-- Gap in all directions -->
<div class="flex gap-x-4">  <!-- Horizontal gap only -->
<div class="flex gap-y-2">  <!-- Vertical gap only -->
```

### Flex Items

```html
<div class="flex-1">     <!-- Grow and shrink equally -->
<div class="flex-auto">  <!-- Grow/shrink, respect initial size -->
<div class="flex-initial"> <!-- Shrink only, no grow -->
<div class="flex-none">  <!-- Don't grow or shrink -->
```

### Individual Flex Properties

```html
<div class="grow">       <!-- flex-grow: 1 -->
<div class="grow-0">     <!-- flex-grow: 0 -->
<div class="shrink">     <!-- flex-shrink: 1 -->
<div class="shrink-0">   <!-- flex-shrink: 0 (prevent shrinking) -->
<div class="basis-1/2">  <!-- flex-basis: 50% -->
<div class="basis-64">   <!-- flex-basis: 16rem -->
```

### Order

```html
<div class="order-first">  <!-- -9999 -->
<div class="order-last">   <!-- 9999 -->
<div class="order-none">   <!-- 0 -->
<div class="order-1">      <!-- 1 -->
```

---

## CSS Grid

### Enable Grid

```html
<div class="grid">         <!-- display: grid -->
<div class="inline-grid">  <!-- display: inline-grid -->
```

### Grid Template Columns

```html
<div class="grid grid-cols-1">   <!-- 1 column -->
<div class="grid grid-cols-2">   <!-- 2 equal columns -->
<div class="grid grid-cols-3">   <!-- 3 equal columns -->
<div class="grid grid-cols-4">   <!-- 4 equal columns -->
<div class="grid grid-cols-12">  <!-- 12 column grid -->
<div class="grid grid-cols-none"> <!-- No columns -->
```

### Grid Template Rows

```html
<div class="grid grid-rows-3">   <!-- 3 equal rows -->
<div class="grid grid-rows-6">   <!-- 6 equal rows -->
```

### Custom Grid Templates

```html
<!-- Arbitrary columns -->
<div class="grid grid-cols-[200px_1fr_100px]">

<!-- Auto-fit responsive -->
<div class="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))]">

<!-- Named lines -->
<div class="grid grid-cols-[sidebar_200px_main_1fr]">
```

### Gap

```html
<div class="grid gap-4">     <!-- All gaps -->
<div class="grid gap-x-8">   <!-- Column gap -->
<div class="grid gap-y-4">   <!-- Row gap -->
```

### Column Span

```html
<div class="col-span-2">      <!-- Span 2 columns -->
<div class="col-span-full">   <!-- Span all columns -->
<div class="col-start-2">     <!-- Start at column 2 -->
<div class="col-end-4">       <!-- End at column 4 -->
<div class="col-start-2 col-end-5"> <!-- Columns 2-4 -->
```

### Row Span

```html
<div class="row-span-2">      <!-- Span 2 rows -->
<div class="row-span-full">   <!-- Span all rows -->
<div class="row-start-1 row-end-3"> <!-- Rows 1-2 -->
```

### Auto Flow

```html
<div class="grid grid-flow-row">    <!-- Fill by row (default) -->
<div class="grid grid-flow-col">    <!-- Fill by column -->
<div class="grid grid-flow-dense">  <!-- Dense packing -->
<div class="grid grid-flow-row-dense">
```

### Auto Columns/Rows

```html
<div class="grid auto-cols-auto">  <!-- Size to content -->
<div class="grid auto-cols-min">   <!-- Min content -->
<div class="grid auto-cols-max">   <!-- Max content -->
<div class="grid auto-cols-fr">    <!-- Equal fractions -->
```

### Place Items

```html
<div class="grid place-items-center">  <!-- Center both axes -->
<div class="grid place-items-start">
<div class="grid place-items-end">
```

### Place Content

```html
<div class="grid place-content-center">
<div class="grid place-content-between">
```

### Place Self (Individual Items)

```html
<div class="place-self-center">
<div class="place-self-start">
<div class="place-self-end">
```

---

## Positioning

### Position Types

```html
<div class="static">     <!-- Default flow -->
<div class="relative">   <!-- Relative to normal position -->
<div class="absolute">   <!-- Relative to positioned parent -->
<div class="fixed">      <!-- Relative to viewport -->
<div class="sticky">     <!-- Sticky positioning -->
```

### Inset (Top/Right/Bottom/Left)

```html
<div class="absolute inset-0">      <!-- All sides 0 -->
<div class="absolute inset-x-0">    <!-- Left & right 0 -->
<div class="absolute inset-y-0">    <!-- Top & bottom 0 -->
<div class="absolute top-0 left-0"> <!-- Top-left corner -->
<div class="absolute bottom-4 right-4"> <!-- Bottom-right with offset -->
```

### Z-Index

```html
<div class="z-0">   <!-- z-index: 0 -->
<div class="z-10">  <!-- z-index: 10 -->
<div class="z-20">  <!-- z-index: 20 -->
<div class="z-50">  <!-- z-index: 50 -->
<div class="z-auto"> <!-- z-index: auto -->
<div class="-z-10">  <!-- z-index: -10 -->
```

---

## Container

### Basic Container

```html
<div class="container">
  <!-- Max-width matches breakpoints -->
</div>
```

Container widths at each breakpoint:
- Default: 100%
- sm (640px+): max-width 640px
- md (768px+): max-width 768px
- lg (1024px+): max-width 1024px
- xl (1280px+): max-width 1280px
- 2xl (1536px+): max-width 1536px

### Centered Container

```html
<div class="container mx-auto">
  <!-- Centered with auto margins -->
</div>
```

### Container with Padding

```html
<div class="container mx-auto px-4">
  <!-- Centered with horizontal padding -->
</div>
```

---

## Common Layout Patterns

### Centered Content

```html
<!-- Flexbox centering -->
<div class="flex items-center justify-center min-h-screen">
  <div>Centered content</div>
</div>

<!-- Grid centering -->
<div class="grid place-items-center min-h-screen">
  <div>Centered content</div>
</div>
```

### Sidebar Layout

```html
<div class="flex min-h-screen">
  <aside class="w-64 shrink-0 bg-gray-100">Sidebar</aside>
  <main class="flex-1 p-6">Main content</main>
</div>
```

### Responsive Sidebar

```html
<div class="flex flex-col md:flex-row min-h-screen">
  <aside class="w-full md:w-64 md:shrink-0">Sidebar</aside>
  <main class="flex-1 p-6">Main content</main>
</div>
```

### Holy Grail Layout

```html
<div class="min-h-screen flex flex-col">
  <header class="h-16 bg-gray-800">Header</header>
  <div class="flex-1 flex">
    <aside class="w-48 bg-gray-100">Left</aside>
    <main class="flex-1 p-6">Content</main>
    <aside class="w-48 bg-gray-100">Right</aside>
  </div>
  <footer class="h-16 bg-gray-800">Footer</footer>
</div>
```

### Card Grid

```html
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  <div class="bg-white rounded-lg shadow p-6">Card 1</div>
  <div class="bg-white rounded-lg shadow p-6">Card 2</div>
  <div class="bg-white rounded-lg shadow p-6">Card 3</div>
  <div class="bg-white rounded-lg shadow p-6">Card 4</div>
</div>
```

### Auto-Fit Grid

```html
<div class="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
  <!-- Cards automatically wrap and resize -->
</div>
```

### Sticky Header

```html
<header class="sticky top-0 z-50 bg-white shadow">
  Navigation
</header>
```

### Sticky Sidebar

```html
<aside class="sticky top-20 h-fit">
  <!-- Sticks 5rem from top -->
</aside>
```

### Fixed Footer

```html
<div class="min-h-screen flex flex-col">
  <main class="flex-1">Content</main>
  <footer class="mt-auto">Always at bottom</footer>
</div>
```

### Overlay/Modal

```html
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
  <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
    Modal content
  </div>
</div>
```

---

## Sizing

### Width

```html
<div class="w-full">      <!-- 100% -->
<div class="w-screen">    <!-- 100vw -->
<div class="w-1/2">       <!-- 50% -->
<div class="w-1/3">       <!-- 33.333% -->
<div class="w-64">        <!-- 16rem (256px) -->
<div class="w-auto">      <!-- Auto -->
<div class="w-fit">       <!-- Fit content -->
<div class="w-min">       <!-- Min content -->
<div class="w-max">       <!-- Max content -->
```

### Height

```html
<div class="h-full">      <!-- 100% -->
<div class="h-screen">    <!-- 100vh -->
<div class="h-dvh">       <!-- Dynamic viewport height -->
<div class="h-64">        <!-- 16rem -->
<div class="h-auto">      <!-- Auto -->
<div class="min-h-screen"> <!-- At least full viewport -->
```

### Size (Width + Height)

```html
<div class="size-16">     <!-- 4rem × 4rem -->
<div class="size-full">   <!-- 100% × 100% -->
```

### Max/Min Width

```html
<div class="max-w-md">    <!-- 28rem -->
<div class="max-w-lg">    <!-- 32rem -->
<div class="max-w-xl">    <!-- 36rem -->
<div class="max-w-prose"> <!-- 65ch (readable width) -->
<div class="max-w-full">  <!-- 100% -->
<div class="max-w-none">  <!-- No max -->
<div class="min-w-0">     <!-- Allow shrinking in flex -->
```

### Aspect Ratio

```html
<div class="aspect-square">  <!-- 1:1 -->
<div class="aspect-video">   <!-- 16:9 -->
<div class="aspect-[4/3]">   <!-- Custom ratio -->
```

---

**Related:** [responsive.md](responsive.md) | [utilities.md](utilities.md)
