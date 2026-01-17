# Performance Hooks: useMemo, useCallback, useTransition & useDeferredValue

## Table of Contents

1. [useMemo Reference](#usememo-reference)
2. [useCallback Reference](#usecallback-reference)
3. [useTransition Reference](#usetransition-reference)
4. [useDeferredValue Reference](#usedeferredvalue-reference)
5. [Optimization Strategy](#optimization-strategy)
6. [Common Mistakes](#common-mistakes)

---

## useMemo Reference

### Signature

```tsx
const cachedValue = useMemo(calculateValue, dependencies);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `calculateValue` | `() => T` | Function that calculates the value to cache |
| `dependencies` | `DependencyList` | Array of values that trigger recalculation |

### Returns

- On first render: Result of calling `calculateValue()`
- On subsequent renders: Cached value if deps unchanged, or new calculation if changed

### When to Use useMemo

**1. Expensive Calculations**

```tsx
// GOOD: Expensive sort/filter
const sortedItems = useMemo(() => {
  return items
    .filter(item => item.category === category)
    .sort((a, b) => a.name.localeCompare(b.name));
}, [items, category]);
```

**2. Referential Equality for Child Props**

```tsx
// Without memo: chartData is new object every render
// Child component re-renders even if data hasn't changed
const chartData = { labels, values };

// With memo: Same reference if deps unchanged
const chartData = useMemo(
  () => ({ labels, values }),
  [labels, values]
);

<ExpensiveChart data={chartData} />
```

**3. Dependency for Other Hooks**

```tsx
// Object used in effect dependencies
const options = useMemo(
  () => ({ page, limit, sort }),
  [page, limit, sort]
);

useEffect(() => {
  fetchData(options);
}, [options]);
```

### When NOT to Use useMemo

```tsx
// DON'T: Simple calculations
const doubled = useMemo(() => count * 2, [count]);
// Just do: const doubled = count * 2;

// DON'T: Primitive values
const isActive = useMemo(() => status === 'active', [status]);
// Just do: const isActive = status === 'active';

// DON'T: When child isn't memoized anyway
const data = useMemo(() => ({ a, b }), [a, b]);
<UnmemoizedChild data={data} />  // Pointless!
```

---

## useCallback Reference

### Signature

```tsx
const cachedFn = useCallback(fn, dependencies);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `fn` | `(...args) => T` | Function to cache |
| `dependencies` | `DependencyList` | Values that trigger new function creation |

### Returns

- On first render: The function you passed
- On subsequent renders: Same function if deps unchanged, or new function if changed

### When to Use useCallback

**1. Passing Callbacks to Memoized Children**

```tsx
const MemoizedList = memo(({ items, onItemClick }) => (
  <ul>
    {items.map(item => (
      <li key={item.id} onClick={() => onItemClick(item.id)}>
        {item.name}
      </li>
    ))}
  </ul>
));

function Parent() {
  const [items, setItems] = useState([]);

  // Without useCallback: new function every render
  // MemoizedList re-renders despite memo()
  const handleClick = useCallback((id) => {
    console.log('Clicked:', id);
  }, []);

  return <MemoizedList items={items} onItemClick={handleClick} />;
}
```

**2. Callback in Effect Dependencies**

```tsx
const fetchData = useCallback(async () => {
  const result = await api.get(`/users/${userId}`);
  setData(result);
}, [userId]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

**3. Callbacks Passed to Custom Hooks**

```tsx
const handleMessage = useCallback((msg) => {
  setMessages(prev => [...prev, msg]);
}, []);

useWebSocket(url, { onMessage: handleMessage });
```

### When NOT to Use useCallback

```tsx
// DON'T: No downstream optimization
function Parent() {
  // Pointless if Child isn't memoized
  const handleClick = useCallback(() => {
    doSomething();
  }, []);

  return <Child onClick={handleClick} />;  // Child re-renders anyway
}

// DON'T: Inline handlers with no perf issue
<button onClick={() => setCount(c => c + 1)}>
  Increment
</button>
```

---

## useMemo vs useCallback

```tsx
// These are equivalent:
const memoizedFn = useMemo(() => {
  return () => doSomething(a, b);
}, [a, b]);

const memoizedFn = useCallback(() => {
  doSomething(a, b);
}, [a, b]);

// useCallback(fn, deps) === useMemo(() => fn, deps)
```

**Rule of thumb:**
- `useMemo` → cache a **value**
- `useCallback` → cache a **function**

---

## useTransition Reference

### Signature

```tsx
const [isPending, startTransition] = useTransition();
```

### Returns

| Value | Type | Description |
|-------|------|-------------|
| `isPending` | `boolean` | Whether a transition is in progress |
| `startTransition` | `(action: () => void) => void` | Marks updates as non-blocking |

### How It Works

```tsx
function TabContainer() {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState('home');

  function selectTab(nextTab) {
    startTransition(() => {
      setTab(nextTab);  // This update is now "low priority"
    });
  }

  return (
    <>
      <TabBar onSelect={selectTab} />
      {isPending && <Spinner />}
      <TabPanel tab={tab} />
    </>
  );
}
```

### Key Behaviors

1. **Non-blocking**: User can still interact while transition runs
2. **Interruptible**: New transitions cancel in-progress ones
3. **No loading indicator delay**: Shows current content until ready

### Use Cases

**Tab Switching**

```tsx
startTransition(() => {
  setActiveTab(newTab);
});
```

**Navigation**

```tsx
startTransition(() => {
  router.navigate(newRoute);
});
```

**List Filtering**

```tsx
const [filter, setFilter] = useState('');
const [isPending, startTransition] = useTransition();

function handleFilter(value) {
  // Input updates immediately
  setFilter(value);

  // Expensive list filtering is deferred
  startTransition(() => {
    setFilteredList(items.filter(i => i.name.includes(value)));
  });
}
```

---

## useDeferredValue Reference

### Signature

```tsx
const deferredValue = useDeferredValue(value, initialValue?);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `value` | `T` | Value to defer |
| `initialValue` | `T?` | Optional initial value for first render |

### Returns

Deferred version of the value that "lags behind" during updates.

### How It Works

```tsx
function SearchResults({ query }) {
  // deferredQuery updates after query, during idle time
  const deferredQuery = useDeferredValue(query);

  // Show stale results while new ones load
  const isStale = query !== deferredQuery;

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <Results query={deferredQuery} />
    </div>
  );
}
```

### With Suspense

```tsx
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Suspense fallback={<Spinner />}>
        {/* Uses stale results instead of showing fallback */}
        <SearchResults query={deferredQuery} />
      </Suspense>
    </>
  );
}
```

---

## useTransition vs useDeferredValue

| Aspect | useTransition | useDeferredValue |
|--------|---------------|------------------|
| Wraps | State setter function | Value |
| Control | You decide when to transition | React decides when to defer |
| `isPending` | Available | Must compare values |
| Best for | User-initiated state changes | Received props/derived values |
| Example | Tab clicks, form submits | Search query filtering |

### Decision Guide

```
Can you wrap the setState call?
│
├─► Yes → useTransition
│   • Tab switching
│   • Form submissions
│   • Navigation
│
└─► No (value comes from props/parent) → useDeferredValue
    • Search results filtering
    • Expensive child rendering
    • External data display
```

---

## Optimization Strategy

### The Performance Optimization Checklist

```
1. Profile first (React DevTools Profiler)
   ↓
2. Identify slow component
   ↓
3. Is it re-rendering unnecessarily?
   │
   ├─► Yes: Wrap with memo()
   │   │
   │   └─► Still slow? Stabilize props:
   │       • useCallback for functions
   │       • useMemo for objects/arrays
   │
   └─► No: Is it expensive to render?
       │
       ├─► Yes: Consider:
       │   • useMemo for expensive calculations
       │   • useDeferredValue for expensive children
       │   • useTransition for non-urgent updates
       │
       └─► No: Look elsewhere for perf issues
```

### The Three-Step Pattern

```tsx
// Step 1: Memoize the child component
const ExpensiveList = memo(({ items, onSelect }) => {
  return items.map(item => (
    <ExpensiveItem key={item.id} item={item} onSelect={onSelect} />
  ));
});

// Step 2: Memoize callback props
function Parent() {
  const handleSelect = useCallback((id) => {
    setSelected(id);
  }, []);

  // Step 3: Memoize object/array props
  const sortedItems = useMemo(() => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  return <ExpensiveList items={sortedItems} onSelect={handleSelect} />;
}
```

---

## Common Mistakes

### 1. Premature Optimization

```tsx
// BAD: Optimizing without measurement
const value = useMemo(() => a + b, [a, b]);
const handler = useCallback(() => onClick(id), [onClick, id]);

// GOOD: Only optimize when profiler shows issues
const value = a + b;
const handler = () => onClick(id);
```

### 2. Missing memo() on Child

```tsx
// POINTLESS: Parent uses useCallback but child isn't memoized
function Parent() {
  const handleClick = useCallback(() => {}, []);
  return <Child onClick={handleClick} />;  // Child re-renders anyway
}

// EFFECTIVE: Child is memoized
const Child = memo(({ onClick }) => <button onClick={onClick} />);
```

### 3. Object in useMemo Dependencies

```tsx
// BAD: options is new object every render
function Component({ page, limit }) {
  const options = { page, limit };
  const data = useMemo(() => process(options), [options]); // Always recalculates!
}

// GOOD: Use primitive dependencies
function Component({ page, limit }) {
  const data = useMemo(() => process({ page, limit }), [page, limit]);
}
```

### 4. Forgetting useCallback Dependencies

```tsx
// BUG: Stale closure over userId
const fetchUser = useCallback(async () => {
  const user = await api.get(`/users/${userId}`);
  setUser(user);
}, []); // Missing userId!

// CORRECT
const fetchUser = useCallback(async () => {
  const user = await api.get(`/users/${userId}`);
  setUser(user);
}, [userId]);
```

### 5. Using useDeferredValue for Input Control

```tsx
// BAD: Input feels laggy
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <input
      value={deferredQuery}  // WRONG: Input controlled by deferred value
      onChange={e => setQuery(e.target.value)}
    />
  );
}

// GOOD: Input uses current value, results use deferred
function Search() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  return (
    <>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      <Results query={deferredQuery} />
    </>
  );
}
```

---

## Performance Profiling Checklist

1. **Open React DevTools Profiler**
2. **Record a session** with the slow interaction
3. **Identify components** that take longest to render
4. **Check "Why did this render?"** in the flamegraph
5. **Apply optimizations** only where needed
6. **Re-profile** to verify improvement

### What to Look For

| Issue | Solution |
|-------|----------|
| Component re-renders with same props | `memo()` |
| Callback prop causes re-render | `useCallback` |
| Object/array prop causes re-render | `useMemo` |
| Expensive calculation on every render | `useMemo` |
| UI blocks during state update | `useTransition` |
| Expensive child slows typing | `useDeferredValue` |
