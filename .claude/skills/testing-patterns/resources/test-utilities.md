# Test Utilities

## Test Data Factories

```typescript
// tests/utils/factories.ts
import { faker } from '@faker-js/faker';

// Base factory with overrides
function createFactory<T>(generator: () => T) {
  return (overrides: Partial<T> = {}): T => ({
    ...generator(),
    ...overrides,
  });
}

// User factory
export const createUser = createFactory(() => ({
  id: faker.string.uuid(),
  name: faker.person.fullName(),
  email: faker.internet.email(),
  avatar: faker.image.avatar(),
  role: faker.helpers.arrayElement(['user', 'admin', 'moderator']),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
}));

// Post factory
export const createPost = createFactory(() => ({
  id: faker.string.uuid(),
  title: faker.lorem.sentence(),
  slug: faker.lorem.slug(),
  content: faker.lorem.paragraphs(3),
  excerpt: faker.lorem.paragraph(),
  author: createUser(),
  tags: faker.helpers.arrayElements(['react', 'typescript', 'testing', 'nodejs'], 2),
  publishedAt: faker.date.recent().toISOString(),
  views: faker.number.int({ min: 0, max: 10000 }),
}));

// Comment factory
export const createComment = createFactory(() => ({
  id: faker.string.uuid(),
  content: faker.lorem.sentence(),
  author: createUser(),
  postId: faker.string.uuid(),
  createdAt: faker.date.recent().toISOString(),
}));

// List factory helper
export function createList<T>(factory: (overrides?: Partial<T>) => T, count: number): T[] {
  return Array.from({ length: count }, () => factory());
}

// Usage
const users = createList(createUser, 5);
const postsWithAuthor = createList(() => createPost({ author: users[0] }), 3);
```

## Seeded Random Data

```typescript
// tests/utils/seeded-factories.ts
import { faker } from '@faker-js/faker';

export function createSeededUser(seed: number) {
  faker.seed(seed);
  return createUser();
}

// Consistent data across test runs
describe('UserCard', () => {
  it('should display user info', () => {
    const user = createSeededUser(123); // Always same data
    render(<UserCard user={user} />);
    // Assertions against predictable data
  });
});
```

## Custom Matchers

```typescript
// tests/utils/matchers.ts
import { expect } from 'vitest';

expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be within range ${floor} - ${ceiling}`
          : `expected ${received} to be within range ${floor} - ${ceiling}`,
    };
  },

  toHaveBeenCalledWithMatch(received: jest.Mock, expected: Record<string, unknown>) {
    const calls = received.mock.calls;
    const pass = calls.some((call) =>
      Object.entries(expected).every(([key, value]) =>
        call[0]?.[key] === value
      )
    );
    return {
      pass,
      message: () =>
        pass
          ? `expected not to be called with matching ${JSON.stringify(expected)}`
          : `expected to be called with matching ${JSON.stringify(expected)}`,
    };
  },
});

// Type declarations
declare module 'vitest' {
  interface Assertion<T> {
    toBeWithinRange(floor: number, ceiling: number): T;
    toHaveBeenCalledWithMatch(expected: Record<string, unknown>): T;
  }
}
```

## Test Helpers

```typescript
// tests/utils/helpers.ts

// Wait for condition
export async function waitForCondition(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!(await condition())) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

// Mock date
export function mockDate(date: Date | string) {
  const mockDate = new Date(date);
  vi.useFakeTimers();
  vi.setSystemTime(mockDate);

  return () => {
    vi.useRealTimers();
  };
}

// Usage
describe('DateDisplay', () => {
  it('should show relative time', () => {
    const restore = mockDate('2024-01-15T10:00:00Z');

    render(<DateDisplay date="2024-01-14T10:00:00Z" />);
    expect(screen.getByText('1 day ago')).toBeInTheDocument();

    restore();
  });
});
```

## Mock Implementations

```typescript
// tests/utils/mocks.ts

// Mock localStorage
export function mockLocalStorage() {
  const store: Record<string, string> = {};

  const mock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };

  Object.defineProperty(window, 'localStorage', { value: mock });

  return mock;
}

// Mock IntersectionObserver
export function mockIntersectionObserver() {
  const observers: IntersectionObserver[] = [];

  const MockObserver = vi.fn((callback: IntersectionObserverCallback) => {
    const observer = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      root: null,
      rootMargin: '',
      thresholds: [],
      takeRecords: vi.fn(() => []),
    };
    observers.push(observer as unknown as IntersectionObserver);
    return observer;
  });

  window.IntersectionObserver = MockObserver as unknown as typeof IntersectionObserver;

  return {
    triggerIntersection(isIntersecting: boolean) {
      observers.forEach((observer) => {
        const callback = MockObserver.mock.calls[0]?.[0];
        callback?.(
          [{ isIntersecting, target: document.body } as IntersectionObserverEntry],
          observer
        );
      });
    },
  };
}

// Mock fetch
export function mockFetch(responses: Record<string, unknown>) {
  return vi.fn((url: string) =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve(responses[url]),
    } as Response)
  );
}
```

## Test Context

```typescript
// tests/utils/test-context.ts
import { QueryClient } from '@tanstack/react-query';

interface TestContext {
  queryClient: QueryClient;
  user: ReturnType<typeof createUser>;
  cleanup: () => void;
}

export function createTestContext(): TestContext {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const user = createUser();

  return {
    queryClient,
    user,
    cleanup: () => {
      queryClient.clear();
    },
  };
}

// Usage
describe('Dashboard', () => {
  let ctx: TestContext;

  beforeEach(() => {
    ctx = createTestContext();
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('should show user name', () => {
    render(<Dashboard />, { queryClient: ctx.queryClient });
    // ...
  });
});
```

## Assertion Helpers

```typescript
// tests/utils/assertions.ts
import { screen, within } from '@testing-library/react';

export async function expectTableToHaveRows(count: number) {
  const table = screen.getByRole('table');
  const rows = within(table).getAllByRole('row');
  // Subtract 1 for header row
  expect(rows.length - 1).toBe(count);
}

export async function expectFormFieldError(fieldLabel: string, errorMessage: string) {
  const field = screen.getByLabelText(fieldLabel);
  const errorId = field.getAttribute('aria-describedby');
  if (errorId) {
    const error = document.getElementById(errorId);
    expect(error).toHaveTextContent(errorMessage);
  }
}

export async function expectToastMessage(message: string) {
  const toast = await screen.findByRole('alert');
  expect(toast).toHaveTextContent(message);
}
```

## Debug Utilities

```typescript
// tests/utils/debug.ts
import { screen, prettyDOM } from '@testing-library/react';

export function debugElement(element: HTMLElement) {
  console.log(prettyDOM(element, 10000));
}

export function debugScreen() {
  screen.debug(undefined, 10000);
}

export function logAccessibleRoles() {
  const roles = screen.getAllByRole(/./);
  roles.forEach((el) => {
    console.log(`${el.getAttribute('role') ?? 'implicit'}: ${el.textContent}`);
  });
}
```
