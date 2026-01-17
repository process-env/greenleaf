# Navigation Components

Guide to Tabs, Accordion, Sidebar, Breadcrumb, and NavigationMenu.

## Table of Contents

- [Tabs](#tabs)
- [Accordion](#accordion)
- [Breadcrumb](#breadcrumb)
- [NavigationMenu](#navigationmenu)
- [Sidebar](#sidebar)

---

## Tabs

### Basic Usage

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

<Tabs defaultValue="account" className="w-[400px]">
  <TabsList>
    <TabsTrigger value="account">Account</TabsTrigger>
    <TabsTrigger value="password">Password</TabsTrigger>
  </TabsList>
  <TabsContent value="account">
    <Card>
      <CardHeader>
        <CardTitle>Account</CardTitle>
      </CardHeader>
      <CardContent>Account settings here.</CardContent>
    </Card>
  </TabsContent>
  <TabsContent value="password">
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
      </CardHeader>
      <CardContent>Change password here.</CardContent>
    </Card>
  </TabsContent>
</Tabs>
```

### Controlled Tabs

```tsx
function ControlledTabs() {
  const [activeTab, setActiveTab] = React.useState("tab1")

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList>
        <TabsTrigger value="tab1">Tab 1</TabsTrigger>
        <TabsTrigger value="tab2">Tab 2</TabsTrigger>
      </TabsList>
      <TabsContent value="tab1">Content 1</TabsContent>
      <TabsContent value="tab2">Content 2</TabsContent>
    </Tabs>
  )
}
```

### URL-Synced Tabs

```tsx
"use client"

import { useSearchParams, useRouter } from "next/navigation"

function URLTabs() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get("tab") ?? "account"

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => {
        const params = new URLSearchParams(searchParams)
        params.set("tab", value)
        router.push(`?${params.toString()}`)
      }}
    >
      {/* ... */}
    </Tabs>
  )
}
```

---

## Accordion

### Basic Usage

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

<Accordion type="single" collapsible className="w-full">
  <AccordionItem value="item-1">
    <AccordionTrigger>Is it accessible?</AccordionTrigger>
    <AccordionContent>
      Yes. It adheres to the WAI-ARIA design pattern.
    </AccordionContent>
  </AccordionItem>
  <AccordionItem value="item-2">
    <AccordionTrigger>Is it styled?</AccordionTrigger>
    <AccordionContent>
      Yes. It comes with default styles that matches the other components.
    </AccordionContent>
  </AccordionItem>
</Accordion>
```

### Multiple Open

```tsx
<Accordion type="multiple" defaultValue={["item-1"]}>
  {/* items */}
</Accordion>
```

### FAQ Component

```tsx
const faqs = [
  { question: "What is shadcn/ui?", answer: "A collection of components..." },
  { question: "Is it free?", answer: "Yes, it's free and open source." },
]

function FAQ() {
  return (
    <Accordion type="single" collapsible>
      {faqs.map((faq, index) => (
        <AccordionItem key={index} value={`item-${index}`}>
          <AccordionTrigger>{faq.question}</AccordionTrigger>
          <AccordionContent>{faq.answer}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
```

---

## Breadcrumb

### Basic Usage

```tsx
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/products">Products</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

### With Dropdown

```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

<BreadcrumbItem>
  <DropdownMenu>
    <DropdownMenuTrigger className="flex items-center gap-1">
      Components
      <ChevronDown className="h-4 w-4" />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start">
      <DropdownMenuItem>Button</DropdownMenuItem>
      <DropdownMenuItem>Card</DropdownMenuItem>
      <DropdownMenuItem>Input</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</BreadcrumbItem>
```

---

## NavigationMenu

### Desktop Navigation

```tsx
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"

<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Getting Started</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid gap-3 p-6 md:w-[400px] lg:w-[500px]">
          <li>
            <NavigationMenuLink asChild>
              <a href="/docs">
                <div className="text-sm font-medium">Introduction</div>
                <p className="text-sm text-muted-foreground">
                  Learn the basics of shadcn/ui
                </p>
              </a>
            </NavigationMenuLink>
          </li>
        </ul>
      </NavigationMenuContent>
    </NavigationMenuItem>

    <NavigationMenuItem>
      <NavigationMenuLink href="/docs" className={navigationMenuTriggerStyle()}>
        Documentation
      </NavigationMenuLink>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>
```

---

## Sidebar

### Collapsible Sidebar

```tsx
"use client"

import { useState } from "react"
import { ChevronLeft, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SidebarProps {
  children: React.ReactNode
}

export function Sidebar({ children }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        "h-screen border-r bg-background transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b px-4">
        {!collapsed && <span className="font-semibold">App Name</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu /> : <ChevronLeft />}
        </Button>
      </div>
      <nav className="p-2">{children}</nav>
    </aside>
  )
}

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  href: string
  collapsed?: boolean
}

export function SidebarItem({ icon, label, href, collapsed }: SidebarItemProps) {
  return (
    <a
      href={href}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center"
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </a>
  )
}
```

### With Groups

```tsx
interface SidebarGroupProps {
  title: string
  children: React.ReactNode
  collapsed?: boolean
}

export function SidebarGroup({ title, children, collapsed }: SidebarGroupProps) {
  return (
    <div className="py-2">
      {!collapsed && (
        <h4 className="mb-1 px-3 text-xs font-semibold text-muted-foreground uppercase">
          {title}
        </h4>
      )}
      <div className="space-y-1">{children}</div>
    </div>
  )
}

// Usage
<Sidebar>
  <SidebarGroup title="Overview">
    <SidebarItem icon={<Home />} label="Dashboard" href="/" />
    <SidebarItem icon={<BarChart />} label="Analytics" href="/analytics" />
  </SidebarGroup>
  <SidebarGroup title="Settings">
    <SidebarItem icon={<Settings />} label="General" href="/settings" />
    <SidebarItem icon={<User />} label="Profile" href="/profile" />
  </SidebarGroup>
</Sidebar>
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [complete-examples.md](complete-examples.md)
