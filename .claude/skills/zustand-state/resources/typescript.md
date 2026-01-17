# TypeScript Patterns

## Basic Typed Store

```typescript
import { create } from 'zustand';

interface Store {
    count: number;
    increment: () => void;
}

// Note the extra () after create<Store>
const useStore = create<Store>()((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

## Why Double Parentheses?

```typescript
// This pattern enables proper type inference with middleware
create<Store>()(
    devtools(
        persist(
            (set) => ({ /* ... */ }),
            { name: 'storage' }
        )
    )
);

// Without middleware, you can use either:
create<Store>((set) => ({ /* ... */ }));
// or
create<Store>()((set) => ({ /* ... */ }));
```

## StateCreator Type

```typescript
import { StateCreator } from 'zustand';

// For slices
const createUserSlice: StateCreator<
    Store,      // Full store type
    [],         // Middleware types (setters)
    [],         // Middleware types (getters)
    UserSlice   // This slice's type
> = (set) => ({
    user: null,
    setUser: (user) => set({ user }),
});
```

## StateCreator with Middleware

```typescript
import { StateCreator } from 'zustand';

// With immer + devtools
const createSlice: StateCreator<
    Store,
    [['zustand/immer', never], ['zustand/devtools', never]],
    [],
    MySlice
> = (set) => ({
    // ...
});

// With persist
const createSlice: StateCreator<
    Store,
    [['zustand/persist', Store]],
    [],
    MySlice
> = (set) => ({
    // ...
});
```

## Extracting Types

```typescript
// Get state type from store
type StoreState = ReturnType<typeof useStore.getState>;

// Get specific types
type User = StoreState['user'];
type Actions = Pick<StoreState, 'login' | 'logout'>;
```

## Generic Store Factory

```typescript
interface Entity {
    id: string;
}

interface CrudSlice<T extends Entity> {
    items: T[];
    loading: boolean;
    error: string | null;
    fetch: () => Promise<void>;
    add: (item: T) => void;
    update: (id: string, updates: Partial<T>) => void;
    remove: (id: string) => void;
}

function createCrudStore<T extends Entity>(
    fetchFn: () => Promise<T[]>
) {
    return create<CrudSlice<T>>()((set) => ({
        items: [],
        loading: false,
        error: null,

        fetch: async () => {
            set({ loading: true, error: null });
            try {
                const items = await fetchFn();
                set({ items, loading: false });
            } catch (e) {
                set({ error: (e as Error).message, loading: false });
            }
        },

        add: (item) => set((state) => ({
            items: [...state.items, item],
        })),

        update: (id, updates) => set((state) => ({
            items: state.items.map((item) =>
                item.id === id ? { ...item, ...updates } : item
            ),
        })),

        remove: (id) => set((state) => ({
            items: state.items.filter((item) => item.id !== id),
        })),
    }));
}

// Usage
interface Product {
    id: string;
    name: string;
    price: number;
}

const useProductStore = createCrudStore<Product>(() =>
    fetch('/api/products').then((r) => r.json())
);
```

## Typed Selectors

```typescript
// Selector type
type Selector<T> = (state: Store) => T;

// Create typed selectors
const selectUser: Selector<User | null> = (state) => state.user;
const selectIsAuth: Selector<boolean> = (state) => state.user !== null;
const selectCartTotal: Selector<number> = (state) =>
    state.items.reduce((sum, item) => sum + item.price, 0);

// Parameterized selector factory
const selectItemById = (id: string): Selector<Item | undefined> =>
    (state) => state.items.find((item) => item.id === id);
```

## Typed Actions

```typescript
interface Actions {
    login: (credentials: { email: string; password: string }) => Promise<void>;
    logout: () => void;
    updateProfile: (updates: Partial<User>) => Promise<void>;
}

interface State {
    user: User | null;
    loading: boolean;
}

type Store = State & Actions;

const useStore = create<Store>()((set) => ({
    user: null,
    loading: false,

    login: async ({ email, password }) => {
        set({ loading: true });
        const user = await api.login(email, password);
        set({ user, loading: false });
    },

    logout: () => set({ user: null }),

    updateProfile: async (updates) => {
        set({ loading: true });
        const user = await api.updateProfile(updates);
        set({ user, loading: false });
    },
}));
```

## Discriminated Unions

```typescript
type AuthState =
    | { status: 'idle'; user: null }
    | { status: 'loading'; user: null }
    | { status: 'authenticated'; user: User }
    | { status: 'error'; user: null; error: string };

interface AuthStore extends AuthState {
    login: (credentials: Credentials) => Promise<void>;
    logout: () => void;
}

const useAuthStore = create<AuthStore>()((set) => ({
    status: 'idle',
    user: null,

    login: async (credentials) => {
        set({ status: 'loading', user: null });
        try {
            const user = await api.login(credentials);
            set({ status: 'authenticated', user });
        } catch (e) {
            set({ status: 'error', user: null, error: (e as Error).message });
        }
    },

    logout: () => set({ status: 'idle', user: null }),
}));
```
