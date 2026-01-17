# Async Actions

## Basic Async Action

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
            set({
                error: (error as Error).message,
                loading: false,
            });
        }
    },
}));
```

## Async with Parameters

```typescript
interface UserStore {
    user: User | null;
    loading: boolean;
    error: string | null;
    fetchUser: (id: string) => Promise<void>;
    updateUser: (updates: Partial<User>) => Promise<void>;
}

const useUserStore = create<UserStore>()((set, get) => ({
    user: null,
    loading: false,
    error: null,

    fetchUser: async (id) => {
        set({ loading: true, error: null });
        try {
            const user = await api.getUser(id);
            set({ user, loading: false });
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
        }
    },

    updateUser: async (updates) => {
        const { user } = get();
        if (!user) return;

        set({ loading: true, error: null });
        try {
            const updated = await api.updateUser(user.id, updates);
            set({ user: updated, loading: false });
        } catch (error) {
            set({ error: (error as Error).message, loading: false });
        }
    },
}));
```

## Optimistic Updates

```typescript
const useTaskStore = create<TaskStore>()((set, get) => ({
    tasks: [],

    toggleTask: async (id: string) => {
        const { tasks } = get();
        const task = tasks.find((t) => t.id === id);
        if (!task) return;

        // Optimistic update
        set({
            tasks: tasks.map((t) =>
                t.id === id ? { ...t, completed: !t.completed } : t
            ),
        });

        try {
            await api.toggleTask(id);
        } catch (error) {
            // Rollback on error
            set({ tasks });
            console.error('Failed to toggle task:', error);
        }
    },

    deleteTask: async (id: string) => {
        const { tasks } = get();

        // Optimistic delete
        set({ tasks: tasks.filter((t) => t.id !== id) });

        try {
            await api.deleteTask(id);
        } catch (error) {
            // Rollback
            set({ tasks });
        }
    },
}));
```

## Parallel Requests

```typescript
interface DashboardStore {
    users: User[];
    posts: Post[];
    stats: Stats | null;
    loading: boolean;
    fetchDashboard: () => Promise<void>;
}

const useDashboardStore = create<DashboardStore>()((set) => ({
    users: [],
    posts: [],
    stats: null,
    loading: false,

    fetchDashboard: async () => {
        set({ loading: true });
        try {
            const [users, posts, stats] = await Promise.all([
                api.getUsers(),
                api.getPosts(),
                api.getStats(),
            ]);
            set({ users, posts, stats, loading: false });
        } catch (error) {
            set({ loading: false });
            throw error;
        }
    },
}));
```

## Request Cancellation

```typescript
interface SearchStore {
    results: Item[];
    loading: boolean;
    search: (query: string) => Promise<void>;
}

const useSearchStore = create<SearchStore>()(() => {
    let controller: AbortController | null = null;

    return {
        results: [],
        loading: false,

        search: async (query) => {
            // Cancel previous request
            controller?.abort();
            controller = new AbortController();

            set({ loading: true });
            try {
                const response = await fetch(`/api/search?q=${query}`, {
                    signal: controller.signal,
                });
                const results = await response.json();
                set({ results, loading: false });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    set({ loading: false });
                }
            }
        },
    };
});
```

## Polling

```typescript
interface PriceStore {
    price: number | null;
    startPolling: () => void;
    stopPolling: () => void;
}

const usePriceStore = create<PriceStore>()((set) => {
    let intervalId: NodeJS.Timeout | null = null;

    return {
        price: null,

        startPolling: () => {
            const fetchPrice = async () => {
                const price = await api.getPrice();
                set({ price });
            };

            fetchPrice(); // Initial fetch
            intervalId = setInterval(fetchPrice, 5000);
        },

        stopPolling: () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        },
    };
});
```

## Loading States per Item

```typescript
interface ItemStore {
    items: Item[];
    loadingIds: Set<string>;
    updateItem: (id: string, data: Partial<Item>) => Promise<void>;
}

const useItemStore = create<ItemStore>()((set, get) => ({
    items: [],
    loadingIds: new Set(),

    updateItem: async (id, data) => {
        // Add to loading set
        set((state) => ({
            loadingIds: new Set(state.loadingIds).add(id),
        }));

        try {
            const updated = await api.updateItem(id, data);
            set((state) => ({
                items: state.items.map((item) =>
                    item.id === id ? updated : item
                ),
            }));
        } finally {
            // Remove from loading set
            set((state) => {
                const loadingIds = new Set(state.loadingIds);
                loadingIds.delete(id);
                return { loadingIds };
            });
        }
    },
}));

// Usage
function ItemRow({ item }: { item: Item }) {
    const isLoading = useItemStore((state) => state.loadingIds.has(item.id));
    // ...
}
```
