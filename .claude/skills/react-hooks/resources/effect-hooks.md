# Effect Hooks: useEffect, useLayoutEffect & useInsertionEffect

## Table of Contents

1. [useEffect Complete Reference](#useeffect-complete-reference)
2. [useLayoutEffect Reference](#uselayouteffect-reference)
3. [useInsertionEffect Reference](#useinsertioneffect-reference)
4. [Effect Timing Comparison](#effect-timing-comparison)
5. [Common Patterns](#common-patterns)
6. [Anti-Patterns](#anti-patterns)

---

## useEffect Complete Reference

### Signature

```tsx
useEffect(setup, dependencies?);

// With cleanup
useEffect(() => {
  // setup code
  return () => {
    // cleanup code
  };
}, [dep1, dep2]);
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `setup` | `() => void \| (() => void)` | Effect function, optionally returning cleanup |
| `dependencies` | `DependencyList?` | Array of reactive values to watch |

### Dependency Array Rules

```tsx
// Run on EVERY render (rarely needed)
useEffect(() => { /* ... */ });

// Run ONCE on mount (empty array)
useEffect(() => { /* ... */ }, []);

// Run when dependencies change
useEffect(() => { /* ... */ }, [a, b, c]);
```

### Cleanup Function

Cleanup runs:
1. Before the effect runs again (on dependency change)
2. When the component unmounts

```tsx
useEffect(() => {
  const subscription = source.subscribe(id);

  return () => {
    // This runs before next effect and on unmount
    subscription.unsubscribe();
  };
}, [id]);
```

### Effect Lifecycle

```
Component mounts
    ↓
Initial render completes
    ↓
Browser paints screen
    ↓
useEffect runs (setup)  ←─────────────┐
    ↓                                 │
Component re-renders (deps changed)   │
    ↓                                 │
Browser paints screen                 │
    ↓                                 │
Cleanup runs (from previous effect)   │
    ↓                                 │
useEffect runs (setup) ───────────────┘
    ↓
Component unmounts
    ↓
Final cleanup runs
```

---

## Data Fetching Patterns

### Basic Fetch

```tsx
useEffect(() => {
  fetch(`/api/users/${userId}`)
    .then(res => res.json())
    .then(data => setUser(data));
}, [userId]);
```

### With Loading & Error States

```tsx
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  setLoading(true);
  setError(null);

  fetch(`/api/users/${userId}`)
    .then(res => {
      if (!res.ok) throw new Error('Failed to fetch');
      return res.json();
    })
    .then(data => setData(data))
    .catch(err => setError(err))
    .finally(() => setLoading(false));
}, [userId]);
```

### Race Condition Prevention

```tsx
useEffect(() => {
  let cancelled = false;

  async function fetchData() {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();

    if (!cancelled) {
      setUser(data);
    }
  }

  fetchData();

  return () => {
    cancelled = true;
  };
}, [userId]);
```

### AbortController Pattern

```tsx
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/users/${userId}`, {
    signal: controller.signal
  })
    .then(res => res.json())
    .then(data => setUser(data))
    .catch(err => {
      if (err.name !== 'AbortError') {
        setError(err);
      }
    });

  return () => controller.abort();
}, [userId]);
```

---

## Subscription Patterns

### Event Listeners

```tsx
useEffect(() => {
  function handleResize() {
    setWindowSize({
      width: window.innerWidth,
      height: window.innerHeight
    });
  }

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### WebSocket

```tsx
useEffect(() => {
  const ws = new WebSocket(url);

  ws.onmessage = (event) => {
    setMessages(prev => [...prev, JSON.parse(event.data)]);
  };

  ws.onerror = (error) => {
    setError(error);
  };

  return () => {
    ws.close();
  };
}, [url]);
```

### Intersection Observer

```tsx
useEffect(() => {
  const observer = new IntersectionObserver(
    ([entry]) => setIsVisible(entry.isIntersecting),
    { threshold: 0.1 }
  );

  if (ref.current) {
    observer.observe(ref.current);
  }

  return () => observer.disconnect();
}, []);
```

### Media Query

```tsx
useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  function handleChange(e: MediaQueryListEvent) {
    setIsDark(e.matches);
  }

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}, []);
```

---

## Timer Patterns

### Interval

```tsx
useEffect(() => {
  const id = setInterval(() => {
    setCount(c => c + 1);  // Functional update to avoid stale closure
  }, 1000);

  return () => clearInterval(id);
}, []);
```

### Timeout

```tsx
useEffect(() => {
  const id = setTimeout(() => {
    setShowMessage(false);
  }, 3000);

  return () => clearTimeout(id);
}, []);
```

### Debounced Effect

```tsx
useEffect(() => {
  const id = setTimeout(() => {
    fetchSearchResults(query);
  }, 300);

  return () => clearTimeout(id);
}, [query]);
```

---

## useLayoutEffect Reference

### When to Use

```
useEffect (99% of cases)     useLayoutEffect (rare)
─────────────────────────    ─────────────────────
After paint                  Before paint
Non-blocking                 Blocking
Data fetching                DOM measurements
Subscriptions                Scroll position
Event listeners              Tooltip positioning
Analytics                    Preventing flicker
```

### Signature

```tsx
useLayoutEffect(setup, dependencies?);
```

### DOM Measurement Example

```tsx
function Tooltip({ children, targetRef }) {
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef(null);

  useLayoutEffect(() => {
    if (targetRef.current && tooltipRef.current) {
      const targetRect = targetRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      // Position tooltip above target, centered
      setTooltipPos({
        x: targetRect.left + (targetRect.width - tooltipRect.width) / 2,
        y: targetRect.top - tooltipRect.height - 8
      });
    }
  }, [targetRef]);

  return (
    <div
      ref={tooltipRef}
      style={{
        position: 'fixed',
        left: tooltipPos.x,
        top: tooltipPos.y
      }}
    >
      {children}
    </div>
  );
}
```

### Scroll Position Restoration

```tsx
useLayoutEffect(() => {
  if (savedScrollPosition) {
    window.scrollTo(0, savedScrollPosition);
  }
}, [savedScrollPosition]);
```

### Prevent Flash of Incorrect Content

```tsx
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  // Synchronously apply theme before paint
  useLayoutEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved);
      setTheme(saved);
    }
  }, []);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}
```

---

## useInsertionEffect Reference

### When to Use

**Only for CSS-in-JS libraries.** Regular application code should never use this.

```tsx
// ONLY for library authors implementing CSS-in-JS
useInsertionEffect(() => {
  // Inject <style> tags before any DOM mutations
  const style = document.createElement('style');
  style.textContent = cssRules;
  document.head.appendChild(style);

  return () => style.remove();
}, [cssRules]);
```

---

## Effect Timing Comparison

```
User interaction
       ↓
State update triggered
       ↓
React renders (virtual DOM)
       ↓
React commits (updates real DOM)
       ↓
┌──────┴──────┐
│             │
▼             ▼
useInsertionEffect    (before DOM mutations - CSS-in-JS only)
       ↓
useLayoutEffect       (after DOM mutations, before paint)
       ↓
Browser paints screen
       ↓
useEffect             (after paint)
```

---

## Anti-Patterns

### 1. Unnecessary Effects

```tsx
// BAD: Derived state in effect
useEffect(() => {
  setFilteredList(items.filter(i => i.active));
}, [items]);

// GOOD: Calculate during render
const filteredList = items.filter(i => i.active);
```

### 2. Event Handler Logic in Effect

```tsx
// BAD: Responding to event via effect
const [submitted, setSubmitted] = useState(false);
useEffect(() => {
  if (submitted) {
    submitForm(data);
    setSubmitted(false);
  }
}, [submitted, data]);

// GOOD: Handle in event handler
function handleSubmit() {
  submitForm(data);
}
```

### 3. Resetting State on Prop Change

```tsx
// BAD: Effect to reset state
useEffect(() => {
  setComment('');
}, [userId]);

// GOOD: Use key prop
<CommentForm key={userId} userId={userId} />
```

### 4. Missing Cleanup

```tsx
// BAD: Memory leak
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// GOOD: Always clean up
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

### 5. Infinite Loops

```tsx
// BAD: Object in deps creates new reference each render
useEffect(() => {
  fetchData(options);
}, [{ page, limit }]); // New object every render!

// GOOD: Use primitives
useEffect(() => {
  fetchData({ page, limit });
}, [page, limit]);

// Or memoize the object
const options = useMemo(() => ({ page, limit }), [page, limit]);
useEffect(() => {
  fetchData(options);
}, [options]);
```

### 6. Effect Chains

```tsx
// BAD: Cascading effects
useEffect(() => { setA(compute(x)); }, [x]);
useEffect(() => { setB(compute(a)); }, [a]);
useEffect(() => { setC(compute(b)); }, [b]);

// GOOD: Single computation
useEffect(() => {
  const a = compute(x);
  const b = compute(a);
  const c = compute(b);
  setState({ a, b, c });
}, [x]);

// Or better: compute during render
const a = compute(x);
const b = compute(a);
const c = compute(b);
```

---

## Strict Mode Behavior

In development with Strict Mode, React:
1. Renders component twice
2. Runs effects twice (setup → cleanup → setup)

This helps catch:
- Missing cleanup functions
- Effects with stale closures
- Race conditions

```tsx
// This will break in Strict Mode if cleanup is missing
useEffect(() => {
  connection.connect();
  // Missing: return () => connection.disconnect();
}, []);
```

---

## Server-Side Rendering

Effects don't run on the server. Handle SSR:

```tsx
// Check for browser environment
useEffect(() => {
  // Safe: only runs in browser
  localStorage.setItem('key', value);
}, [value]);

// For layout effects, consider alternatives
// BAD: useLayoutEffect warning on server
useLayoutEffect(() => { /* ... */ }, []);

// Options:
// 1. Use useEffect if possible
// 2. Use useIsomorphicLayoutEffect from a library
// 3. Render conditionally
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <Fallback />;
```
