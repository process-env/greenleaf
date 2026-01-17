# Selectors

## Basic Selectors

```typescript
// Good - component only re-renders when count changes
const count = useStore((state) => state.count);

// Good - action reference is stable
const increment = useStore((state) => state.increment);

// BAD - re-renders on ANY state change
const { count, user } = useStore((state) => state);
```

## useShallow for Multiple Values

```typescript
import { useShallow } from 'zustand/react/shallow';

// Object selector - only re-renders when count OR user changes
const { count, user } = useStore(
    useShallow((state) => ({
        count: state.count,
        user: state.user,
    }))
);

// Array selector
const [count, user] = useStore(
    useShallow((state) => [state.count, state.user])
);

// Pick specific keys
const { name, email } = useStore(
    useShallow((state) => ({
        name: state.user?.name,
        email: state.user?.email,
    }))
);
```

## Derived/Computed State

```typescript
// Compute in selector (recommended)
const totalPrice = useStore((state) =>
    state.items.reduce((sum, item) => sum + item.price, 0)
);

// Filtered data
const activeUsers = useStore((state) =>
    state.users.filter((user) => user.active)
);

// Complex derivation
const cartSummary = useStore((state) => ({
    itemCount: state.cart.length,
    total: state.cart.reduce((sum, item) => sum + item.price * item.qty, 0),
    hasItems: state.cart.length > 0,
}));
```

## Custom Equality Functions

```typescript
import { shallow } from 'zustand/shallow';

// Shallow comparison
const user = useStore(
    (state) => state.user,
    shallow
);

// Custom comparison
const user = useStore(
    (state) => state.user,
    (oldUser, newUser) => oldUser?.id === newUser?.id
);

// Deep comparison (be careful with performance)
import { isEqual } from 'lodash';
const settings = useStore(
    (state) => state.settings,
    isEqual
);
```

## Selector Factories

```typescript
// Create reusable selectors
const selectUser = (state: Store) => state.user;
const selectCount = (state: Store) => state.count;
const selectIsAuthenticated = (state: Store) => state.user !== null;

// Use in components
function Profile() {
    const user = useStore(selectUser);
    const isAuth = useStore(selectIsAuthenticated);
}

// Parameterized selector
const selectItemById = (id: string) => (state: Store) =>
    state.items.find((item) => item.id === id);

function Item({ id }: { id: string }) {
    const item = useStore(selectItemById(id));
}
```

## Memoized Selectors

```typescript
import { useMemo } from 'react';

function ExpensiveComponent() {
    const items = useStore((state) => state.items);

    // Memoize expensive computation
    const processedItems = useMemo(() => {
        return items.map((item) => ({
            ...item,
            displayName: `${item.category}: ${item.name}`,
            formattedPrice: `$${item.price.toFixed(2)}`,
        }));
    }, [items]);

    return <ItemList items={processedItems} />;
}
```

## Subscribing to Selectors

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create<Store>()(
    subscribeWithSelector((set) => ({
        count: 0,
        increment: () => set((s) => ({ count: s.count + 1 })),
    }))
);

// Subscribe to specific state
useStore.subscribe(
    (state) => state.count,
    (count, prevCount) => {
        console.log('Count:', prevCount, '→', count);
    }
);

// With options
useStore.subscribe(
    (state) => state.user,
    (user) => {
        if (user) analytics.identify(user.id);
    },
    { fireImmediately: true }
);
```
