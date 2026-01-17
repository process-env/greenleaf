# Form Patterns

Complete guide to building forms with shadcn/ui, react-hook-form, and zod.

## Table of Contents

- [Setup](#setup)
- [Basic Form](#basic-form)
- [Form Components](#form-components)
- [Validation Patterns](#validation-patterns)
- [Advanced Forms](#advanced-forms)

---

## Setup

### Install Dependencies

```bash
npx shadcn add form input label
npm install @hookform/resolvers zod
```

### Required Imports

```tsx
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
```

---

## Basic Form

### Complete Example

```tsx
const formSchema = z.object({
  username: z.string().min(2, "Username must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
})

type FormValues = z.infer<typeof formSchema>

export function ProfileForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      email: "",
    },
  })

  async function onSubmit(values: FormValues) {
    console.log(values)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="johndoe" {...field} />
              </FormControl>
              <FormDescription>
                Your public display name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="john@example.com" {...field} />
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

---

## Form Components

### Select

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<FormField
  control={form.control}
  name="role"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Role</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="admin">Admin</SelectItem>
          <SelectItem value="user">User</SelectItem>
          <SelectItem value="guest">Guest</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

### Checkbox

```tsx
import { Checkbox } from "@/components/ui/checkbox"

<FormField
  control={form.control}
  name="terms"
  render={({ field }) => (
    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
      <FormControl>
        <Checkbox
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
      <div className="space-y-1 leading-none">
        <FormLabel>Accept terms and conditions</FormLabel>
        <FormDescription>
          You agree to our Terms of Service and Privacy Policy.
        </FormDescription>
      </div>
    </FormItem>
  )}
/>
```

### Switch

```tsx
import { Switch } from "@/components/ui/switch"

<FormField
  control={form.control}
  name="notifications"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <FormLabel className="text-base">Email Notifications</FormLabel>
        <FormDescription>
          Receive emails about your account activity.
        </FormDescription>
      </div>
      <FormControl>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
        />
      </FormControl>
    </FormItem>
  )}
/>
```

### Textarea

```tsx
import { Textarea } from "@/components/ui/textarea"

<FormField
  control={form.control}
  name="bio"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Bio</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Tell us about yourself"
          className="resize-none"
          {...field}
        />
      </FormControl>
      <FormDescription>
        Max 160 characters.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

### RadioGroup

```tsx
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

<FormField
  control={form.control}
  name="type"
  render={({ field }) => (
    <FormItem className="space-y-3">
      <FormLabel>Notification Type</FormLabel>
      <FormControl>
        <RadioGroup
          onValueChange={field.onChange}
          defaultValue={field.value}
          className="flex flex-col space-y-1"
        >
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="all" />
            </FormControl>
            <FormLabel className="font-normal">All notifications</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="mentions" />
            </FormControl>
            <FormLabel className="font-normal">Mentions only</FormLabel>
          </FormItem>
          <FormItem className="flex items-center space-x-3 space-y-0">
            <FormControl>
              <RadioGroupItem value="none" />
            </FormControl>
            <FormLabel className="font-normal">None</FormLabel>
          </FormItem>
        </RadioGroup>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

---

## Validation Patterns

### Common Schemas

```tsx
const schemas = {
  // Required string
  required: z.string().min(1, "This field is required"),

  // Email
  email: z.string().email("Invalid email address"),

  // Password
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),

  // Phone
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number"),

  // URL
  url: z.string().url("Invalid URL"),

  // Number
  age: z.coerce.number().min(18).max(120),

  // Date
  date: z.coerce.date(),

  // Optional
  optional: z.string().optional(),

  // Nullable
  nullable: z.string().nullable(),
}
```

### Confirm Password

```tsx
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})
```

### Conditional Validation

```tsx
const schema = z.object({
  accountType: z.enum(["personal", "business"]),
  companyName: z.string().optional(),
}).refine((data) => {
  if (data.accountType === "business" && !data.companyName) {
    return false
  }
  return true
}, {
  message: "Company name is required for business accounts",
  path: ["companyName"],
})
```

---

## Advanced Forms

### Loading State

```tsx
export function ContactForm() {
  const form = useForm<FormValues>({...})
  const [isLoading, setIsLoading] = React.useState(false)

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    try {
      await submitForm(values)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* fields */}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Submitting..." : "Submit"}
        </Button>
      </form>
    </Form>
  )
}
```

### Server Actions (Next.js)

```tsx
"use client"

import { useFormState, useFormStatus } from "react-dom"
import { createUser } from "./actions"

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Creating..." : "Create User"}
    </Button>
  )
}

export function CreateUserForm() {
  const [state, formAction] = useFormState(createUser, { message: "" })

  return (
    <form action={formAction}>
      <Input name="email" type="email" required />
      <SubmitButton />
      {state.message && <p>{state.message}</p>}
    </form>
  )
}
```

### Multi-Step Form

```tsx
const steps = ["Personal Info", "Address", "Review"]

export function MultiStepForm() {
  const [step, setStep] = React.useState(0)
  const form = useForm<FormValues>({...})

  const next = () => setStep((s) => Math.min(s + 1, steps.length - 1))
  const prev = () => setStep((s) => Math.max(s - 1, 0))

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {step === 0 && <PersonalInfoStep form={form} />}
        {step === 1 && <AddressStep form={form} />}
        {step === 2 && <ReviewStep form={form} />}

        <div className="flex gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={prev}>
              Previous
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button type="button" onClick={next}>Next</Button>
          ) : (
            <Button type="submit">Submit</Button>
          )}
        </div>
      </form>
    </Form>
  )
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [component-anatomy.md](component-anatomy.md)
