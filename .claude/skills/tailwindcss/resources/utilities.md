# Tailwind CSS Utility Reference

## Table of Contents

1. [Spacing](#spacing)
2. [Colors](#colors)
3. [Typography](#typography)
4. [Borders](#borders)
5. [Shadows](#shadows)
6. [Effects & Filters](#effects--filters)
7. [Transitions & Animation](#transitions--animation)
8. [Transforms](#transforms)
9. [Interactivity](#interactivity)

---

## Spacing

### Padding

| Class | CSS |
|-------|-----|
| `p-0` | padding: 0 |
| `p-1` | padding: 0.25rem (4px) |
| `p-2` | padding: 0.5rem (8px) |
| `p-4` | padding: 1rem (16px) |
| `p-6` | padding: 1.5rem (24px) |
| `p-8` | padding: 2rem (32px) |
| `p-px` | padding: 1px |

**Directional:**
- `pt-` (top), `pr-` (right), `pb-` (bottom), `pl-` (left)
- `px-` (left + right), `py-` (top + bottom)
- `ps-` (inline-start), `pe-` (inline-end) - RTL aware

### Margin

Same pattern as padding with `m-` prefix:
- `m-4`, `mt-4`, `mx-auto`, `my-8`
- Negative margins: `-mt-4`, `-mx-2`
- Auto margins: `mx-auto`, `ml-auto`

### Space Between

```html
<div class="flex space-x-4">  <!-- Horizontal gap between children -->
<div class="flex flex-col space-y-2">  <!-- Vertical gap -->
```

Note: `gap-*` is preferred over `space-*` for flex/grid.

---

## Colors

### Color Palette

Built-in colors with shades 50-950:
- **Gray:** slate, gray, zinc, neutral, stone
- **Colors:** red, orange, amber, yellow, lime, green, emerald, teal, cyan, sky, blue, indigo, violet, purple, fuchsia, pink, rose

### Usage

```html
<div class="bg-blue-500">     <!-- Background -->
<div class="text-gray-900">   <!-- Text -->
<div class="border-red-300">  <!-- Border -->
<div class="ring-green-500">  <!-- Ring -->
<div class="shadow-purple-500/50"> <!-- Shadow color with opacity -->
```

### Special Colors

```html
<div class="bg-white">
<div class="bg-black">
<div class="bg-transparent">
<div class="text-inherit">
<div class="border-current">  <!-- Uses currentColor -->
```

### Opacity Modifier

```html
<div class="bg-black/50">      <!-- 50% opacity -->
<div class="bg-blue-500/75">   <!-- 75% opacity -->
<div class="bg-red-500/[.35]"> <!-- Arbitrary 35% -->
```

### Gradients

```html
<div class="bg-gradient-to-r from-blue-500 to-purple-500">
<div class="bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500">
```

Directions: `to-t`, `to-tr`, `to-r`, `to-br`, `to-b`, `to-bl`, `to-l`, `to-tl`

---

## Typography

### Font Size

| Class | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 0.75rem | 1rem |
| `text-sm` | 0.875rem | 1.25rem |
| `text-base` | 1rem | 1.5rem |
| `text-lg` | 1.125rem | 1.75rem |
| `text-xl` | 1.25rem | 1.75rem |
| `text-2xl` | 1.5rem | 2rem |
| `text-3xl` | 1.875rem | 2.25rem |
| `text-4xl` | 2.25rem | 2.5rem |
| `text-5xl` | 3rem | 1 |
| `text-6xl` | 3.75rem | 1 |
| `text-7xl` | 4.5rem | 1 |
| `text-8xl` | 6rem | 1 |
| `text-9xl` | 8rem | 1 |

### Font Weight

| Class | Weight |
|-------|--------|
| `font-thin` | 100 |
| `font-extralight` | 200 |
| `font-light` | 300 |
| `font-normal` | 400 |
| `font-medium` | 500 |
| `font-semibold` | 600 |
| `font-bold` | 700 |
| `font-extrabold` | 800 |
| `font-black` | 900 |

### Font Family

```html
<p class="font-sans">Sans-serif</p>
<p class="font-serif">Serif</p>
<p class="font-mono">Monospace</p>
```

### Line Height

```html
<p class="leading-none">    <!-- 1 -->
<p class="leading-tight">   <!-- 1.25 -->
<p class="leading-snug">    <!-- 1.375 -->
<p class="leading-normal">  <!-- 1.5 -->
<p class="leading-relaxed"> <!-- 1.625 -->
<p class="leading-loose">   <!-- 2 -->
```

### Letter Spacing

```html
<p class="tracking-tighter"> <!-- -0.05em -->
<p class="tracking-tight">   <!-- -0.025em -->
<p class="tracking-normal">  <!-- 0 -->
<p class="tracking-wide">    <!-- 0.025em -->
<p class="tracking-wider">   <!-- 0.05em -->
<p class="tracking-widest">  <!-- 0.1em -->
```

### Text Alignment

```html
<p class="text-left">
<p class="text-center">
<p class="text-right">
<p class="text-justify">
```

### Text Decoration

```html
<a class="underline">
<a class="line-through">
<a class="no-underline">
<a class="underline decoration-2 decoration-blue-500">
<a class="underline decoration-wavy">
<a class="underline underline-offset-4">
```

### Text Transform

```html
<p class="uppercase">UPPERCASE</p>
<p class="lowercase">lowercase</p>
<p class="capitalize">Capitalize</p>
<p class="normal-case">Normal</p>
```

### Text Overflow

```html
<p class="truncate">         <!-- Ellipsis with single line -->
<p class="text-ellipsis overflow-hidden">
<p class="text-clip overflow-hidden">
```

### Whitespace

```html
<p class="whitespace-normal">
<p class="whitespace-nowrap">
<p class="whitespace-pre">
<p class="whitespace-pre-line">
<p class="whitespace-pre-wrap">
```

### Word Break

```html
<p class="break-normal">
<p class="break-words">
<p class="break-all">
```

---

## Borders

### Border Width

```html
<div class="border">      <!-- 1px all sides -->
<div class="border-0">
<div class="border-2">    <!-- 2px -->
<div class="border-4">    <!-- 4px -->
<div class="border-8">    <!-- 8px -->
<div class="border-t-2">  <!-- Top only -->
<div class="border-x-2">  <!-- Left + right -->
```

### Border Radius

| Class | Radius |
|-------|--------|
| `rounded-none` | 0 |
| `rounded-sm` | 0.125rem |
| `rounded` | 0.25rem |
| `rounded-md` | 0.375rem |
| `rounded-lg` | 0.5rem |
| `rounded-xl` | 0.75rem |
| `rounded-2xl` | 1rem |
| `rounded-3xl` | 1.5rem |
| `rounded-full` | 9999px |

**Directional:** `rounded-t-lg`, `rounded-bl-xl`, `rounded-tl-lg`

### Border Style

```html
<div class="border-solid">
<div class="border-dashed">
<div class="border-dotted">
<div class="border-double">
<div class="border-none">
```

### Divide (Between Children)

```html
<div class="divide-y">         <!-- Horizontal lines between -->
<div class="divide-x">         <!-- Vertical lines between -->
<div class="divide-y-2">       <!-- 2px dividers -->
<div class="divide-gray-200">  <!-- Divider color -->
```

### Ring (Focus Outline Alternative)

```html
<button class="ring-2 ring-blue-500">
<button class="ring-2 ring-offset-2 ring-blue-500">
<button class="focus:ring-2 focus:ring-blue-500">
```

### Outline

```html
<button class="outline-none">
<button class="outline outline-2 outline-blue-500">
<button class="outline-dashed outline-offset-2">
```

---

## Shadows

### Box Shadow

| Class | Effect |
|-------|--------|
| `shadow-sm` | Subtle shadow |
| `shadow` | Default shadow |
| `shadow-md` | Medium shadow |
| `shadow-lg` | Large shadow |
| `shadow-xl` | Extra large |
| `shadow-2xl` | Huge shadow |
| `shadow-inner` | Inset shadow |
| `shadow-none` | No shadow |

### Shadow Color

```html
<div class="shadow-lg shadow-blue-500/50">
```

---

## Effects & Filters

### Opacity

```html
<div class="opacity-0">    <!-- Invisible -->
<div class="opacity-25">
<div class="opacity-50">
<div class="opacity-75">
<div class="opacity-100">  <!-- Fully visible -->
```

### Background Blend Mode

```html
<div class="bg-blend-multiply">
<div class="bg-blend-screen">
<div class="bg-blend-overlay">
```

### Mix Blend Mode

```html
<div class="mix-blend-multiply">
<div class="mix-blend-screen">
```

### Blur

```html
<div class="blur-sm">
<div class="blur">
<div class="blur-md">
<div class="blur-lg">
<div class="blur-xl">
<div class="blur-none">
```

### Backdrop Blur

```html
<div class="backdrop-blur-sm">
<div class="backdrop-blur-md">
```

### Brightness/Contrast

```html
<img class="brightness-50">
<img class="brightness-150">
<img class="contrast-125">
```

### Grayscale/Sepia

```html
<img class="grayscale">
<img class="sepia">
```

### Invert

```html
<img class="invert">
<img class="invert-0">
```

---

## Transitions & Animation

### Transition Property

```html
<div class="transition">          <!-- Common properties -->
<div class="transition-all">      <!-- All properties -->
<div class="transition-colors">   <!-- Color only -->
<div class="transition-opacity">  <!-- Opacity only -->
<div class="transition-shadow">   <!-- Shadow only -->
<div class="transition-transform"> <!-- Transform only -->
<div class="transition-none">
```

### Duration

```html
<div class="duration-75">   <!-- 75ms -->
<div class="duration-100">
<div class="duration-150">  <!-- Default -->
<div class="duration-200">
<div class="duration-300">
<div class="duration-500">
<div class="duration-700">
<div class="duration-1000">
```

### Timing Function

```html
<div class="ease-linear">
<div class="ease-in">
<div class="ease-out">
<div class="ease-in-out">
```

### Delay

```html
<div class="delay-75">
<div class="delay-100">
<div class="delay-150">
<div class="delay-300">
<div class="delay-500">
```

### Built-in Animations

```html
<div class="animate-spin">    <!-- Rotation -->
<div class="animate-ping">    <!-- Pulse outward -->
<div class="animate-pulse">   <!-- Fade in/out -->
<div class="animate-bounce">  <!-- Bounce up/down -->
<div class="animate-none">
```

---

## Transforms

### Scale

```html
<div class="scale-0">
<div class="scale-50">
<div class="scale-75">
<div class="scale-90">
<div class="scale-95">
<div class="scale-100">
<div class="scale-105">
<div class="scale-110">
<div class="scale-125">
<div class="scale-150">
<div class="scale-x-50">   <!-- Horizontal only -->
<div class="scale-y-150">  <!-- Vertical only -->
```

### Rotate

```html
<div class="rotate-0">
<div class="rotate-45">
<div class="rotate-90">
<div class="rotate-180">
<div class="-rotate-45">
<div class="-rotate-90">
```

### Translate

```html
<div class="translate-x-4">
<div class="translate-y-2">
<div class="-translate-x-full">
<div class="translate-x-1/2">
```

### Skew

```html
<div class="skew-x-6">
<div class="skew-y-3">
<div class="-skew-x-12">
```

### Transform Origin

```html
<div class="origin-center">
<div class="origin-top">
<div class="origin-top-right">
<div class="origin-bottom-left">
```

---

## Interactivity

### Cursor

```html
<div class="cursor-auto">
<div class="cursor-default">
<div class="cursor-pointer">
<div class="cursor-wait">
<div class="cursor-text">
<div class="cursor-move">
<div class="cursor-not-allowed">
<div class="cursor-grab">
<div class="cursor-grabbing">
```

### User Select

```html
<div class="select-none">
<div class="select-text">
<div class="select-all">
<div class="select-auto">
```

### Pointer Events

```html
<div class="pointer-events-none">
<div class="pointer-events-auto">
```

### Resize

```html
<textarea class="resize-none">
<textarea class="resize">
<textarea class="resize-x">
<textarea class="resize-y">
```

### Scroll Behavior

```html
<html class="scroll-smooth">
<div class="scroll-auto">
```

### Scroll Snap

```html
<div class="snap-x snap-mandatory">
  <div class="snap-start">Item</div>
  <div class="snap-center">Item</div>
</div>
```

### Touch Action

```html
<div class="touch-auto">
<div class="touch-none">
<div class="touch-pan-x">
<div class="touch-pan-y">
<div class="touch-manipulation">
```

### Accent Color

```html
<input type="checkbox" class="accent-pink-500" />
```

### Caret Color

```html
<input class="caret-blue-500" />
```

---

**Related:** [layout.md](layout.md) | [variants.md](variants.md)
