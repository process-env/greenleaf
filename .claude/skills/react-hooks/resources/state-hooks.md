# State Hooks: useState & useReducer

## Table of Contents

1. [useState Complete Reference](#usestate-complete-reference)
2. [useReducer Complete Reference](#usereducer-complete-reference)
3. [Decision Guide](#decision-guide)
4. [TypeScript Patterns](#typescript-patterns)
5. [Common Pitfalls](#common-pitfalls)

---

## useState Complete Reference

### Signature

```tsx
const [state, setState] = useState(initialState);
const [state, setState] = useState(() => computeInitialState());
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `initialState` | `T \| (() => T)` | Initial value or lazy initializer function |

### Returns

Array with exactly two elements:
1. `state: T` - Current state value
2. `setState: Dispatch<SetStateAction<T>>` - Function to update state

### Updater Function Signatures

```tsx
// Direct value
setState(newValue);

// Functional update (receives previous state)
setState(prevState => newValue);

// TypeScript: SetStateAction<T> = T | ((prevState: T) => T)
```

### Lazy Initialization

```tsx
// BAD: Runs expensive function every render
const [data, setData] = useState(expensiveComputation());

// GOOD: Function only called on initial render
const [data, setData] = useState(() => expensiveComputation());

// GOOD: Lazy init with props
const [data, setData] = useState(() => computeFrom(props.initialValue));
```

### State Update Rules

**1. Updates are Batched**

```tsx
function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
  // Result: count + 1 (not count + 3)
}

function handleClickCorrect() {
  setCount(c => c + 1);
  setCount(c => c + 1);
  setCount(c => c + 1);
  // Result: count + 3
}
```

**2. State Updates are Replaced, Not Merged**

```tsx
// Class component (merges)
this.setState({ name: 'Alice' }); // Keeps other fields

// useState (replaces)
setUser({ name: 'Alice' }); // Loses other fields!

// Correct: spread previous state
setUser(prev => ({ ...prev, name: 'Alice' }));
```

**3. Same Value = No Re-render**

```tsx
// React uses Object.is() comparison
setState(currentState); // No re-render if same reference
setState({ ...currentState }); // Re-renders (new object)
```

### Array State Patterns

```tsx
const [items, setItems] = useState<Item[]>([]);

// Add item
setItems(prev => [...prev, newItem]);

// Add at beginning
setItems(prev => [newItem, ...prev]);

// Remove by id
setItems(prev => prev.filter(item => item.id !== targetId));

// Update item by id
setItems(prev => prev.map(item =>
  item.id === targetId ? { ...item, done: true } : item
));

// Replace item at index
setItems(prev => [
  ...prev.slice(0, index),
  newItem,
  ...prev.slice(index + 1)
]);

// Reorder items
setItems(prev => {
  const copy = [...prev];
  const [removed] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, removed);
  return copy;
});
```

### Object State Patterns

```tsx
const [form, setForm] = useState({ name: '', email: '', age: 0 });

// Update single field
setForm(prev => ({ ...prev, name: 'Alice' }));

// Update nested object
const [user, setUser] = useState({
  name: 'Alice',
  address: { city: 'NYC', zip: '10001' }
});

setUser(prev => ({
  ...prev,
  address: { ...prev.address, city: 'LA' }
}));

// Generic field updater
const updateField = <K extends keyof Form>(field: K, value: Form[K]) => {
  setForm(prev => ({ ...prev, [field]: value }));
};
```

---

## useReducer Complete Reference

### Signature

```tsx
const [state, dispatch] = useReducer(reducer, initialArg, init?);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reducer` | `(state: S, action: A) => S` | Pure function returning next state |
| `initialArg` | `I` | Initial state or argument to init function |
| `init` | `(initialArg: I) => S` | Optional lazy initializer |

### Returns

1. `state: S` - Current state
2. `dispatch: Dispatch<A>` - Function to send actions

### Basic Pattern

```tsx
type State = { count: number };
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'set'; value: number };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    case 'set':
      return { count: action.value };
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = action;
      return state;
  }
}

const [state, dispatch] = useReducer(reducer, { count: 0 });

// Dispatch actions
dispatch({ type: 'increment' });
dispatch({ type: 'set', value: 100 });
```

### Lazy Initialization

```tsx
function init(initialCount: number): State {
  return { count: initialCount, history: [] };
}

const [state, dispatch] = useReducer(reducer, props.initialCount, init);
```

### Complex State Example

```tsx
type Todo = { id: string; text: string; done: boolean };

type State = {
  todos: Todo[];
  filter: 'all' | 'active' | 'done';
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'ADD_TODO'; text: string }
  | { type: 'TOGGLE_TODO'; id: string }
  | { type: 'DELETE_TODO'; id: string }
  | { type: 'SET_FILTER'; filter: State['filter'] }
  | { type: 'FETCH_START' }
  | { type: 'FETCH_SUCCESS'; todos: Todo[] }
  | { type: 'FETCH_ERROR'; error: string };

function todoReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_TODO':
      return {
        ...state,
        todos: [...state.todos, {
          id: crypto.randomUUID(),
          text: action.text,
          done: false
        }]
      };

    case 'TOGGLE_TODO':
      return {
        ...state,
        todos: state.todos.map(todo =>
          todo.id === action.id ? { ...todo, done: !todo.done } : todo
        )
      };

    case 'DELETE_TODO':
      return {
        ...state,
        todos: state.todos.filter(todo => todo.id !== action.id)
      };

    case 'SET_FILTER':
      return { ...state, filter: action.filter };

    case 'FETCH_START':
      return { ...state, loading: true, error: null };

    case 'FETCH_SUCCESS':
      return { ...state, loading: false, todos: action.todos };

    case 'FETCH_ERROR':
      return { ...state, loading: false, error: action.error };

    default:
      return state;
  }
}
```

### Action Creators Pattern

```tsx
// Action creators for type safety and convenience
const actions = {
  addTodo: (text: string) => ({ type: 'ADD_TODO' as const, text }),
  toggleTodo: (id: string) => ({ type: 'TOGGLE_TODO' as const, id }),
  deleteTodo: (id: string) => ({ type: 'DELETE_TODO' as const, id }),
  setFilter: (filter: State['filter']) => ({ type: 'SET_FILTER' as const, filter }),
};

// Usage
dispatch(actions.addTodo('Learn React'));
dispatch(actions.toggleTodo('abc123'));
```

### Immer Integration

```tsx
import { useImmerReducer } from 'use-immer';

function reducer(draft: State, action: Action) {
  switch (action.type) {
    case 'ADD_TODO':
      draft.todos.push({
        id: crypto.randomUUID(),
        text: action.text,
        done: false
      });
      break;

    case 'TOGGLE_TODO':
      const todo = draft.todos.find(t => t.id === action.id);
      if (todo) todo.done = !todo.done;
      break;
  }
}

const [state, dispatch] = useImmerReducer(reducer, initialState);
```

---

## Decision Guide

### When to Use useState

| Scenario | Example |
|----------|---------|
| Single primitive | `const [count, setCount] = useState(0)` |
| Boolean toggle | `const [open, setOpen] = useState(false)` |
| String input | `const [name, setName] = useState('')` |
| Simple object (2-3 fields) | `const [coords, setCoords] = useState({x: 0, y: 0})` |
| Independent state values | Multiple `useState` calls |

### When to Use useReducer

| Scenario | Reason |
|----------|--------|
| 4+ related state values | Centralized updates |
| State transitions are complex | Action-based clarity |
| Next state depends on previous | Explicit in reducer |
| Multiple components dispatch actions | Shared dispatch |
| Want to test state logic | Pure reducer is testable |
| Implementing undo/redo | Action history pattern |
| State machine patterns | Explicit state transitions |

### Hybrid Approach

```tsx
// Multiple useState for independent values
const [name, setName] = useState('');
const [email, setEmail] = useState('');

// useReducer for complex related state
const [formState, dispatch] = useReducer(formReducer, {
  isSubmitting: false,
  errors: {},
  touched: {}
});
```

---

## TypeScript Patterns

### useState with Explicit Types

```tsx
// Primitive (inferred)
const [count, setCount] = useState(0);

// Object (explicit interface)
interface User {
  name: string;
  email: string;
}
const [user, setUser] = useState<User>({ name: '', email: '' });

// Nullable
const [user, setUser] = useState<User | null>(null);

// Union types
type Status = 'idle' | 'loading' | 'success' | 'error';
const [status, setStatus] = useState<Status>('idle');
```

### useReducer with Discriminated Unions

```tsx
// State type
interface State {
  count: number;
  error: string | null;
}

// Action type with discriminated union
type Action =
  | { type: 'INCREMENT'; amount: number }
  | { type: 'DECREMENT'; amount: number }
  | { type: 'RESET' }
  | { type: 'ERROR'; message: string };

// Reducer with exhaustive type checking
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + action.amount };
    case 'DECREMENT':
      return { ...state, count: state.count - action.amount };
    case 'RESET':
      return { count: 0, error: null };
    case 'ERROR':
      return { ...state, error: action.message };
  }
}
```

---

## Common Pitfalls

### 1. Stale State in Callbacks

```tsx
// WRONG: Uses stale count
const handleClick = () => {
  setTimeout(() => {
    setCount(count + 1); // count is from when handler was created
  }, 1000);
};

// CORRECT: Functional update
const handleClick = () => {
  setTimeout(() => {
    setCount(c => c + 1); // Always uses current value
  }, 1000);
};
```

### 2. Mutating State Directly

```tsx
// WRONG: Mutating state
const handleAdd = () => {
  items.push(newItem); // Mutates!
  setItems(items); // Same reference, no re-render
};

// CORRECT: Create new array
const handleAdd = () => {
  setItems([...items, newItem]);
};
```

### 3. Over-using useReducer

```tsx
// OVERKILL: Simple toggle doesn't need reducer
const [state, dispatch] = useReducer(
  (state, action) => action.type === 'toggle' ? !state : state,
  false
);

// BETTER: useState is simpler
const [isOpen, setIsOpen] = useState(false);
const toggle = () => setIsOpen(prev => !prev);
```

### 4. Derived State Anti-pattern

```tsx
// WRONG: Storing derived state
const [items, setItems] = useState([]);
const [filteredItems, setFilteredItems] = useState([]);

useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// CORRECT: Compute during render
const [items, setItems] = useState([]);
const filteredItems = items.filter(i => i.active);
// Or useMemo if expensive
const filteredItems = useMemo(
  () => items.filter(i => i.active),
  [items]
);
```
