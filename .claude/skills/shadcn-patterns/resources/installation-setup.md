# Installation and Setup

Complete guide to setting up shadcn/ui in your project.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Adding Components](#adding-components)
- [Updating Components](#updating-components)

---

## Prerequisites

### Required

- React 18+
- Tailwind CSS 3.4+
- TypeScript (recommended)

### Supported Frameworks

- Next.js (App Router & Pages Router)
- Vite
- Remix
- Astro
- Laravel

---

## Installation

### Next.js (App Router)

```bash
# Create new project
npx create-next-app@latest my-app --typescript --tailwind --eslint

# Initialize shadcn
cd my-app
npx shadcn@latest init
```

### Vite

```bash
# Create project
npm create vite@latest my-app -- --template react-ts

# Install Tailwind
cd my-app
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Configure paths in tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Update vite.config.ts
import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

# Initialize shadcn
npx shadcn@latest init
```

### Init Prompts

```bash
npx shadcn@latest init

# Prompts:
✔ Which style would you like to use? › Default
✔ Which color would you like to use as base color? › Slate
✔ Would you like to use CSS variables for colors? › yes
```

---

## Configuration

### components.json

Created after `init`, controls component generation:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### Key Options

| Option | Description |
|--------|-------------|
| `style` | "default" or "new-york" |
| `rsc` | React Server Components support |
| `tsx` | Use TypeScript |
| `tailwind.cssVariables` | Use CSS variables for theming |
| `tailwind.prefix` | Prefix for Tailwind classes |
| `aliases.ui` | Where components are installed |

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
```

---

## Adding Components

### CLI

```bash
# Add single component
npx shadcn add button

# Add multiple
npx shadcn add button card input label

# Add all components
npx shadcn add --all

# Add with specific path
npx shadcn add button --path src/components/custom

# Overwrite existing
npx shadcn add button --overwrite
```

### Manual Installation

Copy from [ui.shadcn.com](https://ui.shadcn.com) and install dependencies:

```bash
# Check component page for dependencies
npm install @radix-ui/react-slot  # For Button
npm install @radix-ui/react-dialog  # For Dialog
```

### Component Dependencies

| Component | Dependencies |
|-----------|--------------|
| Button | @radix-ui/react-slot |
| Dialog | @radix-ui/react-dialog |
| Form | @hookform/resolvers, react-hook-form, zod |
| Table | @tanstack/react-table |
| Toast | sonner or @radix-ui/react-toast |

---

## Updating Components

### Check for Updates

```bash
npx shadcn diff
```

### Update Component

```bash
# Re-add component (overwrites)
npx shadcn add button --overwrite
```

### Migration Notes

- Components are in your codebase, changes are manual
- Backup before updating
- Check changelog at ui.shadcn.com

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [component-anatomy.md](component-anatomy.md)
