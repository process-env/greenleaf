# Custom Hooks: Patterns, Best Practices & Examples

## Table of Contents

1. [Custom Hook Rules](#custom-hook-rules)
2. [Creating Custom Hooks](#creating-custom-hooks)
3. [Essential Hook Patterns](#essential-hook-patterns)
4. [Advanced Patterns](#advanced-patterns)
5. [Testing Custom Hooks](#testing-custom-hooks)
6. [Anti-Patterns](#anti-patterns)

---

## Custom Hook Rules

### Naming Convention

```tsx
// MUST start with "use" + capital letter
useOnlineStatus     // Good
useWindowSize       // Good
useLocalStorage     // Good

// BAD: Not a hook name
getOnlineStatus     // Wrong: no "use" prefix
UseOnlineStatus     // Wrong: not camelCase
useonlineStatus     // Wrong: no capital after "use"
```

### Rules of Hooks Apply

```tsx
// Custom hooks follow ALL hook rules:

// 1. Only call at top level
function useData(url) {
  // GOOD
  const [data, setData] = useState(null);

  // BAD: conditional hook
  if (url) {
    const [loading, setLoading] = useState(true);  // Error!
  }
}

// 2. Only call from React functions
function useData(url) {
  // Can call other hooks
  const [data, setData] = useState(null);
  useEffect(() => { /* ... */ }, [url]);
}
```

### When to Extract a Custom Hook

| Extract When | Don't Extract When |
|--------------|-------------------|
| Logic used in 2+ components | One-off logic |
| Complex effect with cleanup | Simple useState |
| External system integration | Component-specific state |
| Reusable subscription pattern | Trivial derivation |
| Testing logic in isolation | Just "organizing" code |

---

## Creating Custom Hooks

### Basic Template

```tsx
function useCustomHook<T>(param: P): ReturnType {
  // 1. State
  const [state, setState] = useState<T>(initial);

  // 2. Refs (if needed)
  const ref = useRef<SomeType>(null);

  // 3. Derived values (no hooks)
  const derived = compute(state);

  // 4. Callbacks (memoized if passed to children)
  const handler = useCallback(() => {
    /* ... */
  }, [deps]);

  // 5. Effects
  useEffect(() => {
    // setup
    return () => { /* cleanup */ };
  }, [deps]);

  // 6. Return value
  return { state, derived, handler };
}
```

### Return Value Patterns

```tsx
// Pattern 1: Single value
function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(true);
  // ...
  return isOnline;
}

// Pattern 2: Tuple (useState-like)
function useToggle(initial: boolean): [boolean, () => void] {
  const [value, setValue] = useState(initial);
  const toggle = useCallback(() => setValue(v => !v), []);
  return [value, toggle];
}

// Pattern 3: Object (multiple values)
function useAsync<T>(asyncFn: () => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({
    loading: false,
    error: null,
    data: null
  });
  // ...
  return { ...state, execute };
}

// Pattern 4: Object with actions
function useCounter(initial: number) {
  const [count, setCount] = useState(initial);

  const actions = useMemo(() => ({
    increment: () => setCount(c => c + 1),
    decrement: () => setCount(c => c - 1),
    reset: () => setCount(initial)
  }), [initial]);

  return { count, ...actions };
}
```

---

## Essential Hook Patterns

### useLocalStorage

```tsx
function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Lazy init from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;

    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Sync to localStorage
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue(prev => {
      const valueToStore = value instanceof Function ? value(prev) : value;

      try {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }

      return valueToStore;
    });
  }, [key]);

  return [storedValue, setValue];
}

// Usage
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

### useDebounce

```tsx
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// Usage
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useDebounce(searchTerm, 300);

useEffect(() => {
  fetchResults(debouncedSearch);
}, [debouncedSearch]);
```

### useMediaQuery

```tsx
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);

    // Set initial value
    setMatches(mediaQuery.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

// Usage
const isMobile = useMediaQuery('(max-width: 768px)');
const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
```

### useOnClickOutside

```tsx
function useOnClickOutside<T extends HTMLElement>(
  ref: RefObject<T>,
  handler: (event: MouseEvent | TouchEvent) => void
): void {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

// Usage
const dropdownRef = useRef<HTMLDivElement>(null);
const [isOpen, setIsOpen] = useState(false);

useOnClickOutside(dropdownRef, () => setIsOpen(false));
```

### usePrevious

```tsx
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Usage
const [count, setCount] = useState(0);
const prevCount = usePrevious(count);
// On first render: prevCount = undefined
// After setCount(5): prevCount = 0, count = 5
```

### useToggle

```tsx
function useToggle(
  initialValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [value, setValue] = useState(initialValue);

  const toggle = useCallback(() => setValue(v => !v), []);
  const setToggle = useCallback((v: boolean) => setValue(v), []);

  return [value, toggle, setToggle];
}

// Usage
const [isOpen, toggle, setOpen] = useToggle(false);
```

### useWindowSize

```tsx
interface WindowSize {
  width: number;
  height: number;
}

function useWindowSize(): WindowSize {
  const [size, setSize] = useState<WindowSize>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0
  }));

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}
```

---

## Advanced Patterns

### useFetch with Caching

```tsx
const cache = new Map<string, unknown>();

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

function useFetch<T>(url: string): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(() => {
    return (cache.get(url) as T) ?? null;
  });
  const [loading, setLoading] = useState(!cache.has(url));
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      cache.set(url, result);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    if (!cache.has(url)) {
      fetchData();
    }
  }, [url, fetchData]);

  return { data, loading, error, refetch: fetchData };
}
```

### useAsync

```tsx
type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'pending'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: Error };

function useAsync<T>() {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null
  });

  const execute = useCallback(async (promise: Promise<T>) => {
    setState({ status: 'pending', data: null, error: null });

    try {
      const data = await promise;
      setState({ status: 'success', data, error: null });
      return data;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setState({ status: 'error', data: null, error: err });
      throw err;
    }
  }, []);

  return { ...state, execute };
}

// Usage
const { status, data, error, execute } = useAsync<User>();

async function handleSubmit() {
  await execute(createUser(formData));
}
```

### useIntersectionObserver

```tsx
interface UseIntersectionOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
}

function useIntersectionObserver(
  ref: RefObject<Element>,
  options: UseIntersectionOptions = {}
): IntersectionObserverEntry | null {
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setEntry(entry),
      options
    );

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, options.threshold, options.root, options.rootMargin]);

  return entry;
}

// Usage: Infinite scroll
function InfiniteList({ loadMore }) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const entry = useIntersectionObserver(sentinelRef, { threshold: 0.1 });

  useEffect(() => {
    if (entry?.isIntersecting) {
      loadMore();
    }
  }, [entry?.isIntersecting, loadMore]);

  return (
    <>
      {items.map(item => <Item key={item.id} {...item} />)}
      <div ref={sentinelRef} />
    </>
  );
}
```

### useEventListener

```tsx
function useEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = window
): void {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      savedHandler.current(event as WindowEventMap[K]);
    };

    element.addEventListener(eventName, eventListener);
    return () => element.removeEventListener(eventName, eventListener);
  }, [eventName, element]);
}

// Usage
useEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});
```

---

## Testing Custom Hooks

### With @testing-library/react

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should initialize with default value', () => {
    const { result } = renderHook(() => useCounter(0));
    expect(result.current.count).toBe(0);
  });

  it('should increment', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });

  it('should handle custom initial value', () => {
    const { result } = renderHook(() => useCounter(10));
    expect(result.current.count).toBe(10);
  });

  it('should update when props change', () => {
    const { result, rerender } = renderHook(
      ({ initial }) => useCounter(initial),
      { initialProps: { initial: 0 } }
    );

    expect(result.current.count).toBe(0);

    // Re-render with new props
    rerender({ initial: 5 });

    // Depends on hook implementation
  });
});
```

### Testing Async Hooks

```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useFetch } from './useFetch';

// Mock fetch
global.fetch = jest.fn();

describe('useFetch', () => {
  it('should fetch data', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ name: 'John' })
    });

    const { result } = renderHook(() => useFetch('/api/user'));

    // Initially loading
    expect(result.current.loading).toBe(true);

    // Wait for data
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual({ name: 'John' });
    expect(result.current.error).toBeNull();
  });

  it('should handle errors', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useFetch('/api/user'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.data).toBeNull();
  });
});
```

---

## Anti-Patterns

### 1. Lifecycle Hooks

```tsx
// BAD: Generic lifecycle wrapper
function useMount(fn: () => void) {
  useEffect(fn, []);  // Missing cleanup, unclear purpose
}

// GOOD: Purpose-specific hooks
function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}
```

### 2. Hooks That Just Wrap useEffect

```tsx
// BAD: Doesn't add value
function useEffectOnce(fn: () => void) {
  useEffect(fn, []);
}

// GOOD: Meaningful abstraction
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
```

### 3. Too Many Return Values

```tsx
// BAD: Hard to remember order
function useForm() {
  return [values, errors, touched, handleChange, handleBlur, handleSubmit, reset];
}

// GOOD: Object return for many values
function useForm() {
  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    reset
  };
}
```

### 4. Hooks with Side Effects in Body

```tsx
// BAD: Side effect outside useEffect
function useBadHook() {
  localStorage.setItem('key', 'value');  // Runs every render!
  return useState(false);
}

// GOOD: Side effects in useEffect
function useGoodHook() {
  const [value, setValue] = useState(false);

  useEffect(() => {
    localStorage.setItem('key', String(value));
  }, [value]);

  return [value, setValue];
}
```

### 5. Not Handling SSR

```tsx
// BAD: Crashes on server
function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);  // Error!
  // ...
}

// GOOD: Handle SSR
function useWindowWidth() {
  const [width, setWidth] = useState(() => {
    if (typeof window === 'undefined') return 0;
    return window.innerWidth;
  });
  // ...
}
```
