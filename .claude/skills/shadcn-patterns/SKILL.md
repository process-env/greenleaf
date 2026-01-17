---
name: shadcn-patterns
description: shadcn/ui component patterns, Radix primitives, Tailwind CSS theming, form handling with react-hook-form and zod, accessible UI components, dark mode (OKLCH colors), and customization strategies. Covers component installation, variants with cva, cn utility, data tables, dialogs, forms, and best practices.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  shadcn: "2.5+"
---

# shadcn/ui Patterns

> **Updated 2026-01-11:** OKLCH color system is now default (replacing HSL). "new-york" is the default style. Added Radix UI migration command.

## Purpose

Comprehensive guide for building UIs with shadcn/ui, covering component patterns, theming, forms, accessibility, and customization.

## When to Use This Skill

Automatically activates when working on:
- Installing or using shadcn/ui components
- Creating forms with validation
- Building dialogs, modals, sheets
- Customizing themes and dark mode
- Working with data tables
- Extending component variants

---

## Quick Start

### New Project Setup Checklist

- [ ] Initialize project: `npx shadcn@latest init`
- [ ] Configure `components.json`
- [ ] Set up CSS variables for theming
- [ ] Install core components (button, form, input)
- [ ] Configure dark mode
- [ ] Set up form validation (react-hook-form + zod)

### Philosophy: Open Code

shadcn/ui is **not a component library**. It's a collection of reusable components you copy into your project. You own the code and can modify it freely.

```
Traditional Library:
npm install → import { Button } → locked implementation

shadcn/ui:
npx shadcn add button → components/ui/button.tsx → full control
```

---

## Installation

### Initialize

```bash
npx shadcn@latest init
```

Configuration prompts:
- Style: Default or New York
- Base color: Slate, Gray, Zinc, etc.
- CSS variables: Yes (recommended)
- Tailwind CSS config: tailwind.config.ts
- Components location: src/components
- Utils location: src/lib/utils

### Add Components

```bash
# Single component
npx shadcn add button

# Multiple components
npx shadcn add button card input

# All components
npx shadcn add --all
```

### Project Structure

```
src/
├── components/
│   └── ui/           # shadcn components
│       ├── button.tsx
│       ├── card.tsx
│       └── ...
├── lib/
│   └── utils.ts      # cn() utility
└── app/
    └── globals.css   # CSS variables
```

---

## Core Utilities

### cn() Function

Merge Tailwind classes with proper precedence.

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Usage
<div className={cn(
  "base-class",
  isActive && "active-class",
  className
)} />
```

### cva() for Variants

Class Variance Authority for component variants.

```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
)
```

See [component-anatomy.md](resources/component-anatomy.md) for complete patterns.

---

## Theming

### CSS Variables

```css
/* globals.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    /* ... dark variants */
  }
}
```

### Dark Mode

```typescript
// Using next-themes
import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
    >
      {children}
    </ThemeProvider>
  )
}

// Toggle component
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
```

See [theming-system.md](resources/theming-system.md) for advanced theming.

---

## Common Components Reference

### Button

```tsx
import { Button } from "@/components/ui/button"

<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
<Button disabled>Disabled</Button>
<Button asChild><Link href="/">Link</Link></Button>
```

### Dialog

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Are you sure?</DialogTitle>
      <DialogDescription>
        This action cannot be undone.
      </DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Card

```tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

---

## Form Patterns

### With react-hook-form + zod

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
})

function LoginForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="email@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  )
}
```

See [form-patterns.md](resources/form-patterns.md) for complete examples.

---

## Gotchas & Real-World Warnings

### You Own the Code (For Better or Worse)

**shadcn copies code into YOUR project. Updates don't propagate:**

```bash
# You ran this 6 months ago:
npx shadcn add button

# Button component has been updated with bug fixes and new features
# Your local copy? Still the old version.

# DANGER: Running `add` again overwrites YOUR customizations
npx shadcn add button  # Bye bye, your custom variants

# SAFER: Check diff before updating
npx shadcn diff button  # See what changed
```

**Maintenance burden:** You're now responsible for keeping components updated, fixing accessibility issues, and security patches.

### Radix Primitives Have Opinions

**Radix components control focus, keyboard navigation, and ARIA. Fighting them causes bugs:**

```tsx
// DANGER: Wrapping Radix trigger breaks accessibility
<DialogTrigger>
  <div onClick={customHandler}>  {/* Breaks keyboard navigation */}
    <Button>Open</Button>
  </div>
</DialogTrigger>

// CORRECT: Use asChild to merge props onto your element
<DialogTrigger asChild>
  <Button onClick={customHandler}>Open</Button>
</DialogTrigger>
```

**Common Radix gotchas:**
- `asChild` merges props onto single child - multiple children breaks it
- Portaled content (Dialog, Popover) renders outside React tree - CSS context lost
- Controlled components require BOTH `open` AND `onOpenChange`

### CSS Variable Specificity Wars

**Your globals.css variables can be overridden unexpectedly:**

```css
/* globals.css */
:root {
  --primary: 222.2 47.4% 11.2%;
}

/* Some library or component */
:root {
  --primary: blue;  /* Oops, overwritten */
}

/* SAFER: Use more specific selectors or CSS layers */
@layer base {
  :root {
    --primary: 222.2 47.4% 11.2%;
  }
}
```

### Dark Mode Flash

**Theme flashes on page load because JavaScript runs after HTML renders:**

```tsx
// DANGER: useTheme causes flash because it runs client-side
function ThemeToggle() {
  const { theme } = useTheme();  // undefined on first render
  return <span>{theme}</span>;   // Shows wrong theme briefly
}

// BETTER: Suppress hydration mismatch and handle loading state
function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) return <Skeleton className="h-9 w-9" />;
  return <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>...</Button>;
}
```

### Form Component Complexity

**The Form component adds layers that can confuse:**

```tsx
// This structure is REQUIRED - missing any piece breaks validation
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}  // Must pass control
      name="email"            // Must match schema
      render={({ field }) => (
        <FormItem>
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input {...field} />  {/* Must spread field */}
          </FormControl>
          <FormMessage />  {/* Shows validation errors */}
        </FormItem>
      )}
    />
  </form>
</Form>

// COMMON MISTAKES:
// - Forgetting to spread {...field} on Input
// - Missing FormControl wrapper
// - Wrong name (doesn't match zod schema)
// - Forgetting form.handleSubmit wrapper
```

### cn() Ordering Matters

**tailwind-merge has opinions about which classes win:**

```tsx
// You might expect bg-red-500 to win (it's last)
cn('bg-blue-500', 'bg-red-500')  // Result: 'bg-red-500' ✓

// But with conditionals, order can surprise you
cn('p-4', someCondition && 'p-2')  // If false: 'p-4'. If true: 'p-2'

// GOTCHA: Classes from className prop might not override
<Button className="bg-red-500" variant="default">
  {/* variant="default" sets bg-primary, might win over bg-red-500 */}
</Button>

// Check buttonVariants to understand specificity
```

### What These Patterns Don't Tell You

1. **Bundle size** - Each component adds to your bundle; import only what you use
2. **Server Components** - Many shadcn components need `"use client"` directive
3. **Animations** - Default animations use CSS, might conflict with Framer Motion
4. **Testing** - Radix portals make testing harder; need special queries
5. **TypeScript strictness** - Some components have loose types; consider adding stricter interfaces
6. **Accessibility audits** - Radix is accessible but YOUR customizations might break it

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Set up shadcn | [installation-setup.md](resources/installation-setup.md) |
| Understand components | [component-anatomy.md](resources/component-anatomy.md) |
| Customize theme | [theming-system.md](resources/theming-system.md) |
| Build forms | [form-patterns.md](resources/form-patterns.md) |
| Use dialogs/modals | [dialog-and-modals.md](resources/dialog-and-modals.md) |
| Display data | [data-display.md](resources/data-display.md) |
| Add navigation | [navigation-components.md](resources/navigation-components.md) |
| Extend components | [customization-guide.md](resources/customization-guide.md) |
| Ensure accessibility | [accessibility.md](resources/accessibility.md) |
| See examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [installation-setup.md](resources/installation-setup.md)
CLI usage, project initialization, configuration, updates

### [component-anatomy.md](resources/component-anatomy.md)
Component structure, props, forwardRef, compound components

### [theming-system.md](resources/theming-system.md)
CSS variables, colors, dark mode, custom themes

### [form-patterns.md](resources/form-patterns.md)
react-hook-form, zod validation, FormField composition

### [dialog-and-modals.md](resources/dialog-and-modals.md)
Dialog, Sheet, AlertDialog, Drawer, controlled state

### [data-display.md](resources/data-display.md)
Table, DataTable with TanStack, Cards, pagination

### [navigation-components.md](resources/navigation-components.md)
Tabs, Accordion, Sidebar, Breadcrumb, NavigationMenu

### [customization-guide.md](resources/customization-guide.md)
Extending variants, compound components, animations

### [accessibility.md](resources/accessibility.md)
ARIA patterns, keyboard navigation, Radix primitives

### [complete-examples.md](resources/complete-examples.md)
Full page examples, feature implementations

---

**Skill Status**: COMPLETE
**Line Count**: < 380
**Progressive Disclosure**: 10 resource files
