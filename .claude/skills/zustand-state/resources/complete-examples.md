# Complete Examples

## Auth Store

```typescript
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

interface User {
    id: string;
    email: string;
    name: string;
}

interface AuthStore {
    user: User | null;
    token: string | null;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshToken: () => Promise<void>;
}

const useAuthStore = create<AuthStore>()(
    devtools(
        persist(
            (set, get) => ({
                user: null,
                token: null,
                loading: false,
                error: null,

                login: async (email, password) => {
                    set({ loading: true, error: null });
                    try {
                        const { user, token } = await api.login(email, password);
                        set({ user, token, loading: false });
                    } catch (error) {
                        set({
                            error: (error as Error).message,
                            loading: false,
                        });
                        throw error;
                    }
                },

                logout: () => {
                    set({ user: null, token: null });
                },

                refreshToken: async () => {
                    const { token } = get();
                    if (!token) return;

                    const newToken = await api.refreshToken(token);
                    set({ token: newToken });
                },
            }),
            {
                name: 'auth-storage',
                partialize: (state) => ({
                    token: state.token,
                    user: state.user,
                }),
            }
        ),
        { name: 'AuthStore' }
    )
);
```

## Shopping Cart Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface CartItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
}

interface CartStore {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>) => void;
    removeItem: (id: string) => void;
    updateQuantity: (id: string, quantity: number) => void;
    clearCart: () => void;
    total: () => number;
    itemCount: () => number;
}

const useCartStore = create<CartStore>()(
    persist(
        immer((set, get) => ({
            items: [],

            addItem: (item) => set((state) => {
                const existing = state.items.find((i) => i.id === item.id);
                if (existing) {
                    existing.quantity += 1;
                } else {
                    state.items.push({ ...item, quantity: 1 });
                }
            }),

            removeItem: (id) => set((state) => {
                const index = state.items.findIndex((i) => i.id === id);
                if (index !== -1) {
                    state.items.splice(index, 1);
                }
            }),

            updateQuantity: (id, quantity) => set((state) => {
                const item = state.items.find((i) => i.id === id);
                if (item) {
                    if (quantity <= 0) {
                        state.items = state.items.filter((i) => i.id !== id);
                    } else {
                        item.quantity = quantity;
                    }
                }
            }),

            clearCart: () => set({ items: [] }),

            total: () => {
                return get().items.reduce(
                    (sum, item) => sum + item.price * item.quantity,
                    0
                );
            },

            itemCount: () => {
                return get().items.reduce((sum, item) => sum + item.quantity, 0);
            },
        })),
        { name: 'cart-storage' }
    )
);
```

## Theme Store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    resolvedTheme: () => 'light' | 'dark';
}

const useThemeStore = create<ThemeStore>()(
    persist(
        (set, get) => ({
            theme: 'system',

            setTheme: (theme) => set({ theme }),

            toggleTheme: () => set((state) => ({
                theme: state.theme === 'light' ? 'dark' : 'light',
            })),

            resolvedTheme: () => {
                const { theme } = get();
                if (theme !== 'system') return theme;

                return window.matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light';
            },
        }),
        { name: 'theme-storage' }
    )
);
```

## Todo Store with Filters

```typescript
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface Todo {
    id: string;
    text: string;
    completed: boolean;
    createdAt: Date;
}

type Filter = 'all' | 'active' | 'completed';

interface TodoStore {
    todos: Todo[];
    filter: Filter;
    addTodo: (text: string) => void;
    toggleTodo: (id: string) => void;
    deleteTodo: (id: string) => void;
    setFilter: (filter: Filter) => void;
    clearCompleted: () => void;
    filteredTodos: () => Todo[];
    stats: () => { total: number; active: number; completed: number };
}

const useTodoStore = create<TodoStore>()(
    immer((set, get) => ({
        todos: [],
        filter: 'all',

        addTodo: (text) => set((state) => {
            state.todos.push({
                id: crypto.randomUUID(),
                text,
                completed: false,
                createdAt: new Date(),
            });
        }),

        toggleTodo: (id) => set((state) => {
            const todo = state.todos.find((t) => t.id === id);
            if (todo) todo.completed = !todo.completed;
        }),

        deleteTodo: (id) => set((state) => {
            state.todos = state.todos.filter((t) => t.id !== id);
        }),

        setFilter: (filter) => set({ filter }),

        clearCompleted: () => set((state) => {
            state.todos = state.todos.filter((t) => !t.completed);
        }),

        filteredTodos: () => {
            const { todos, filter } = get();
            switch (filter) {
                case 'active':
                    return todos.filter((t) => !t.completed);
                case 'completed':
                    return todos.filter((t) => t.completed);
                default:
                    return todos;
            }
        },

        stats: () => {
            const { todos } = get();
            const completed = todos.filter((t) => t.completed).length;
            return {
                total: todos.length,
                active: todos.length - completed,
                completed,
            };
        },
    }))
);
```

## Modal/Dialog Store

```typescript
import { create } from 'zustand';

interface ModalState<T = unknown> {
    isOpen: boolean;
    data: T | null;
}

interface ModalStore {
    modals: Record<string, ModalState>;
    openModal: <T>(id: string, data?: T) => void;
    closeModal: (id: string) => void;
    closeAllModals: () => void;
    isModalOpen: (id: string) => boolean;
    getModalData: <T>(id: string) => T | null;
}

const useModalStore = create<ModalStore>()((set, get) => ({
    modals: {},

    openModal: (id, data = null) => set((state) => ({
        modals: {
            ...state.modals,
            [id]: { isOpen: true, data },
        },
    })),

    closeModal: (id) => set((state) => ({
        modals: {
            ...state.modals,
            [id]: { isOpen: false, data: null },
        },
    })),

    closeAllModals: () => set({ modals: {} }),

    isModalOpen: (id) => get().modals[id]?.isOpen ?? false,

    getModalData: <T>(id: string) => (get().modals[id]?.data as T) ?? null,
}));

// Usage
function DeleteConfirmModal() {
    const isOpen = useModalStore((s) => s.isModalOpen('delete-confirm'));
    const data = useModalStore((s) => s.getModalData<{ itemId: string }>('delete-confirm'));
    const closeModal = useModalStore((s) => s.closeModal);

    if (!isOpen) return null;

    return (
        <Modal onClose={() => closeModal('delete-confirm')}>
            <p>Delete item {data?.itemId}?</p>
        </Modal>
    );
}
```
