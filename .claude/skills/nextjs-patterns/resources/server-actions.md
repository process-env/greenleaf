# Server Actions

Complete guide to Server Actions in Next.js.

## Table of Contents

- [Server Actions Basics](#server-actions-basics)
- [Form Handling](#form-handling)
- [useFormState and useFormStatus](#useformstate-and-useformstatus)
- [Validation with Zod](#validation-with-zod)
- [Optimistic Updates](#optimistic-updates)
- [Error Handling](#error-handling)

---

## Server Actions Basics

### Defining Server Actions

```tsx
// app/actions.ts
"use server"

// Server Actions must be async
export async function createUser(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string

  await db.user.create({
    data: { name, email },
  })
}
```

### Inline Server Actions

```tsx
// app/page.tsx
export default function Page() {
  async function handleSubmit(formData: FormData) {
    "use server"
    const name = formData.get("name")
    // Process data...
  }

  return (
    <form action={handleSubmit}>
      <input name="name" />
      <button type="submit">Submit</button>
    </form>
  )
}
```

### Server Action with Arguments

```tsx
"use server"

export async function updateUser(userId: string, formData: FormData) {
  const name = formData.get("name") as string

  await db.user.update({
    where: { id: userId },
    data: { name },
  })
}

// Usage with bind
import { updateUser } from "@/app/actions"

export function UserForm({ userId }: { userId: string }) {
  const updateUserWithId = updateUser.bind(null, userId)

  return (
    <form action={updateUserWithId}>
      <input name="name" />
      <button>Update</button>
    </form>
  )
}
```

---

## Form Handling

### Basic Form

```tsx
// app/contact/page.tsx
import { submitContact } from "@/app/actions"

export default function ContactPage() {
  return (
    <form action={submitContact}>
      <div>
        <label htmlFor="name">Name</label>
        <input id="name" name="name" required />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
      </div>
      <div>
        <label htmlFor="message">Message</label>
        <textarea id="message" name="message" required />
      </div>
      <button type="submit">Send Message</button>
    </form>
  )
}
```

```tsx
// app/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function submitContact(formData: FormData) {
  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const message = formData.get("message") as string

  await db.contact.create({
    data: { name, email, message },
  })

  revalidatePath("/contact")
  redirect("/contact/success")
}
```

### Form with File Upload

```tsx
"use server"

import { writeFile } from "fs/promises"
import { join } from "path"

export async function uploadFile(formData: FormData) {
  const file = formData.get("file") as File

  if (!file) {
    return { error: "No file provided" }
  }

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const path = join(process.cwd(), "public/uploads", file.name)
  await writeFile(path, buffer)

  return { success: true, path: `/uploads/${file.name}` }
}
```

### Non-form Invocation

```tsx
"use client"

import { deletePost } from "@/app/actions"

export function DeleteButton({ postId }: { postId: string }) {
  async function handleDelete() {
    const confirmed = confirm("Delete this post?")
    if (confirmed) {
      await deletePost(postId)
    }
  }

  return (
    <button onClick={handleDelete} className="text-red-500">
      Delete
    </button>
  )
}
```

```tsx
"use server"

import { revalidatePath } from "next/cache"

export async function deletePost(postId: string) {
  await db.post.delete({ where: { id: postId } })
  revalidatePath("/posts")
}
```

---

## useFormState and useFormStatus

### useFormState

```tsx
"use client"

import { useFormState } from "react-dom"
import { createPost } from "@/app/actions"

const initialState = {
  message: "",
  errors: {} as Record<string, string[]>,
}

export function PostForm() {
  const [state, formAction] = useFormState(createPost, initialState)

  return (
    <form action={formAction}>
      <div>
        <label htmlFor="title">Title</label>
        <input id="title" name="title" />
        {state.errors.title && (
          <p className="text-red-500">{state.errors.title[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="content">Content</label>
        <textarea id="content" name="content" />
        {state.errors.content && (
          <p className="text-red-500">{state.errors.content[0]}</p>
        )}
      </div>

      {state.message && (
        <p className="text-green-500">{state.message}</p>
      )}

      <SubmitButton />
    </form>
  )
}
```

```tsx
"use server"

export async function createPost(prevState: any, formData: FormData) {
  const title = formData.get("title") as string
  const content = formData.get("content") as string

  const errors: Record<string, string[]> = {}

  if (!title || title.length < 3) {
    errors.title = ["Title must be at least 3 characters"]
  }

  if (!content || content.length < 10) {
    errors.content = ["Content must be at least 10 characters"]
  }

  if (Object.keys(errors).length > 0) {
    return { message: "", errors }
  }

  await db.post.create({ data: { title, content } })

  return { message: "Post created successfully!", errors: {} }
}
```

### useFormStatus

```tsx
"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

export function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </>
      ) : (
        "Submit"
      )}
    </Button>
  )
}
```

### Complete Form Pattern

```tsx
"use client"

import { useFormState, useFormStatus } from "react-dom"
import { createUser } from "@/app/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Creating..." : "Create User"}
    </Button>
  )
}

export function UserForm() {
  const [state, formAction] = useFormState(createUser, {
    success: false,
    errors: {},
  })

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" />
        {state.errors?.name && (
          <p className="text-sm text-destructive mt-1">
            {state.errors.name}
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
        {state.errors?.email && (
          <p className="text-sm text-destructive mt-1">
            {state.errors.email}
          </p>
        )}
      </div>

      <SubmitButton />

      {state.success && (
        <p className="text-sm text-green-600">User created!</p>
      )}
    </form>
  )
}
```

---

## Validation with Zod

### Schema Definition

```tsx
// lib/validations.ts
import { z } from "zod"

export const createPostSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(10, "Content must be at least 10 characters"),
  published: z.coerce.boolean().default(false),
})

export type CreatePostInput = z.infer<typeof createPostSchema>
```

### Server Action with Zod

```tsx
"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { createPostSchema } from "@/lib/validations"

type State = {
  errors?: {
    title?: string[]
    content?: string[]
    _form?: string[]
  }
  success?: boolean
}

export async function createPost(
  prevState: State,
  formData: FormData
): Promise<State> {
  const validatedFields = createPostSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    published: formData.get("published"),
  })

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    }
  }

  try {
    await db.post.create({
      data: validatedFields.data,
    })
  } catch (error) {
    return {
      errors: {
        _form: ["Failed to create post. Please try again."],
      },
    }
  }

  revalidatePath("/posts")
  return { success: true }
}
```

### Reusable Validation Helper

```tsx
// lib/action-utils.ts
import { z } from "zod"

export function createSafeAction<TInput, TOutput>(
  schema: z.Schema<TInput>,
  handler: (data: TInput) => Promise<TOutput>
) {
  return async (
    prevState: any,
    formData: FormData
  ): Promise<{ data?: TOutput; errors?: Record<string, string[]> }> => {
    const rawData = Object.fromEntries(formData)
    const result = schema.safeParse(rawData)

    if (!result.success) {
      return { errors: result.error.flatten().fieldErrors }
    }

    try {
      const data = await handler(result.data)
      return { data }
    } catch (error) {
      return { errors: { _form: ["An error occurred"] } }
    }
  }
}

// Usage
export const createPost = createSafeAction(
  createPostSchema,
  async (data) => {
    return db.post.create({ data })
  }
)
```

---

## Optimistic Updates

### useOptimistic Hook

```tsx
"use client"

import { useOptimistic } from "react"
import { toggleLike } from "@/app/actions"

interface Post {
  id: string
  likes: number
  isLiked: boolean
}

export function LikeButton({ post }: { post: Post }) {
  const [optimisticPost, addOptimistic] = useOptimistic(
    post,
    (state, newLiked: boolean) => ({
      ...state,
      isLiked: newLiked,
      likes: newLiked ? state.likes + 1 : state.likes - 1,
    })
  )

  async function handleLike() {
    addOptimistic(!optimisticPost.isLiked)
    await toggleLike(post.id)
  }

  return (
    <button onClick={handleLike} className="flex items-center gap-2">
      <span>{optimisticPost.isLiked ? "❤️" : "🤍"}</span>
      <span>{optimisticPost.likes}</span>
    </button>
  )
}
```

### Optimistic List Updates

```tsx
"use client"

import { useOptimistic } from "react"
import { addTodo } from "@/app/actions"

interface Todo {
  id: string
  text: string
  completed: boolean
}

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo: Todo) => [...state, newTodo]
  )

  async function handleAdd(formData: FormData) {
    const text = formData.get("text") as string
    const tempId = `temp-${Date.now()}`

    addOptimisticTodo({
      id: tempId,
      text,
      completed: false,
    })

    await addTodo(formData)
  }

  return (
    <div>
      <form action={handleAdd}>
        <input name="text" placeholder="Add todo..." />
        <button type="submit">Add</button>
      </form>

      <ul>
        {optimisticTodos.map((todo) => (
          <li key={todo.id} className={todo.id.startsWith("temp") ? "opacity-50" : ""}>
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

---

## Error Handling

### Try-Catch Pattern

```tsx
"use server"

import { revalidatePath } from "next/cache"

type ActionResult = {
  success: boolean
  error?: string
}

export async function deletePost(postId: string): Promise<ActionResult> {
  try {
    await db.post.delete({ where: { id: postId } })
    revalidatePath("/posts")
    return { success: true }
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message }
    }
    return { success: false, error: "An unexpected error occurred" }
  }
}
```

### Error Boundary Integration

```tsx
"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { deletePost } from "@/app/actions"

export function DeleteButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    startTransition(async () => {
      const result = await deletePost(postId)

      if (result.success) {
        toast.success("Post deleted successfully")
      } else {
        toast.error(result.error || "Failed to delete post")
      }
    })
  }

  return (
    <button onClick={handleDelete} disabled={isPending}>
      {isPending ? "Deleting..." : "Delete"}
    </button>
  )
}
```

---

**Related Files:**
- [SKILL.md](../SKILL.md)
- [data-fetching.md](data-fetching.md)
- [complete-examples.md](complete-examples.md)
