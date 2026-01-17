# Middleware

## Middleware Order

```typescript
// Recommended: devtools → persist → subscribeWithSelector → immer
create<Store>()(
    devtools(
        persist(
            subscribeWithSelector(
                immer((set, get) => ({
                    // store
                }))
            ),
            { name: 'storage-key' }
        ),
        { name: 'StoreName' }
    )
);
```

## Devtools

```typescript
import { devtools } from 'zustand/middleware';

const useStore = create<Store>()(
    devtools(
        (set) => ({
            count: 0,
            increment: () => set(
                (state) => ({ count: state.count + 1 }),
                false,        // replace (false = merge)
                'increment'   // action name
            ),
        }),
        {
            name: 'MyStore',
            enabled: process.env.NODE_ENV === 'development',
        }
    )
);
```

## Persist

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';

const useStore = create<Store>()(
    persist(
        (set) => ({
            user: null,
            theme: 'light',
            setTheme: (theme) => set({ theme }),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => localStorage),

            // Only persist specific keys
            partialize: (state) => ({
                theme: state.theme,
                // user is NOT persisted
            }),

            // Migration between versions
            version: 1,
            migrate: (persisted, version) => {
                if (version === 0) {
                    // Migrate from v0 to v1
                    return { ...persisted, newField: 'default' };
                }
                return persisted;
            },

            // Custom serialization
            serialize: (state) => JSON.stringify(state),
            deserialize: (str) => JSON.parse(str),
        }
    )
);
```

## Persist Hydration

```typescript
// Check if hydrated
const useStore = create<Store>()(
    persist(
        (set) => ({ /* ... */ }),
        { name: 'storage' }
    )
);

// Wait for hydration
function App() {
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        const unsub = useStore.persist.onFinishHydration(() => {
            setHydrated(true);
        });

        // Check if already hydrated
        if (useStore.persist.hasHydrated()) {
            setHydrated(true);
        }

        return unsub;
    }, []);

    if (!hydrated) return <Loading />;
    return <App />;
}

// Or use rehydrate
useStore.persist.rehydrate();
```

## Immer

```typescript
import { immer } from 'zustand/middleware/immer';

const useStore = create<Store>()(
    immer((set) => ({
        users: [],

        // Mutate directly - immer handles immutability
        addUser: (user) => set((state) => {
            state.users.push(user);
        }),

        updateUser: (id, updates) => set((state) => {
            const user = state.users.find((u) => u.id === id);
            if (user) {
                Object.assign(user, updates);
            }
        }),

        removeUser: (id) => set((state) => {
            const index = state.users.findIndex((u) => u.id === id);
            if (index !== -1) {
                state.users.splice(index, 1);
            }
        }),

        // Nested updates
        updateNestedField: (userId, field, value) => set((state) => {
            const user = state.users.find((u) => u.id === userId);
            if (user) {
                user.settings[field] = value;
            }
        }),
    }))
);
```

## subscribeWithSelector

```typescript
import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create<Store>()(
    subscribeWithSelector((set) => ({
        count: 0,
        user: null,
    }))
);

// Subscribe to count changes
const unsub = useStore.subscribe(
    (state) => state.count,
    (count, prevCount) => {
        console.log('Count changed:', prevCount, '→', count);
    },
    {
        equalityFn: (a, b) => a === b,
        fireImmediately: true,
    }
);

// React to user login
useStore.subscribe(
    (state) => state.user,
    (user) => {
        if (user) {
            analytics.identify(user.id);
        }
    }
);
```

## Combining All Middleware

```typescript
import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create<Store>()(
    devtools(
        persist(
            subscribeWithSelector(
                immer((set, get) => ({
                    items: [],
                    addItem: (item) => set((state) => {
                        state.items.push(item);
                    }, false, 'addItem'),
                }))
            ),
            { name: 'app-storage' }
        ),
        { name: 'AppStore' }
    )
);
```
