# Theming System

Guide to customizing colors, dark mode, and creating themes.

## Table of Contents

- [CSS Variables](#css-variables)
- [Color System](#color-system)
- [Dark Mode](#dark-mode)
- [Custom Themes](#custom-themes)
- [Dynamic Theming](#dynamic-theming)

---

## CSS Variables

### Base Variables

```css
/* globals.css */
@layer base {
  :root {
    /* Backgrounds */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;

    /* Card */
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    /* Popover */
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    /* Primary */
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;

    /* Secondary */
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;

    /* Muted */
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;

    /* Accent */
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;

    /* Destructive */
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;

    /* Border/Input */
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;

    /* Border radius */
    --radius: 0.5rem;
  }
}
```

### HSL Format

Variables use HSL without `hsl()` wrapper for Tailwind opacity:

```css
/* Definition */
--primary: 222.2 47.4% 11.2%;

/* Usage in Tailwind */
bg-primary        /* hsl(var(--primary)) */
bg-primary/50     /* hsl(var(--primary) / 0.5) */
```

---

## Color System

### Semantic Colors

| Variable | Purpose |
|----------|---------|
| `background` | Page background |
| `foreground` | Default text |
| `primary` | Primary actions, links |
| `secondary` | Secondary actions |
| `muted` | Subdued elements |
| `accent` | Highlights |
| `destructive` | Errors, deletions |
| `border` | Borders |
| `input` | Form inputs |
| `ring` | Focus rings |

### Adding Custom Colors

```css
/* globals.css */
:root {
  --success: 142.1 76.2% 36.3%;
  --success-foreground: 355.7 100% 97.3%;

  --warning: 38 92% 50%;
  --warning-foreground: 48 96% 89%;

  --info: 199 89% 48%;
  --info-foreground: 0 0% 100%;
}
```

```typescript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      success: {
        DEFAULT: "hsl(var(--success))",
        foreground: "hsl(var(--success-foreground))",
      },
      warning: {
        DEFAULT: "hsl(var(--warning))",
        foreground: "hsl(var(--warning-foreground))",
      },
      info: {
        DEFAULT: "hsl(var(--info))",
        foreground: "hsl(var(--info-foreground))",
      },
    },
  },
}
```

---

## Dark Mode

### Setup with next-themes

```bash
npm install next-themes
```

```tsx
// app/providers.tsx
"use client"

import { ThemeProvider } from "next-themes"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}

// app/layout.tsx
import { Providers } from "./providers"

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

### Dark Mode Variables

```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;

  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;

  --popover: 222.2 84% 4.9%;
  --popover-foreground: 210 40% 98%;

  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;

  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;

  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;

  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;

  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;

  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

### Theme Toggle Component

```tsx
"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Custom Themes

### Creating a Theme

```css
/* Blue theme */
.theme-blue {
  --primary: 221.2 83.2% 53.3%;
  --primary-foreground: 210 40% 98%;
}

/* Green theme */
.theme-green {
  --primary: 142.1 76.2% 36.3%;
  --primary-foreground: 355.7 100% 97.3%;
}

/* Rose theme */
.theme-rose {
  --primary: 346.8 77.2% 49.8%;
  --primary-foreground: 355.7 100% 97.3%;
}
```

### Theme Switcher

```tsx
"use client"

import { useEffect, useState } from "react"

const themes = ["default", "blue", "green", "rose"]

export function ThemeSwitcher() {
  const [theme, setTheme] = useState("default")

  useEffect(() => {
    document.body.classList.remove(...themes.map(t => `theme-${t}`))
    if (theme !== "default") {
      document.body.classList.add(`theme-${theme}`)
    }
  }, [theme])

  return (
    <select value={theme} onChange={(e) => setTheme(e.target.value)}>
      {themes.map(t => (
        <option key={t} value={t}>{t}</option>
      ))}
    </select>
  )
}
```

---

## Dynamic Theming

### Brand Color from API

```tsx
"use client"

import { useEffect } from "react"

function useCustomTheme(primaryColor: string) {
  useEffect(() => {
    // Convert hex to HSL
    const hsl = hexToHSL(primaryColor)
    document.documentElement.style.setProperty(
      "--primary",
      `${hsl.h} ${hsl.s}% ${hsl.l}%`
    )
  }, [primaryColor])
}

function hexToHSL(hex: string) {
  // Convert hex to RGB then to HSL
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  }
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [customization-guide.md](customization-guide.md)
