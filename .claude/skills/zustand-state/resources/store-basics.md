# Store Basics

## Creating a Store

```typescript
import { create } from 'zustand';

interface CounterStore {
    count: number;
    increment: () => void;
    decrement: () => void;
    reset: () => void;
    setCount: (count: number) => void;
}

const useCounterStore = create<CounterStore>()((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
    setCount: (count) => set({ count }),
}));
```

## set() Function

```typescript
// Partial update - merges with existing state
set({ count: 10 });

// Functional update - access previous state
set((state) => ({ count: state.count + 1 }));

// Replace entire state (use sparingly)
set({ count: 0, user: null }, true);

// Named action for devtools
set((state) => ({ count: state.count + 1 }), false, 'increment');
```

## get() Function

```typescript
const useStore = create((set, get) => ({
    items: [],

    // Access current state
    addItem: (item) => {
        const currentItems = get().items;
        set({ items: [...currentItems, item] });
    },

    // Compute values without storing
    getTotal: () => {
        return get().items.reduce((sum, item) => sum + item.price, 0);
    },

    // Conditional logic
    removeLastItem: () => {
        const { items } = get();
        if (items.length > 0) {
            set({ items: items.slice(0, -1) });
        }
    },
}));
```

## Using in Components

```typescript
function Counter() {
    // Select specific values
    const count = useCounterStore((state) => state.count);
    const increment = useCounterStore((state) => state.increment);

    return (
        <div>
            <span>{count}</span>
            <button onClick={increment}>+</button>
        </div>
    );
}
```

## Outside React

```typescript
// Get current state
const state = useCounterStore.getState();
console.log(state.count);

// Update state
useCounterStore.setState({ count: 100 });

// Call actions
useCounterStore.getState().increment();

// Subscribe to changes
const unsub = useCounterStore.subscribe((state, prevState) => {
    console.log('Changed from', prevState.count, 'to', state.count);
});

// Cleanup
unsub();
```

## Store with Complex State

```typescript
interface User {
    id: string;
    name: string;
    email: string;
}

interface AppStore {
    // State
    user: User | null;
    theme: 'light' | 'dark';
    notifications: Notification[];

    // Actions
    setUser: (user: User | null) => void;
    toggleTheme: () => void;
    addNotification: (notification: Notification) => void;
    clearNotifications: () => void;
}

const useAppStore = create<AppStore>()((set) => ({
    user: null,
    theme: 'light',
    notifications: [],

    setUser: (user) => set({ user }),
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light',
    })),
    addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, notification],
    })),
    clearNotifications: () => set({ notifications: [] }),
}));
```
