# Customization Guide

Advanced customization patterns for shadcn/ui components.

## Table of Contents

- [Extending Variants](#extending-variants)
- [Custom Components](#custom-components)
- [Animations](#animations)
- [Global Styles](#global-styles)

---

## Extending Variants

### Adding New Variants

```tsx
// components/ui/button.tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center ...",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // Add new variants
        success: "bg-green-600 text-white hover:bg-green-700",
        warning: "bg-yellow-500 text-black hover:bg-yellow-600",
        gradient: "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
        // Add new sizes
        xs: "h-7 rounded px-2 text-xs",
        xl: "h-14 rounded-lg px-10 text-lg",
      },
    },
  }
)
```

### Compound Variants

```tsx
const cardVariants = cva("rounded-lg border bg-card text-card-foreground", {
  variants: {
    variant: {
      default: "shadow-sm",
      outline: "border-2",
      elevated: "shadow-lg",
    },
    interactive: {
      true: "cursor-pointer",
      false: "",
    },
  },
  compoundVariants: [
    // When both interactive and elevated
    {
      variant: "elevated",
      interactive: true,
      className: "hover:shadow-xl transition-shadow",
    },
    // When interactive with any variant
    {
      interactive: true,
      className: "hover:border-primary/50",
    },
  ],
  defaultVariants: {
    variant: "default",
    interactive: false,
  },
})
```

---

## Custom Components

### Wrapping Base Components

```tsx
// components/ui/loading-button.tsx
import { Button, ButtonProps } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface LoadingButtonProps extends ButtonProps {
  isLoading?: boolean
  loadingText?: string
}

export function LoadingButton({
  isLoading,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {loadingText ?? "Loading..."}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
```

### Composing Components

```tsx
// components/user-avatar.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface UserAvatarProps {
  user: { name: string; image?: string }
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
}

export function UserAvatar({ user, size = "md", className }: UserAvatarProps) {
  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={user.image} alt={user.name} />
      <AvatarFallback>{initials}</AvatarFallback>
    </Avatar>
  )
}
```

### Polymorphic Components

```tsx
import { Slot } from "@radix-ui/react-slot"

interface PolymorphicProps<T extends React.ElementType> {
  as?: T
  asChild?: boolean
  children: React.ReactNode
}

type Props<T extends React.ElementType> = PolymorphicProps<T> &
  Omit<React.ComponentPropsWithoutRef<T>, keyof PolymorphicProps<T>>

export function Polymorphic<T extends React.ElementType = "div">({
  as,
  asChild,
  children,
  ...props
}: Props<T>) {
  const Comp = asChild ? Slot : as ?? "div"
  return <Comp {...props}>{children}</Comp>
}

// Usage
<Polymorphic as="section" className="...">Content</Polymorphic>
<Polymorphic asChild><Link href="/">Link</Link></Polymorphic>
```

---

## Animations

### Tailwind Animation Classes

```css
/* globals.css */
@layer utilities {
  .animate-in {
    animation: enter 0.15s ease-out;
  }

  .animate-out {
    animation: exit 0.15s ease-in;
  }

  .fade-in {
    --tw-enter-opacity: 1;
  }

  .fade-out {
    --tw-exit-opacity: 0;
  }

  .slide-in-from-top {
    --tw-enter-translate-y: -100%;
  }

  .slide-out-to-top {
    --tw-exit-translate-y: -100%;
  }
}

@keyframes enter {
  from {
    opacity: var(--tw-enter-opacity, 1);
    transform: translate3d(
      var(--tw-enter-translate-x, 0),
      var(--tw-enter-translate-y, 0),
      0
    ) scale(var(--tw-enter-scale, 1));
  }
}

@keyframes exit {
  to {
    opacity: var(--tw-exit-opacity, 1);
    transform: translate3d(
      var(--tw-exit-translate-x, 0),
      var(--tw-exit-translate-y, 0),
      0
    ) scale(var(--tw-exit-scale, 1));
  }
}
```

### Custom Keyframes

```typescript
// tailwind.config.ts
theme: {
  extend: {
    keyframes: {
      "slide-up": {
        from: { transform: "translateY(100%)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
      "slide-down": {
        from: { transform: "translateY(-100%)", opacity: "0" },
        to: { transform: "translateY(0)", opacity: "1" },
      },
      pulse: {
        "0%, 100%": { opacity: "1" },
        "50%": { opacity: "0.5" },
      },
      bounce: {
        "0%, 100%": { transform: "translateY(-25%)" },
        "50%": { transform: "translateY(0)" },
      },
    },
    animation: {
      "slide-up": "slide-up 0.3s ease-out",
      "slide-down": "slide-down 0.3s ease-out",
      "pulse-slow": "pulse 3s infinite",
      "bounce-slow": "bounce 2s infinite",
    },
  },
}
```

### Framer Motion Integration

```tsx
import { motion } from "framer-motion"

const MotionCard = motion(Card)

<MotionCard
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
  transition={{ duration: 0.3 }}
>
  {/* content */}
</MotionCard>
```

---

## Global Styles

### Layer Organization

```css
/* globals.css */

/* CSS Reset and base styles */
@layer base {
  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground;
  }

  h1 {
    @apply text-4xl font-bold tracking-tight;
  }

  h2 {
    @apply text-3xl font-semibold tracking-tight;
  }

  h3 {
    @apply text-2xl font-semibold tracking-tight;
  }
}

/* Reusable component styles */
@layer components {
  .container {
    @apply mx-auto max-w-7xl px-4 sm:px-6 lg:px-8;
  }

  .prose-custom {
    @apply prose prose-slate dark:prose-invert max-w-none;
  }

  .form-section {
    @apply space-y-6 rounded-lg border p-6;
  }
}

/* Utility overrides */
@layer utilities {
  .text-balance {
    text-wrap: balance;
  }

  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
}
```

### Focus Styles

```css
@layer base {
  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2 ring-offset-background;
  }

  /* Remove focus ring for mouse users */
  :focus:not(:focus-visible) {
    @apply outline-none ring-0;
  }
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [component-anatomy.md](component-anatomy.md)
- [theming-system.md](theming-system.md)
