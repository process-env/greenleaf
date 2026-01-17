---
name: react-hooks
description: Comprehensive React hooks mastery and best practices. Covers state hooks (useState, useReducer, useActionState), effect hooks (useEffect, useLayoutEffect), performance hooks (useMemo, useCallback, useTransition), React 19 hooks (useActionState, useOptimistic, use), ref hooks, context hooks, and custom hook patterns. Decision trees for choosing the right hook.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  react: "19.2"
---

# React Hooks Mastery

> **Updated 2026-01-11:** React 19.2 hooks patterns. `useFormState` renamed to `useActionState` (import from `react`). Added `useOptimistic` and `use()` API patterns.

> The definitive guide to choosing the RIGHT hook for every state decision.

## Quick Decision: Which Hook Do I Need?

```
START HERE: What are you trying to do?
│
├─► Store/update data? ──────────────────► STATE HOOKS
│   ├─ Simple value (string, number, boolean) ──► useState
│   ├─ Complex object/array with many updates ──► useReducer
│   └─ Form with server action ─────────────────► useActionState
│
├─► Side effect (fetch, subscribe, DOM)? ──► EFFECT HOOKS
│   ├─ After paint (most cases) ───────────────► useEffect
│   ├─ Before paint (measure DOM) ─────────────► useLayoutEffect
│   └─ CSS-in-JS library only ─────────────────► useInsertionEffect
│
├─► Access DOM element or persist value? ──► REF HOOKS
│   ├─ Reference DOM node ─────────────────────► useRef
│   ├─ Store mutable value (no re-render) ─────► useRef
│   └─ Expose methods to parent ───────────────► useImperativeHandle
│
├─► Share data across components? ──────► CONTEXT HOOKS
│   └─ Read context value ─────────────────────► useContext
│
├─► Optimize performance? ──────────────► PERFORMANCE HOOKS
│   ├─ Cache expensive calculation ────────────► useMemo
│   ├─ Cache function reference ───────────────► useCallback
│   ├─ Defer expensive re-render ──────────────► useDeferredValue
│   └─ Mark update as non-blocking ────────────► useTransition
│
├─► React 19 / Server features? ────────► NEW HOOKS
│   ├─ Form actions with pending state ────────► useActionState
│   ├─ Optimistic UI updates ──────────────────► useOptimistic
│   ├─ Read promise/context in render ─────────► use()
│   └─ Form submission status ─────────────────► useFormStatus
│
└─► Other utilities? ───────────────────► UTILITY HOOKS
    ├─ Generate unique ID ─────────────────────► useId
    ├─ Subscribe to external store ────────────► useSyncExternalStore
    └─ Debug label in DevTools ────────────────► useDebugValue
```

---

## The RIGHT Mnemonic

Before choosing a hook, ask yourself:

| Letter | Question | Implication |
|--------|----------|-------------|
| **R** | Does it need to **Re-render**? | No → useRef. Yes → useState/useReducer |
| **I** | Is the logic **Independent** or shared? | Shared → useContext or lift state |
| **G** | Is it **Global** or local? | Global → context/external store |
| **H** | Does it have **Heavy** computation? | Yes → useMemo/useCallback |
| **T** | Is **Timing** critical? | Before paint → useLayoutEffect |

---

## State Hooks Deep Dive

### useState vs useReducer Decision Matrix

| Scenario | Winner | Why |
|----------|--------|-----|
| Single primitive value | `useState` | Simpler API |
| Toggle boolean | `useState` | `setState(prev => !prev)` |
| Counter | `useState` | `setState(prev => prev + 1)` |
| Object with 2-3 fields | `useState` | Still manageable |
| Object with 4+ related fields | `useReducer` | Centralized logic |
| Multiple state transitions | `useReducer` | Action-based clarity |
| Complex validation logic | `useReducer` | Logic in reducer |
| State depends on previous state often | `useReducer` | Explicit in action |
| Want undo/redo capability | `useReducer` | Action history pattern |
| Testing state logic separately | `useReducer` | Pure reducer function |

### useState Golden Rules

```tsx
// 1. Initialize with function for expensive computations
const [data, setData] = useState(() => expensiveInit());

// 2. Use functional updates when depending on previous state
setCount(prev => prev + 1);  // CORRECT
setCount(count + 1);          // BUG: stale closure

// 3. Replace object state entirely (no merging like class setState)
setUser(prev => ({ ...prev, name: 'New' }));

// 4. Arrays: always create new array
setItems(prev => [...prev, newItem]);     // Add
setItems(prev => prev.filter(x => x.id !== id));  // Remove
setItems(prev => prev.map(x => x.id === id ? {...x, done: true} : x));  // Update
```

### useReducer Pattern

```tsx
type State = { count: number; error: string | null };
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset'; payload: number }
  | { type: 'error'; payload: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { ...state, count: state.count + 1, error: null };
    case 'decrement':
      return { ...state, count: state.count - 1, error: null };
    case 'reset':
      return { ...state, count: action.payload, error: null };
    case 'error':
      return { ...state, error: action.payload };
    default:
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0, error: null });
dispatch({ type: 'increment' });
```

---

## Effect Hooks Decision Tree

```
Need a side effect?
│
├─► When should it run?
│   │
│   ├─► After DOM updates + paint ──► useEffect (99% of cases)
│   │   • Data fetching
│   │   • Subscriptions
│   │   • Event listeners
│   │   • Analytics
│   │   • Timers
│   │
│   ├─► Before browser paint ──────► useLayoutEffect
│   │   • DOM measurements
│   │   • Tooltip positioning
│   │   • Scroll position restoration
│   │   • Preventing visual flicker
│   │
│   └─► Before any DOM mutations ──► useInsertionEffect
│       • CSS-in-JS style injection ONLY
│       • Library authors only
│
└─► Do you need this effect at all?
    • Transforming data? → Do it during render
    • Responding to event? → Put in event handler
    • Syncing with props/state? → Maybe not an effect
```

### useEffect Best Practices

```tsx
// 1. ALWAYS specify dependencies
useEffect(() => {
  fetchData(userId);
}, [userId]);  // Re-run when userId changes

// 2. ALWAYS clean up subscriptions
useEffect(() => {
  const subscription = subscribe(id);
  return () => subscription.unsubscribe();  // Cleanup
}, [id]);

// 3. Handle race conditions in fetch
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const result = await api.get(id);
    if (!cancelled) {
      setData(result);
    }
  }

  fetchData();
  return () => { cancelled = true; };
}, [id]);

// 4. Empty deps = mount only (use sparingly)
useEffect(() => {
  initializeAnalytics();
}, []);
```

### When NOT to Use useEffect

```tsx
// BAD: Transforming data in effect
useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// GOOD: Calculate during render
const filteredItems = items.filter(i => i.active);

// BAD: Resetting state on prop change
useEffect(() => {
  setComment('');
}, [userId]);

// GOOD: Use key to reset component
<Profile userId={userId} key={userId} />

// BAD: Event response in effect
useEffect(() => {
  if (submitted) {
    post('/api/submit', data);
  }
}, [submitted, data]);

// GOOD: Handle in event handler
function handleSubmit() {
  post('/api/submit', data);
}
```

---

## Performance Hooks Strategy

### When to Use useMemo

```tsx
// USE: Expensive calculations
const sortedItems = useMemo(
  () => items.sort((a, b) => a.date - b.date),
  [items]
);

// USE: Referential equality for child props
const chartData = useMemo(
  () => ({ labels, values }),
  [labels, values]
);

// DON'T USE: Simple operations
const doubled = count * 2;  // Just calculate it

// DON'T USE: Primitive values
const isActive = status === 'active';  // No memo needed
```

### When to Use useCallback

```tsx
// USE: Passing callback to memoized child
const MemoizedChild = memo(({ onClick }) => <button onClick={onClick} />);

const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

<MemoizedChild onClick={handleClick} />

// USE: Callback in effect dependencies
const fetchData = useCallback(async () => {
  const result = await api.get(url);
  setData(result);
}, [url]);

useEffect(() => {
  fetchData();
}, [fetchData]);

// DON'T USE: No downstream optimization
// If child isn't memoized, useCallback is pointless
```

### The Performance Optimization Rule

> "Profile first, optimize second."

1. Don't optimize prematurely
2. Use React DevTools Profiler to find slow components
3. Apply `memo()` to expensive child components
4. Then add `useMemo`/`useCallback` to stabilize their props

---

## React 19 Hooks

### useActionState (Replaces useFormState)

```tsx
import { useActionState } from 'react';

async function submitForm(prevState: State, formData: FormData) {
  const name = formData.get('name');
  // Server action logic
  return { success: true, message: 'Saved!' };
}

function Form() {
  const [state, formAction, isPending] = useActionState(submitForm, {
    success: false,
    message: ''
  });

  return (
    <form action={formAction}>
      <input name="name" />
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Save'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  );
}
```

### useOptimistic

```tsx
import { useOptimistic } from 'react';

function TodoList({ todos, addTodo }) {
  const [optimisticTodos, addOptimisticTodo] = useOptimistic(
    todos,
    (state, newTodo) => [...state, { ...newTodo, pending: true }]
  );

  async function handleAdd(formData: FormData) {
    const newTodo = { text: formData.get('text'), id: Date.now() };
    addOptimisticTodo(newTodo);  // Instant UI update
    await addTodo(newTodo);       // Actual server call
  }

  return (
    <form action={handleAdd}>
      {optimisticTodos.map(todo => (
        <li key={todo.id} style={{ opacity: todo.pending ? 0.5 : 1 }}>
          {todo.text}
        </li>
      ))}
    </form>
  );
}
```

### use() - The Promise/Context Reader

```tsx
import { use, Suspense } from 'react';

// Reading a promise
function UserProfile({ userPromise }) {
  const user = use(userPromise);  // Suspends until resolved
  return <h1>{user.name}</h1>;
}

// With Suspense
<Suspense fallback={<Spinner />}>
  <UserProfile userPromise={fetchUser(id)} />
</Suspense>

// Reading context (can be conditional!)
function Theme({ showTheme }) {
  if (showTheme) {
    const theme = use(ThemeContext);  // Works in conditions!
    return <div style={{ color: theme.primary }} />;
  }
  return null;
}
```

### useFormStatus

```tsx
import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();

  return (
    <button disabled={pending}>
      {pending ? 'Submitting...' : 'Submit'}
    </button>
  );
}

// Must be used inside a <form>
function Form() {
  return (
    <form action={serverAction}>
      <input name="email" />
      <SubmitButton />  {/* Has access to form status */}
    </form>
  );
}
```

---

## useTransition vs useDeferredValue

| Aspect | useTransition | useDeferredValue |
|--------|---------------|------------------|
| What it wraps | State update function | Value |
| Control | You control when to transition | React decides deferral |
| Use case | User-initiated actions | Derived/passed values |
| Access | `isPending` flag available | Compare old vs new |
| Best for | Tab switches, navigation | Search results, filtering |

```tsx
// useTransition: Control the state update
function Tabs() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab);
    });
  }

  return (
    <>
      <TabButton onClick={() => selectTab('about')} />
      {isPending && <Spinner />}
      <TabContent tab={tab} />
    </>
  );
}

// useDeferredValue: Defer a value
function Search({ query }) {
  const deferredQuery = useDeferredValue(query);
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <SearchResults query={deferredQuery} />
    </div>
  );
}
```

---

## Custom Hooks Best Practices

### Naming Convention
- Always start with `use` + capital letter
- Name describes WHAT it does, not HOW
- Good: `useOnlineStatus`, `useWindowSize`, `useLocalStorage`
- Bad: `useEffectOnMount`, `useStateWithCallback`

### Extraction Rules

```tsx
// EXTRACT when:
// 1. Logic is used in 2+ components
// 2. Logic involves Effect + external system
// 3. Logic is complex enough to benefit from isolation

// DON'T extract:
// 1. Simple one-liners
// 2. Component-specific logic
// 3. Just to "organize" (keep logic visible in component)
```

### Custom Hook Template

```tsx
function useCustomHook<T>(param: P): ReturnType {
  // 1. State declarations
  const [state, setState] = useState<T>(initialValue);

  // 2. Refs if needed
  const ref = useRef<SomeType>(null);

  // 3. Derived values (no hooks needed)
  const derived = computeFromState(state);

  // 4. Callbacks
  const handler = useCallback(() => {
    // logic
  }, [dependencies]);

  // 5. Effects
  useEffect(() => {
    // side effect
    return () => { /* cleanup */ };
  }, [dependencies]);

  // 6. Return value
  return { state, derived, handler };
  // Or return [value, setter] for useState-like API
}
```

---

## Common Patterns

### Data Fetching Hook

```tsx
function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          setData(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [url]);

  return { data, error, loading };
}
```

### Local Storage Hook

```tsx
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue] as const;
}
```

### Media Query Hook

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    window.matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
```

---

## Gotchas & Real-World Warnings

### Hooks Order Matters

**Hooks must be called in the same order every render:**

```tsx
// DANGER: Conditional hook call
function Component({ isLoggedIn }) {
    if (isLoggedIn) {
        const [user, setUser] = useState(null);  // Sometimes 1st hook, sometimes doesn't exist
    }
    const [count, setCount] = useState(0);  // Sometimes 1st, sometimes 2nd
    // React loses track of which state is which!
}

// CORRECT: Always call all hooks, conditionally use the values
function Component({ isLoggedIn }) {
    const [user, setUser] = useState(null);
    const [count, setCount] = useState(0);

    // Conditional logic happens AFTER hooks
    if (!isLoggedIn) return <LoginPrompt />;
    return <Dashboard user={user} />;
}
```

### StrictMode Runs Effects Twice

**In development, React 18+ intentionally double-invokes effects:**

```tsx
// In development with StrictMode:
// mount → unmount → mount (twice!)

useEffect(() => {
    console.log('mounted');  // Logs twice!
    connectToWebSocket();    // Two connections!
    return () => console.log('unmounted');
}, []);

// This is INTENTIONAL - it exposes bugs where cleanup is missing
// Your code should work correctly with this double-invoke

// SOLUTION: Ensure cleanup properly handles re-initialization
useEffect(() => {
    const socket = connectToWebSocket();
    return () => socket.close();  // Cleanup prevents duplicate connections
}, []);
```

### useCallback Doesn't Memoize Results

**useCallback memoizes the function, not what it returns:**

```tsx
// WRONG MENTAL MODEL: "This caches the API result"
const fetchData = useCallback(async () => {
    return await api.get('/data');  // Still fetches every time called!
}, []);

// useCallback only ensures fetchData is the same function reference
// It does NOT prevent the function from being called multiple times

// For caching results, use useMemo or a data fetching library
const data = useMemo(() => computeExpensiveValue(input), [input]);
```

### useEffect Cleanup Timing

**Cleanup runs BEFORE the new effect, not after unmount:**

```tsx
useEffect(() => {
    console.log('effect runs with id:', id);
    return () => console.log('cleanup for id:', id);
}, [id]);

// When id changes from 1 to 2:
// 1. "cleanup for id: 1" (old cleanup runs first)
// 2. "effect runs with id: 2" (new effect runs)

// This matters for subscriptions!
useEffect(() => {
    subscribe(id);  // Subscribe to id=2
    return () => unsubscribe(id);  // ⚠️ This unsubscribes id=2, not id=1!
}, [id]);

// FIX: Capture the value
useEffect(() => {
    const currentId = id;
    subscribe(currentId);
    return () => unsubscribe(currentId);  // Correctly unsubscribes old id
}, [id]);
```

### useMemo Doesn't Guarantee Preservation

**React may drop memoized values to free memory:**

```tsx
// React's docs: "You may rely on useMemo as a performance optimization,
// not as a semantic guarantee."

const expensiveValue = useMemo(() => compute(input), [input]);
// React MIGHT recalculate this even if input hasn't changed
// (e.g., during memory pressure)

// Don't use useMemo for values that MUST be referentially stable
// For that, use useRef
```

### useRef Updates Don't Trigger Re-renders

**Changing ref.current is silent:**

```tsx
// DANGER: UI won't update
const countRef = useRef(0);
function increment() {
    countRef.current += 1;  // Value changes but no re-render!
}
return <div>{countRef.current}</div>;  // Always shows 0

// useRef is for:
// 1. DOM references
// 2. Values that DON'T need to trigger re-renders (timers, subscriptions)
// 3. "Instance variables" that persist across renders

// For values that should update UI, use useState
```

### What These Patterns Don't Tell You

1. **Server Components can't use hooks** - Hooks are client-only; Server Components have different patterns
2. **Custom hook testing** - Test hooks with `@testing-library/react-hooks` or `renderHook`
3. **Hook debugging** - React DevTools shows hook values; name custom hooks for clarity
4. **Concurrent features** - `useTransition` and `useDeferredValue` require React 18+ concurrent mode
5. **Rules of Hooks ESLint plugin** - Install `eslint-plugin-react-hooks` to catch hook errors
6. **Dependency array exhaustiveness** - The ESLint rule catches most issues but not all

---

## Anti-Patterns to Avoid

### 1. Effect Chains

```tsx
// BAD: Cascading effects
useEffect(() => { setA(computeA()); }, []);
useEffect(() => { setB(computeB(a)); }, [a]);
useEffect(() => { setC(computeC(b)); }, [b]);

// GOOD: Compute during render or use reducer
const a = computeA();
const b = computeB(a);
const c = computeC(b);
```

### 2. Object/Array in Dependencies

```tsx
// BAD: New object every render
useEffect(() => {
  fetchData(options);
}, [{ page, limit }]);  // Always triggers!

// GOOD: Use primitives or useMemo
useEffect(() => {
  fetchData({ page, limit });
}, [page, limit]);
```

### 3. Missing Cleanup

```tsx
// BAD: Memory leak
useEffect(() => {
  window.addEventListener('resize', handler);
}, []);

// GOOD: Always clean up
useEffect(() => {
  window.addEventListener('resize', handler);
  return () => window.removeEventListener('resize', handler);
}, []);
```

### 4. Stale Closures

```tsx
// BAD: Stale count
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);  // Always uses initial count
  }, 1000);
  return () => clearInterval(id);
}, []);

// GOOD: Functional update
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);  // Always uses latest
  }, 1000);
  return () => clearInterval(id);
}, []);
```

---

## Resources

- [state-hooks.md](resources/state-hooks.md) - Deep dive on useState/useReducer
- [effect-hooks.md](resources/effect-hooks.md) - Complete effect hook guide
- [performance-hooks.md](resources/performance-hooks.md) - Optimization strategies
- [react19-hooks.md](resources/react19-hooks.md) - New hooks in React 19
- [custom-hooks.md](resources/custom-hooks.md) - Patterns and examples
