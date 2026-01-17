# React 19 Hooks: useActionState, useOptimistic, use() & useFormStatus

## Table of Contents

1. [useActionState Reference](#useactionstate-reference)
2. [useOptimistic Reference](#useoptimistic-reference)
3. [use() Reference](#use-reference)
4. [useFormStatus Reference](#useformstatus-reference)
5. [Form Action Patterns](#form-action-patterns)
6. [Migration Guide](#migration-guide)

---

## useActionState Reference

> Replaces `useFormState` from React 18. Handles form actions with automatic pending state.

### Signature

```tsx
const [state, formAction, isPending] = useActionState(action, initialState, permalink?);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `action` | `(prevState: S, formData: FormData) => S \| Promise<S>` | Action function |
| `initialState` | `S` | Initial state before any action |
| `permalink` | `string?` | Optional URL for progressive enhancement |

### Returns

| Value | Type | Description |
|-------|------|-------------|
| `state` | `S` | Current state (updated after action completes) |
| `formAction` | `(formData: FormData) => void` | Action to pass to form |
| `isPending` | `boolean` | Whether action is in progress |

### Basic Example

```tsx
import { useActionState } from 'react';

interface FormState {
  message: string;
  errors: Record<string, string>;
}

async function submitForm(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const name = formData.get('name') as string;

  if (!name) {
    return { message: '', errors: { name: 'Name is required' } };
  }

  await saveToServer({ name });
  return { message: 'Saved successfully!', errors: {} };
}

function Form() {
  const [state, formAction, isPending] = useActionState(submitForm, {
    message: '',
    errors: {}
  });

  return (
    <form action={formAction}>
      <input name="name" />
      {state.errors.name && <span className="error">{state.errors.name}</span>}

      <button type="submit" disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>

      {state.message && <p className="success">{state.message}</p>}
    </form>
  );
}
```

### With Server Actions (Next.js)

```tsx
// app/actions.ts
'use server';

export async function createUser(prevState: State, formData: FormData) {
  const email = formData.get('email');

  try {
    await db.user.create({ data: { email } });
    return { success: true, message: 'User created!' };
  } catch (error) {
    return { success: false, message: 'Failed to create user' };
  }
}

// app/page.tsx
'use client';

import { useActionState } from 'react';
import { createUser } from './actions';

export default function Page() {
  const [state, action, pending] = useActionState(createUser, {
    success: false,
    message: ''
  });

  return (
    <form action={action}>
      <input name="email" type="email" />
      <button disabled={pending}>Create User</button>
      {state.message}
    </form>
  );
}
```

### Key Features

1. **Automatic request ordering**: Later submissions cancel earlier ones
2. **Progressive enhancement**: Works without JavaScript when `permalink` provided
3. **Integrated pending state**: No need for separate loading state

---

## useOptimistic Reference

> Shows optimistic UI updates while async action is in progress.

### Signature

```tsx
const [optimisticState, addOptimistic] = useOptimistic(state, updateFn);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `state` | `T` | Current actual state |
| `updateFn` | `(currentState: T, optimisticValue: V) => T` | How to compute optimistic state |

### Returns

| Value | Type | Description |
|-------|------|-------------|
| `optimisticState` | `T` | Optimistic state (or actual if no pending action) |
| `addOptimistic` | `(optimisticValue: V) => void` | Trigger optimistic update |

### Basic Example

```tsx
import { useOptimistic } from 'react';

interface Message {
  id: string;
  text: string;
  sending?: boolean;
}

function Chat({ messages, sendMessage }: {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
}) {
  const [optimisticMessages, addOptimisticMessage] = useOptimistic(
    messages,
    (state, newMessage: Message) => [...state, { ...newMessage, sending: true }]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string;
    const optimisticId = crypto.randomUUID();

    // Show immediately
    addOptimisticMessage({ id: optimisticId, text });

    // Actually send
    await sendMessage(text);
    // When complete, parent updates `messages`, optimistic state clears
  }

  return (
    <>
      {optimisticMessages.map(msg => (
        <div key={msg.id} style={{ opacity: msg.sending ? 0.5 : 1 }}>
          {msg.text}
          {msg.sending && <span> (sending...)</span>}
        </div>
      ))}

      <form action={handleSubmit}>
        <input name="text" />
        <button>Send</button>
      </form>
    </>
  );
}
```

### Like Button Pattern

```tsx
function LikeButton({ postId, initialLiked, initialCount }) {
  const [{ liked, count }, setActual] = useState({
    liked: initialLiked,
    count: initialCount
  });

  const [optimistic, addOptimistic] = useOptimistic(
    { liked, count },
    (state, newLiked: boolean) => ({
      liked: newLiked,
      count: state.count + (newLiked ? 1 : -1)
    })
  );

  async function handleClick() {
    const newLiked = !optimistic.liked;
    addOptimistic(newLiked);

    try {
      const result = await toggleLike(postId, newLiked);
      setActual(result);
    } catch {
      // Optimistic state automatically reverts on error
    }
  }

  return (
    <button onClick={handleClick}>
      {optimistic.liked ? '❤️' : '🤍'} {optimistic.count}
    </button>
  );
}
```

### Key Behaviors

1. **Automatic revert**: If action throws, optimistic state reverts
2. **Multiple pending**: Can have multiple optimistic updates in flight
3. **Integrates with actions**: Works great with `useActionState` and form actions

---

## use() Reference

> Reads promises or context during render. The only hook that can be called conditionally.

### Reading Promises

```tsx
import { use, Suspense } from 'react';

// Create promise outside component (or memoized)
const userPromise = fetchUser(userId);

function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  // Suspends until promise resolves
  const user = use(userPromise);

  return <h1>{user.name}</h1>;
}

// Must wrap in Suspense
function App() {
  return (
    <Suspense fallback={<Loading />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Reading Context (Conditionally!)

```tsx
function ThemeButton({ showTheme }: { showTheme: boolean }) {
  // Can be called conditionally - unlike useContext!
  if (showTheme) {
    const theme = use(ThemeContext);
    return <button style={{ background: theme.primary }}>Themed</button>;
  }

  return <button>Default</button>;
}
```

### Caching Promise Pattern

```tsx
// Cache promises to avoid re-fetching
const cache = new Map<string, Promise<Data>>();

function getData(id: string) {
  if (!cache.has(id)) {
    cache.set(id, fetchData(id));
  }
  return cache.get(id)!;
}

function DataDisplay({ id }: { id: string }) {
  const data = use(getData(id));
  return <div>{data.content}</div>;
}
```

### Error Handling

```tsx
import { use, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

function DataLoader({ dataPromise }) {
  const data = use(dataPromise);  // Throws on rejection
  return <Display data={data} />;
}

function App() {
  return (
    <ErrorBoundary fallback={<Error />}>
      <Suspense fallback={<Loading />}>
        <DataLoader dataPromise={fetchData()} />
      </Suspense>
    </ErrorBoundary>
  );
}
```

### Key Behaviors

1. **Suspends**: Component suspends until promise resolves
2. **Conditional**: Can be called in conditionals (unlike other hooks)
3. **In loops**: Can be called in loops
4. **Context shortcut**: Shorter than `useContext`
5. **Server Components**: Works seamlessly with RSC

---

## useFormStatus Reference

> Access form submission status from child components. Must be rendered inside a `<form>`.

### Signature

```tsx
const { pending, data, method, action } = useFormStatus();
```

### Returns

| Property | Type | Description |
|----------|------|-------------|
| `pending` | `boolean` | Whether form is submitting |
| `data` | `FormData \| null` | Form data being submitted |
| `method` | `string` | HTTP method (get/post) |
| `action` | `string \| function` | Form action |

### Submit Button Component

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Submitting...' : children}
    </button>
  );
}

// Usage
function Form() {
  return (
    <form action={submitAction}>
      <input name="email" />
      <SubmitButton>Subscribe</SubmitButton>
    </form>
  );
}
```

### Form-Wide Loading State

```tsx
function FormContent() {
  const { pending } = useFormStatus();

  return (
    <fieldset disabled={pending}>
      <input name="name" placeholder="Name" />
      <input name="email" placeholder="Email" />
      <button type="submit">Submit</button>
      {pending && <p>Submitting...</p>}
    </fieldset>
  );
}

function Form() {
  return (
    <form action={submitAction}>
      <FormContent />
    </form>
  );
}
```

### Important Constraints

```tsx
// BAD: useFormStatus not inside a form
function BadComponent() {
  const { pending } = useFormStatus();  // Always returns pending: false
  return <form>...</form>;
}

// GOOD: Create child component inside form
function Form() {
  return (
    <form action={action}>
      <FormContent />  {/* useFormStatus works here */}
    </form>
  );
}
```

---

## Form Action Patterns

### Complete Form with All React 19 Hooks

```tsx
'use client';

import { useActionState, useOptimistic } from 'react';
import { useFormStatus } from 'react-dom';

interface Todo {
  id: string;
  text: string;
  done: boolean;
}

interface State {
  todos: Todo[];
  error: string | null;
}

async function addTodo(state: State, formData: FormData): Promise<State> {
  const text = formData.get('text') as string;

  if (!text.trim()) {
    return { ...state, error: 'Text is required' };
  }

  try {
    const newTodo = await createTodoOnServer(text);
    return { todos: [...state.todos, newTodo], error: null };
  } catch {
    return { ...state, error: 'Failed to add todo' };
  }
}

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? 'Adding...' : 'Add'}
    </button>
  );
}

function TodoApp({ initialTodos }: { initialTodos: Todo[] }) {
  const [state, formAction, isPending] = useActionState(addTodo, {
    todos: initialTodos,
    error: null
  });

  const [optimisticTodos, addOptimistic] = useOptimistic(
    state.todos,
    (todos, newText: string) => [
      ...todos,
      { id: 'temp-' + Date.now(), text: newText, done: false }
    ]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string;
    addOptimistic(text);
    await formAction(formData);
  }

  return (
    <div>
      <form action={handleSubmit}>
        <input name="text" placeholder="New todo" />
        <AddButton />
      </form>

      {state.error && <p className="error">{state.error}</p>}

      <ul>
        {optimisticTodos.map(todo => (
          <li
            key={todo.id}
            style={{ opacity: todo.id.startsWith('temp-') ? 0.5 : 1 }}
          >
            {todo.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Migration Guide

### From useFormState to useActionState

```tsx
// React 18 (deprecated)
import { useFormState } from 'react-dom';
const [state, formAction] = useFormState(action, initialState);

// React 19
import { useActionState } from 'react';
const [state, formAction, isPending] = useActionState(action, initialState);
```

### From useState + useEffect to use()

```tsx
// Before: useState + useEffect
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchUser(userId).then(setUser).finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  return <Profile user={user} />;
}

// After: use() with Suspense
function UserProfile({ userPromise }) {
  const user = use(userPromise);
  return <Profile user={user} />;
}

// Parent
<Suspense fallback={<Spinner />}>
  <UserProfile userPromise={fetchUser(userId)} />
</Suspense>
```

### From Manual Optimistic to useOptimistic

```tsx
// Before: Manual optimistic state
function LikeButton({ initialLiked }) {
  const [liked, setLiked] = useState(initialLiked);
  const [optimisticLiked, setOptimisticLiked] = useState(initialLiked);

  async function handleClick() {
    setOptimisticLiked(!optimisticLiked);
    try {
      const result = await toggleLike();
      setLiked(result);
      setOptimisticLiked(result);
    } catch {
      setOptimisticLiked(liked);  // Revert
    }
  }
}

// After: useOptimistic
function LikeButton({ liked }) {
  const [optimisticLiked, setOptimisticLiked] = useOptimistic(
    liked,
    (_, newValue) => newValue
  );

  async function handleClick() {
    setOptimisticLiked(!optimisticLiked);
    await toggleLike();  // Auto-reverts on error
  }
}
```

---

## Best Practices

### 1. Prefer Server Actions

```tsx
// In Next.js, keep actions on server
'use server';
export async function submitForm(formData: FormData) {
  // Direct database access, no API layer
}
```

### 2. Validate on Server

```tsx
async function createUser(state: State, formData: FormData) {
  // Always validate server-side (client validation is UX, not security)
  const result = schema.safeParse(Object.fromEntries(formData));
  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }
}
```

### 3. Handle Loading States

```tsx
// Show loading in the button that triggered action
<SubmitButton />

// Or disable entire form
<fieldset disabled={isPending}>
```

### 4. Provide Optimistic Feedback

```tsx
// Users see immediate response
addOptimistic(newItem);

// Reality catches up
await serverAction();
```
