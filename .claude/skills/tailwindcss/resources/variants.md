# Tailwind CSS State Variants

## Table of Contents

1. [Interactive States](#interactive-states)
2. [Form States](#form-states)
3. [Group & Peer States](#group--peer-states)
4. [Pseudo-Elements](#pseudo-elements)
5. [Structural Selectors](#structural-selectors)
6. [Media & Feature Queries](#media--feature-queries)
7. [ARIA & Data Attributes](#aria--data-attributes)
8. [Custom Variants](#custom-variants)

---

## Interactive States

### Basic Interactions

```html
<button class="
  bg-blue-500
  hover:bg-blue-600
  focus:bg-blue-700
  active:bg-blue-800
">
```

| Variant | Triggers When |
|---------|---------------|
| `hover:` | Mouse over element |
| `focus:` | Element has focus |
| `focus-within:` | Element or descendant has focus |
| `focus-visible:` | Focus via keyboard (not mouse) |
| `active:` | Element is being pressed |
| `visited:` | Link has been visited |

### Focus Ring Pattern

```html
<button class="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-500
  focus:ring-offset-2
">
```

### Keyboard Focus Only

```html
<button class="
  focus:outline-none
  focus-visible:ring-2
  focus-visible:ring-blue-500
">
<!-- Ring only shows on keyboard focus, not mouse clicks -->
```

---

## Form States

### Input States

```html
<input class="
  border-gray-300
  focus:border-blue-500
  focus:ring-blue-500
  invalid:border-red-500
  invalid:text-red-600
  disabled:bg-gray-100
  disabled:cursor-not-allowed
"/>
```

| Variant | Triggers When |
|---------|---------------|
| `disabled:` | Element is disabled |
| `enabled:` | Element is enabled |
| `checked:` | Checkbox/radio is checked |
| `indeterminate:` | Checkbox is indeterminate |
| `required:` | Field is required |
| `invalid:` | Field fails validation |
| `valid:` | Field passes validation |
| `in-range:` | Number input in range |
| `out-of-range:` | Number input out of range |
| `placeholder-shown:` | Placeholder is visible |
| `autofill:` | Browser autofilled the field |
| `read-only:` | Field is read-only |

### Checkbox/Radio Styling

```html
<label class="flex items-center gap-2">
  <input type="checkbox" class="
    appearance-none
    w-5 h-5
    border-2 border-gray-300
    rounded
    checked:bg-blue-500
    checked:border-blue-500
  "/>
  <span>Accept terms</span>
</label>
```

---

## Group & Peer States

### Group (Parent → Child)

Style children based on parent state:

```html
<div class="group cursor-pointer">
  <img class="group-hover:scale-105 transition" />
  <h3 class="group-hover:text-blue-500">Title</h3>
  <p class="group-hover:opacity-100 opacity-75">Description</p>
</div>
```

### Named Groups

For nested groups:

```html
<div class="group/card">
  <div class="group/title">
    <h3 class="group-hover/card:text-blue-500 group-hover/title:underline">
      Title
    </h3>
  </div>
</div>
```

### Available Group Variants

`group-hover:`, `group-focus:`, `group-active:`, `group-disabled:`, `group-checked:`, `group-invalid:`, `group-[selector]:` (arbitrary)

### Peer (Sibling → Sibling)

Style elements based on sibling state:

```html
<input type="email" class="peer" placeholder="Email" />
<p class="
  hidden
  peer-invalid:block
  peer-invalid:text-red-500
  text-sm mt-1
">
  Please enter a valid email
</p>
```

**Important:** Peer only works with PREVIOUS siblings (CSS limitation).

### Named Peers

```html
<input id="email" class="peer/email" />
<input id="name" class="peer/name" />
<p class="peer-invalid/email:text-red-500">Email error</p>
<p class="peer-invalid/name:text-red-500">Name error</p>
```

---

## Pseudo-Elements

### Before & After

```html
<!-- Automatically adds content: '' -->
<label class="before:content-['*'] before:text-red-500 before:mr-1">
  Required Field
</label>

<blockquote class="
  relative
  pl-4
  before:absolute
  before:left-0
  before:top-0
  before:bottom-0
  before:w-1
  before:bg-blue-500
">
  Quote text
</blockquote>
```

### Dynamic Content

```html
<div class="before:content-[attr(data-label)]" data-label="Hello">
```

### Placeholder

```html
<input class="placeholder:text-gray-400 placeholder:italic" placeholder="Search..." />
```

### Selection

```html
<p class="selection:bg-pink-300 selection:text-pink-900">
  Select this text to see custom highlight
</p>
```

### File Input

```html
<input type="file" class="
  file:mr-4
  file:py-2
  file:px-4
  file:rounded-full
  file:border-0
  file:bg-blue-50
  file:text-blue-700
  hover:file:bg-blue-100
"/>
```

### List Markers

```html
<ul class="marker:text-blue-500 list-disc pl-5">
  <li>Item 1</li>
  <li>Item 2</li>
</ul>
```

### First Line & Letter

```html
<p class="first-line:uppercase first-line:tracking-widest">
  Paragraph text...
</p>

<p class="first-letter:text-7xl first-letter:font-bold first-letter:float-left first-letter:mr-3">
  Drop cap paragraph...
</p>
```

---

## Structural Selectors

### Position-Based

```html
<ul>
  <li class="first:pt-0 last:pb-0 py-4 border-b last:border-0">
    List items with proper spacing
  </li>
</ul>
```

| Variant | Targets |
|---------|---------|
| `first:` | First child |
| `last:` | Last child |
| `only:` | Only child |
| `first-of-type:` | First of its type |
| `last-of-type:` | Last of its type |
| `only-of-type:` | Only of its type |

### Odd & Even

```html
<tbody>
  <tr class="odd:bg-gray-50 even:bg-white">
    <td>...</td>
  </tr>
</tbody>
```

### Nth Child

```html
<div class="nth-[3]:bg-red-500">Third item</div>
<div class="nth-last-[2]:font-bold">Second from last</div>
<div class="nth-[3n]:border-b">Every third</div>
```

### Empty State

```html
<div class="empty:hidden">
  <!-- Hidden if no content -->
</div>
```

---

## Media & Feature Queries

### Dark Mode

```html
<div class="bg-white dark:bg-gray-900 text-black dark:text-white">
```

### Print Styles

```html
<div class="print:hidden">Don't print this</div>
<div class="hidden print:block">Only in print</div>
```

### Motion Preferences

```html
<div class="animate-bounce motion-reduce:animate-none">
  Respects user's motion preferences
</div>

<div class="motion-safe:animate-spin">
  Only animates if motion is OK
</div>
```

### Contrast Preferences

```html
<div class="contrast-more:border-2 contrast-more:border-black">
  Higher contrast for users who need it
</div>
```

### Orientation

```html
<div class="portrait:flex-col landscape:flex-row">
```

### Forced Colors (High Contrast Mode)

```html
<button class="forced-colors:border-2">
  Respects Windows High Contrast Mode
</button>
```

### Feature Detection

```html
<div class="supports-[display:grid]:grid">
  Uses grid if supported
</div>
```

---

## ARIA & Data Attributes

### ARIA States

```html
<button
  aria-expanded="true"
  class="aria-expanded:rotate-180"
>
  <ChevronIcon />
</button>

<div aria-busy="true" class="aria-busy:opacity-50">
  Loading...
</div>
```

Available: `aria-checked:`, `aria-disabled:`, `aria-expanded:`, `aria-hidden:`, `aria-pressed:`, `aria-readonly:`, `aria-required:`, `aria-selected:`

### Data Attributes

```html
<div data-active="true" class="data-[active=true]:bg-blue-500">
```

```html
<div data-state="open" class="data-[state=open]:animate-in">
```

### Open State (Details/Dialog)

```html
<details class="open:bg-gray-100">
  <summary>Click to expand</summary>
  <p>Content</p>
</details>
```

---

## Custom Variants

### Creating Custom Variants

```css
@custom-variant theme-midnight {
  &:where([data-theme="midnight"] *) {
    @slot;
  }
}
```

Use: `theme-midnight:bg-purple-900`

### Arbitrary Variants

One-off selectors:

```html
<div class="[&.is-active]:bg-blue-500">
  Styled when has .is-active class
</div>

<div class="[&>*]:p-4">
  All direct children get padding
</div>

<div class="[&_p]:text-gray-600">
  All descendant paragraphs
</div>
```

### Combining Variants

```html
<button class="
  dark:hover:bg-gray-800
  md:hover:scale-105
  group-hover:first:text-blue-500
">
```

### Not Variant

```html
<div class="not-hover:opacity-50">
  Faded when NOT hovered
</div>

<div class="not-first:mt-4">
  Margin on all except first
</div>
```

---

## Cheatsheet: Variant Stacking Order

Variants can be stacked. Order matters for specificity:

```html
<button class="dark:md:hover:bg-blue-700">
```

This means: "On dark mode, on medium screens and up, when hovered"

Common patterns:
- `dark:hover:` - Dark mode hover
- `md:focus:` - Medium screen focus
- `group-hover:first:` - First child when group is hovered
- `disabled:hover:` - Hover on disabled (usually no effect)

---

**Related:** [responsive.md](responsive.md) | [layout.md](layout.md)
