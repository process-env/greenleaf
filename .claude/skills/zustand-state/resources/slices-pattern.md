# Slices Pattern

## Basic Slices

```typescript
import { create, StateCreator } from 'zustand';

// Slice interfaces
interface UserSlice {
    user: User | null;
    login: (user: User) => void;
    logout: () => void;
}

interface CartSlice {
    items: CartItem[];
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
}

// Combined store type
type Store = UserSlice & CartSlice;

// Create slices
const createUserSlice: StateCreator<Store, [], [], UserSlice> = (set) => ({
    user: null,
    login: (user) => set({ user }),
    logout: () => set({ user: null }),
});

const createCartSlice: StateCreator<Store, [], [], CartSlice> = (set) => ({
    items: [],
    addItem: (item) => set((state) => ({
        items: [...state.items, item],
    })),
    removeItem: (id) => set((state) => ({
        items: state.items.filter((item) => item.id !== id),
    })),
    clearCart: () => set({ items: [] }),
});

// Combine slices
const useStore = create<Store>()((...a) => ({
    ...createUserSlice(...a),
    ...createCartSlice(...a),
}));
```

## Cross-Slice Communication

```typescript
const createCartSlice: StateCreator<Store, [], [], CartSlice> = (set, get) => ({
    items: [],

    addItem: (item) => {
        // Access user from another slice
        const { user } = get();
        if (!user) {
            console.warn('Must be logged in to add items');
            return;
        }
        set((state) => ({ items: [...state.items, item] }));
    },

    checkout: async () => {
        const { user, items } = get();
        if (!user || items.length === 0) return;

        await api.checkout(user.id, items);
        set({ items: [] }); // Clear cart after checkout
    },
});
```

## Slices with Middleware

```typescript
import { StateCreator } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

type Store = UserSlice & CartSlice;

// Define middleware stack types
type Middlewares = [
    ['zustand/devtools', never],
    ['zustand/persist', unknown],
    ['zustand/immer', never]
];

// Slice with middleware types
const createUserSlice: StateCreator<
    Store,
    Middlewares,
    [],
    UserSlice
> = (set) => ({
    user: null,
    login: (user) => set({ user }, false, 'user/login'),
    logout: () => set({ user: null }, false, 'user/logout'),
});

const createCartSlice: StateCreator<
    Store,
    Middlewares,
    [],
    CartSlice
> = (set) => ({
    items: [],
    addItem: (item) => set((state) => {
        state.items.push(item); // immer mutation
    }, false, 'cart/addItem'),
});

// Combined store with middleware
const useStore = create<Store>()(
    devtools(
        persist(
            immer((...a) => ({
                ...createUserSlice(...a),
                ...createCartSlice(...a),
            })),
            {
                name: 'app-store',
                partialize: (state) => ({ items: state.items }),
            }
        ),
        { name: 'AppStore' }
    )
);
```

## File Organization

```
src/
  store/
    index.ts           # Combined store export
    types.ts           # Shared types
    slices/
      userSlice.ts
      cartSlice.ts
      settingsSlice.ts
```

### types.ts
```typescript
export interface User {
    id: string;
    name: string;
    email: string;
}

export interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}
```

### slices/userSlice.ts
```typescript
import { StateCreator } from 'zustand';
import type { Store } from '../index';
import type { User } from '../types';

export interface UserSlice {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;
}

export const createUserSlice: StateCreator<
    Store,
    [],
    [],
    UserSlice
> = (set) => ({
    user: null,
    isAuthenticated: false,
    login: (user) => set({ user, isAuthenticated: true }),
    logout: () => set({ user: null, isAuthenticated: false }),
});
```

### index.ts
```typescript
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { createUserSlice, UserSlice } from './slices/userSlice';
import { createCartSlice, CartSlice } from './slices/cartSlice';

export type Store = UserSlice & CartSlice;

export const useStore = create<Store>()(
    devtools(
        (...a) => ({
            ...createUserSlice(...a),
            ...createCartSlice(...a),
        }),
        { name: 'AppStore' }
    )
);

// Export selectors
export const selectUser = (state: Store) => state.user;
export const selectCart = (state: Store) => state.items;
export const selectIsAuthenticated = (state: Store) => state.isAuthenticated;
```

## Reset Slice State

```typescript
const initialCartState = {
    items: [],
    total: 0,
};

const createCartSlice: StateCreator<Store, [], [], CartSlice> = (set) => ({
    ...initialCartState,
    addItem: (item) => set((state) => ({ /* ... */ })),
    resetCart: () => set(initialCartState),
});
```
