# Accessibility

Accessibility patterns for shadcn/ui components.

## Table of Contents

- [Built-in Accessibility](#built-in-accessibility)
- [Keyboard Navigation](#keyboard-navigation)
- [ARIA Patterns](#aria-patterns)
- [Focus Management](#focus-management)
- [Screen Reader Support](#screen-reader-support)

---

## Built-in Accessibility

### Radix Primitives

shadcn/ui is built on Radix UI primitives which provide:

- Full keyboard navigation
- Proper ARIA attributes
- Focus management
- Screen reader announcements

```tsx
// Dialog automatically handles:
// - aria-modal
// - aria-labelledby (DialogTitle)
// - aria-describedby (DialogDescription)
// - Focus trap
// - Escape key to close
<Dialog>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogTitle>Title</DialogTitle>
    <DialogDescription>Description</DialogDescription>
  </DialogContent>
</Dialog>
```

---

## Keyboard Navigation

### Expected Patterns

| Component | Keys |
|-----------|------|
| Button | Enter, Space |
| Dialog | Escape to close, Tab to navigate |
| Dropdown | Arrow keys, Enter to select |
| Tabs | Arrow keys to navigate tabs |
| Accordion | Space/Enter to toggle |
| Select | Arrow keys, Enter to select |

### Custom Keyboard Handlers

```tsx
function CustomComponent() {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
      case " ":
        e.preventDefault()
        handleAction()
        break
      case "Escape":
        handleClose()
        break
      case "ArrowDown":
        e.preventDefault()
        focusNext()
        break
      case "ArrowUp":
        e.preventDefault()
        focusPrevious()
        break
    }
  }

  return (
    <div
      role="listbox"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* items */}
    </div>
  )
}
```

### Skip Links

```tsx
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-background focus:border focus:rounded-md"
    >
      Skip to main content
    </a>
  )
}

// In layout
<body>
  <SkipLink />
  <header>...</header>
  <main id="main-content">...</main>
</body>
```

---

## ARIA Patterns

### Labels

```tsx
// Visible label
<Label htmlFor="email">Email</Label>
<Input id="email" type="email" />

// Aria-label for icon buttons
<Button aria-label="Close dialog" size="icon">
  <X className="h-4 w-4" />
</Button>

// Aria-labelledby for complex labels
<div id="price-label">Price</div>
<div id="price-hint">Enter amount in USD</div>
<Input
  aria-labelledby="price-label"
  aria-describedby="price-hint"
/>
```

### Live Regions

```tsx
// Announce changes to screen readers
function StatusMessage({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {message}
    </div>
  )
}

// For urgent announcements
<div role="alert" aria-live="assertive">
  Error: Form submission failed
</div>
```

### Loading States

```tsx
function LoadingButton({ isLoading, children }: LoadingButtonProps) {
  return (
    <Button
      disabled={isLoading}
      aria-busy={isLoading}
      aria-disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          <span>Loading...</span>
          <span className="sr-only">Please wait</span>
        </>
      ) : (
        children
      )}
    </Button>
  )
}
```

### Expanded/Collapsed

```tsx
function Collapsible({ title, children }: CollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)
  const contentId = useId()

  return (
    <div>
      <button
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <ChevronDown
          className={cn("transition-transform", isOpen && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      <div
        id={contentId}
        hidden={!isOpen}
        role="region"
      >
        {children}
      </div>
    </div>
  )
}
```

---

## Focus Management

### Focus Trap (Modals)

```tsx
// Radix handles this automatically for Dialog, AlertDialog
// For custom implementations:
import { FocusTrap } from "@radix-ui/react-focus-scope"

function Modal({ children }: ModalProps) {
  return (
    <FocusTrap asChild>
      <div role="dialog" aria-modal="true">
        {children}
      </div>
    </FocusTrap>
  )
}
```

### Focus Restoration

```tsx
function DialogWithFocusRestore() {
  const triggerRef = useRef<HTMLButtonElement>(null)

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) {
          // Return focus to trigger when closing
          triggerRef.current?.focus()
        }
      }}
    >
      <DialogTrigger ref={triggerRef} asChild>
        <Button>Open</Button>
      </DialogTrigger>
      <DialogContent>
        {/* ... */}
      </DialogContent>
    </Dialog>
  )
}
```

### Focus on Mount

```tsx
function SearchDialog() {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <Dialog onOpenChange={(open) => {
      if (open) {
        // Focus input when dialog opens
        setTimeout(() => inputRef.current?.focus(), 0)
      }
    }}>
      <DialogContent>
        <Input ref={inputRef} placeholder="Search..." />
      </DialogContent>
    </Dialog>
  )
}
```

---

## Screen Reader Support

### sr-only Class

```tsx
// Visually hidden but accessible to screen readers
<Button>
  <Heart className="h-4 w-4" aria-hidden="true" />
  <span className="sr-only">Add to favorites</span>
</Button>

// Accessible icon with text
<Button>
  <Mail className="h-4 w-4 mr-2" aria-hidden="true" />
  Send Email
</Button>
```

### Form Error Messages

```tsx
<FormField
  control={form.control}
  name="email"
  render={({ field, fieldState }) => (
    <FormItem>
      <FormLabel>Email</FormLabel>
      <FormControl>
        <Input
          {...field}
          aria-invalid={!!fieldState.error}
          aria-describedby={fieldState.error ? "email-error" : undefined}
        />
      </FormControl>
      {fieldState.error && (
        <FormMessage id="email-error" role="alert">
          {fieldState.error.message}
        </FormMessage>
      )}
    </FormItem>
  )}
/>
```

### Table Accessibility

```tsx
<Table>
  <TableCaption>
    A list of recent transactions
  </TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead scope="col">Date</TableHead>
      <TableHead scope="col">Description</TableHead>
      <TableHead scope="col" className="text-right">Amount</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {transactions.map((tx) => (
      <TableRow key={tx.id}>
        <TableCell>{tx.date}</TableCell>
        <TableCell>{tx.description}</TableCell>
        <TableCell className="text-right">{tx.amount}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [component-anatomy.md](component-anatomy.md)
