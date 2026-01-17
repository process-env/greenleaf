# Component Anatomy

Understanding shadcn/ui component structure and patterns.

## Table of Contents

- [Component Structure](#component-structure)
- [ForwardRef Pattern](#forwardref-pattern)
- [Variants with cva](#variants-with-cva)
- [Compound Components](#compound-components)
- [asChild Pattern](#aschild-pattern)

---

## Component Structure

### Basic Component

```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
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
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

---

## ForwardRef Pattern

### Why ForwardRef?

- Allows parent to access DOM element
- Required for focus management
- Needed for Radix composition

```tsx
// Without forwardRef - ref doesn't work
function Button(props: ButtonProps) {
  return <button {...props} />
}

// With forwardRef - ref is forwarded
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (props, ref) => {
    return <button ref={ref} {...props} />
  }
)
Button.displayName = "Button" // Required for DevTools
```

### With Slot

```tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} {...props} />
  }
)
```

---

## Variants with cva

### Defining Variants

```tsx
import { cva, type VariantProps } from "class-variance-authority"

const cardVariants = cva(
  // Base styles (always applied)
  "rounded-lg border bg-card text-card-foreground shadow-sm",
  {
    variants: {
      // Named variant groups
      variant: {
        default: "border-border",
        outline: "border-2 border-primary",
        elevated: "shadow-lg",
      },
      size: {
        sm: "p-4",
        default: "p-6",
        lg: "p-8",
      },
      interactive: {
        true: "cursor-pointer hover:shadow-md transition-shadow",
        false: "",
      }
    },
    // Compound variants (combinations)
    compoundVariants: [
      {
        variant: "elevated",
        interactive: true,
        className: "hover:shadow-xl",
      },
    ],
    // Default values
    defaultVariants: {
      variant: "default",
      size: "default",
      interactive: false,
    },
  }
)

// Type for props
type CardProps = VariantProps<typeof cardVariants>
// Results in: { variant?: "default" | "outline" | "elevated", size?: ... }
```

### Using Variants

```tsx
interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, size, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, size, interactive, className }))}
      {...props}
    />
  )
)
```

---

## Compound Components

### Pattern

```tsx
// Card with sub-components
const Card = React.forwardRef<HTMLDivElement, CardProps>(...)
const CardHeader = React.forwardRef<HTMLDivElement, CardHeaderProps>(...)
const CardTitle = React.forwardRef<HTMLParagraphElement, CardTitleProps>(...)
const CardDescription = React.forwardRef<HTMLParagraphElement, ...>(...)
const CardContent = React.forwardRef<HTMLDivElement, CardContentProps>(...)
const CardFooter = React.forwardRef<HTMLDivElement, CardFooterProps>(...)

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
}
```

### Implementation

```tsx
const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm",
        className
      )}
      {...props}
    />
  )
)

const CardHeader = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
)

const CardTitle = React.forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-2xl font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  )
)

const CardContent = React.forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
  )
)
```

### Usage

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>
```

---

## asChild Pattern

### What is asChild?

Replaces component's element with child, merging props.

```tsx
// Regular button
<Button>Click me</Button>
// Renders: <button>Click me</button>

// asChild with Link
<Button asChild>
  <Link href="/home">Go Home</Link>
</Button>
// Renders: <a href="/home">Go Home</a> with Button styles
```

### Implementation

```tsx
import { Slot } from "@radix-ui/react-slot"

interface ButtonProps {
  asChild?: boolean
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return <Comp ref={ref} {...props} />
  }
)
```

### Use Cases

```tsx
// Link that looks like button
<Button asChild>
  <Link href="/about">About</Link>
</Button>

// Next.js Link
<Button asChild>
  <NextLink href="/dashboard">Dashboard</NextLink>
</Button>

// Custom wrapper
<Button asChild>
  <TooltipTrigger>Hover me</TooltipTrigger>
</Button>
```

---

## Type Patterns

### Extending HTML Attributes

```tsx
interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  // Additional props
  error?: boolean
}
```

### With Variant Props

```tsx
interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}
```

### Omitting Props

```tsx
interface DialogProps
  extends Omit<DialogPrimitive.DialogProps, "modal"> {
  // Remove modal from type
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [customization-guide.md](customization-guide.md)
