---
name: zustand-state
description: Zustand state management for React applications. Covers store creation, selectors, actions, middleware (persist, devtools, immer, subscribeWithSelector), slices pattern, TypeScript patterns, TanStack Query integration, and performance optimization.
version: "2.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  zustand: "5.x"
---

# Zustand State Management

> **Updated 2026-01-11:** Zustand v5.x patterns. Added Zustand + TanStack Query integration pattern.

## Purpose

Comprehensive guide for implementing state management in React using Zustand. Covers store creation, selectors, middleware, persistence, devtools integration, slices pattern, and TypeScript best practices.

## When to Use This Skill

Automatically activates when working on:
- Creating Zustand stores
- Managing global state in React
- Implementing state persistence
- Using middleware (devtools, immer, persist)
- Organizing stores with slices pattern
- Optimizing re-renders with selectors

---

## Quick Start

### Installation

```bash
npm install zustand

# Optional middleware
npm install immer                    # For immutable updates
npm install @redux-devtools/extension # For devtools
```

### Basic Store

```typescript
import { create } from 'zustand';

interface BearStore {
    bears: number;
    increase: () => void;
    decrease: () => void;
    reset: () => void;
}

const useBearStore = create<BearStore>((set) => ({
    bears: 0,
    increase: () => set((state) => ({ bears: state.bears + 1 })),
    decrease: () => set((state) => ({ bears: state.bears - 1 })),
    reset: () => set({ bears: 0 }),
}));

// Usage in component
function BearCounter() {
    const bears = useBearStore((state) => state.bears);
    const increase = useBearStore((state) => state.increase);

    return (
        <div>
            <span>{bears} bears</span>
            <button onClick={increase}>Add bear</button>
        </div>
    );
}
```

### Store Checklist

- [ ] Define TypeScript interface for state
- [ ] Create store with `create<State>()()`
- [ ] Use selectors to prevent unnecessary re-renders
- [ ] Add devtools middleware for debugging
- [ ] Consider persist middleware for local storage
- [ ] Use immer for complex nested updates
- [ ] Organize large stores with slices pattern

---

## Core Concepts

### Creating Stores

```typescript
import { create } from 'zustand';

// Basic store
const useStore = create<State>((set, get) => ({
    // State
    count: 0,
    user: null,

    // Actions
    increment: () => set((state) => ({ count: state.count + 1 })),
    setUser: (user) => set({ user }),

    // Async actions
    fetchUser: async (id) => {
        const response = await fetch(`/api/users/${id}`);
        const user = await response.json();
        set({ user });
    },

    // Access current state with get()
    doubleCount: () => {
        const { count } = get();
        set({ count: count * 2 });
    },
}));
```

### set() Function

```typescript
// Replace specific properties
set({ count: 10 });

// Update based on previous state
set((state) => ({ count: state.count + 1 }));

// Replace entire state (second argument = true)
set({ count: 0, user: null }, true);
```

### get() Function

```typescript
const useStore = create((set, get) => ({
    items: [],
    addItem: (item) => {
        const { items } = get();
        set({ items: [...items, item] });
    },
    getTotal: () => {
        const { items } = get();
        return items.reduce((sum, item) => sum + item.price, 0);
    },
}));
```

---

## Selectors

### Basic Selectors

```typescript
// Select single value - component re-renders only when bears changes
const bears = useBearStore((state) => state.bears);

// Select action - stable reference, no re-renders
const increase = useBearStore((state) => state.increase);

// Select multiple values - CAUSES RE-RENDER ON ANY STATE CHANGE
const { bears, fish } = useBearStore((state) => ({
    bears: state.bears,
    fish: state.fish,
}));
```

### useShallow for Multiple Values

```typescript
import { useShallow } from 'zustand/react/shallow';

// Only re-renders when bears OR fish changes
const { bears, fish } = useBearStore(
    useShallow((state) => ({ bears: state.bears, fish: state.fish }))
);

// Array selector
const [bears, fish] = useBearStore(
    useShallow((state) => [state.bears, state.fish])
);
```

### Derived/Computed State

```typescript
// Computed in selector
const totalAnimals = useBearStore((state) => state.bears + state.fish);

// Or define in store
const useStore = create((set, get) => ({
    items: [],
    get total() {
        return this.items.reduce((sum, item) => sum + item.price, 0);
    },
}));
```

### Custom Equality Function

```typescript
import { shallow } from 'zustand/shallow';

const user = useBearStore(
    (state) => state.user,
    (oldUser, newUser) => oldUser?.id === newUser?.id
);
```

---

## Middleware

### Middleware Order (Outside → Inside)

```typescript
// Recommended order: devtools → persist → subscribeWithSelector → immer
create<Store>()(
    devtools(
        persist(
            subscribeWithSelector(
                immer((set, get) => ({
                    // store definition
                }))
            ),
            { name: 'store-name' }
        )
    )
);
```

### Devtools

```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useStore = create<Store>()(
    devtools(
        (set) => ({
            count: 0,
            increment: () => set(
                (state) => ({ count: state.count + 1 }),
                false, // replace
                'increment' // action name for devtools
            ),
        }),
        { name: 'MyStore' }
    )
);
```

### Persist

```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useStore = create<Store>()(
    persist(
        (set) => ({
            user: null,
            theme: 'light',
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'app-storage', // localStorage key
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ theme: state.theme }), // Only persist theme
            version: 1,
            migrate: (persistedState, version) => {
                // Migration logic
                return persistedState as Store;
            },
        }
    )
);
```

### Persist with AsyncStorage (React Native)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

persist(
    (set) => ({ /* ... */ }),
    {
        name: 'app-storage',
        storage: createJSONStorage(() => AsyncStorage),
    }
)
```

### Immer

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Store {
    users: { id: string; name: string; active: boolean }[];
    toggleUser: (id: string) => void;
    addUser: (user: { id: string; name: string }) => void;
}

const useStore = create<Store>()(
    immer((set) => ({
        users: [],
        toggleUser: (id) => set((state) => {
            const user = state.users.find((u) => u.id === id);
            if (user) user.active = !user.active;
        }),
        addUser: (user) => set((state) => {
            state.users.push({ ...user, active: true });
        }),
    }))
);
```

### subscribeWithSelector

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create<Store>()(
    subscribeWithSelector((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
    }))
);

// Subscribe to specific state changes
const unsub = useStore.subscribe(
    (state) => state.count,
    (count, prevCount) => {
        console.log('Count changed:', prevCount, '→', count);
    },
    { fireImmediately: true }
);
```

---

## Slices Pattern

### Basic Slices

```typescript
import { create, StateCreator } from 'zustand';

// Define slice types
interface BearSlice {
    bears: number;
    addBear: () => void;
}

interface FishSlice {
    fish: number;
    addFish: () => void;
}

type Store = BearSlice & FishSlice;

// Create slices
const createBearSlice: StateCreator<Store, [], [], BearSlice> = (set) => ({
    bears: 0,
    addBear: () => set((state) => ({ bears: state.bears + 1 })),
});

const createFishSlice: StateCreator<Store, [], [], FishSlice> = (set) => ({
    fish: 0,
    addFish: () => set((state) => ({ fish: state.fish + 1 })),
});

// Combine slices
const useStore = create<Store>()((...a) => ({
    ...createBearSlice(...a),
    ...createFishSlice(...a),
}));
```

### Slices with Middleware

```typescript
import { StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Store = BearSlice & FishSlice;

// Slice with middleware types
const createBearSlice: StateCreator<
    Store,
    [['zustand/immer', never], ['zustand/devtools', never]],
    [],
    BearSlice
> = (set) => ({
    bears: 0,
    addBear: () => set((state) => { state.bears += 1; }),
});

// Combined store with middleware
const useStore = create<Store>()(
    devtools(
        immer((...a) => ({
            ...createBearSlice(...a),
            ...createFishSlice(...a),
        })),
        { name: 'AnimalStore' }
    )
);
```

### Cross-Slice Communication

```typescript
const createBearSlice: StateCreator<Store, [], [], BearSlice> = (set, get) => ({
    bears: 0,
    addBear: () => set((state) => ({ bears: state.bears + 1 })),
    eatFish: () => {
        const { fish } = get(); // Access fish from other slice
        if (fish > 0) {
            set((state) => ({
                bears: state.bears,
                fish: state.fish - 1,
            }));
        }
    },
});
```

---

## TypeScript Patterns

### Typed Store

```typescript
import { create } from 'zustand';

interface User {
    id: string;
    name: string;
    email: string;
}

interface AuthStore {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;
}

// Note the extra parentheses: create<AuthStore>()(...)
const useAuthStore = create<AuthStore>()((set) => ({
    user: null,
    isAuthenticated: false,
    login: (user) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
}));
```

### Extracting Types

```typescript
// Extract state type from store
type AuthState = ReturnType<typeof useAuthStore.getState>;

// Extract specific slice
type UserState = Pick<AuthState, 'user' | 'isAuthenticated'>;
```

### Generic Store Factory

```typescript
interface CrudStore<T> {
    items: T[];
    add: (item: T) => void;
    remove: (id: string) => void;
    update: (id: string, updates: Partial<T>) => void;
}

function createCrudStore<T extends { id: string }>() {
    return create<CrudStore<T>>()((set) => ({
        items: [],
        add: (item) => set((state) => ({ items: [...state.items, item] })),
        remove: (id) => set((state) => ({
            items: state.items.filter((item) => item.id !== id),
        })),
        update: (id, updates) => set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            ),
        })),
    }));
}

const useProductStore = createCrudStore<Product>();
const useUserStore = createCrudStore<User>();
```

---

## Async Actions

```typescript
interface DataStore {
    data: Item[];
    loading: boolean;
    error: string | null;
    fetchData: () => Promise<void>;
}

const useDataStore = create<DataStore>()((set) => ({
    data: [],
    loading: false,
    error: null,
    fetchData: async () => {
        set({ loading: true, error: null });
        try {
            const response = await fetch('/api/data');
            const data = await response.json();
            set({ data, loading: false });
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
        }
    },
}));
```

---

## Outside React Usage

```typescript
// Access store outside components
const { bears, increase } = useBearStore.getState();

// Subscribe to changes
const unsub = useBearStore.subscribe((state) => {
    console.log('State changed:', state);
});

// Set state directly
useBearStore.setState({ bears: 10 });
```

---

## Gotchas & Real-World Warnings

### Selector Returns New Object = Infinite Re-renders

**Returning a new object from selector causes re-render every time:**

```tsx
// DANGER: Creates new object on every render
const { bears, fish } = useBearStore((state) => ({
    bears: state.bears,
    fish: state.fish,
}));  // This object is NEW every time, so component always re-renders

// CORRECT: Use useShallow
import { useShallow } from 'zustand/react/shallow';

const { bears, fish } = useBearStore(
    useShallow((state) => ({ bears: state.bears, fish: state.fish }))
);

// OR: Select primitives individually (best performance)
const bears = useBearStore((state) => state.bears);
const fish = useBearStore((state) => state.fish);
```

### Middleware Order Matters

**Middleware wraps from outside-in. Wrong order = broken functionality:**

```typescript
// DANGER: persist wrapping devtools = devtools can't see persisted state
create(
    persist(
        devtools((set) => ({ ... })),  // Wrong order!
        { name: 'store' }
    )
);

// CORRECT: devtools on outside so it can see everything
create(
    devtools(
        persist((set) => ({ ... }), { name: 'store' }),
        { name: 'MyStore' }
    )
);

// Recommended order (outside → inside):
// devtools → persist → subscribeWithSelector → immer
```

### Persist Hydration Race Condition

**Store loads from localStorage asynchronously. First render has default values:**

```tsx
// DANGER: Assuming persisted state is available immediately
function App() {
    const theme = useStore((state) => state.theme);
    return <div className={theme}>...</div>;  // 'light' on first render, then 'dark'
    // Causes flash of wrong theme!
}

// BETTER: Check hydration state
const useStore = create(
    persist(
        (set) => ({ theme: 'light', _hasHydrated: false }),
        {
            name: 'store',
            onRehydrateStorage: () => (state) => {
                state?._hasHydrated = true;
            },
        }
    )
);

function App() {
    const hasHydrated = useStore((state) => state._hasHydrated);
    const theme = useStore((state) => state.theme);

    if (!hasHydrated) return <LoadingSpinner />;
    return <div className={theme}>...</div>;
}
```

### Actions Are Not Bound

**Destructuring actions loses `this` context in some patterns:**

```typescript
// Store definition
const useStore = create((set, get) => ({
    count: 0,
    increment() {
        // Using 'this' is fragile
        set({ count: this.count + 1 });  // 'this' might be undefined!
    },
}));

// CORRECT: Always use get() to access state
const useStore = create((set, get) => ({
    count: 0,
    increment: () => {
        set({ count: get().count + 1 });  // Always works
    },
}));
```

### Immer Doesn't Return

**With immer middleware, mutations are in-place. Returning breaks it:**

```typescript
// DANGER: Returning AND mutating
create(
    immer((set) => ({
        users: [],
        addUser: (user) => set((state) => {
            state.users.push(user);
            return { users: state.users };  // DON'T return when mutating!
        }),
    }))
);

// CORRECT: Either mutate OR return, never both
// Mutate (immer way):
addUser: (user) => set((state) => {
    state.users.push(user);
})

// Return (non-immer way):
addUser: (user) => set((state) => ({
    users: [...state.users, user]
}))
```

### SSR Hydration Mismatch

**Server and client have different initial states:**

```tsx
// DANGER: Server renders with default state, client has persisted state
// Results in hydration mismatch warning

// SOLUTION 1: Skip SSR for persisted state
const useStore = create(
    persist(
        (set) => ({ count: 0 }),
        {
            name: 'store',
            skipHydration: true,  // Don't hydrate during SSR
        }
    )
);

// Then hydrate on client
useEffect(() => {
    useStore.persist.rehydrate();
}, []);

// SOLUTION 2: Use dynamic import with ssr: false (Next.js)
const ClientOnlyComponent = dynamic(
    () => import('./StoreConsumer'),
    { ssr: false }
);
```

### What These Patterns Don't Tell You

1. **DevTools performance** - Large stores slow down Redux DevTools; disable in production
2. **Persist storage limits** - localStorage is ~5MB; large stores can fail silently
3. **Cross-tab sync** - persist doesn't sync across tabs by default; need custom storage
4. **React 18 concurrent** - Zustand is concurrent-safe but external subscriptions need care
5. **Memory leaks** - `subscribe()` returns unsubscribe function; must call on cleanup
6. **Testing** - Reset stores between tests or state bleeds across test cases

---

## Anti-Patterns to Avoid

- Selecting entire state object (causes unnecessary re-renders)
- Not using selectors for multiple values
- Putting derived state in store (compute in selectors instead)
- Applying middleware inside slices (only in combined store)
- Not typing stores with TypeScript
- Using store for local component state

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Create basic stores | [store-basics.md](resources/store-basics.md) |
| Optimize re-renders | [selectors.md](resources/selectors.md) |
| Add persistence | [middleware.md](resources/middleware.md) |
| Organize large stores | [slices-pattern.md](resources/slices-pattern.md) |
| TypeScript setup | [typescript.md](resources/typescript.md) |
| Async operations | [async-actions.md](resources/async-actions.md) |
| See full examples | [complete-examples.md](resources/complete-examples.md) |

---

## Resource Files

### [store-basics.md](resources/store-basics.md)
Store creation, set/get functions, actions, state structure

### [selectors.md](resources/selectors.md)
Selectors, useShallow, derived state, custom equality

### [middleware.md](resources/middleware.md)
Devtools, persist, immer, subscribeWithSelector, combining middleware

### [slices-pattern.md](resources/slices-pattern.md)
Organizing stores, slice types, cross-slice communication

### [typescript.md](resources/typescript.md)
Type definitions, StateCreator, generic stores, middleware types

### [async-actions.md](resources/async-actions.md)
Async actions, loading states, error handling

### [complete-examples.md](resources/complete-examples.md)
Full implementation examples and real-world patterns

---

## External Resources

- [Zustand Documentation](https://zustand.docs.pmnd.rs/)
- [Zustand GitHub](https://github.com/pmndrs/zustand)
- [NPM Package](https://www.npmjs.com/package/zustand)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 7 resource files
