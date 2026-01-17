---
name: testing-patterns
description: Testing patterns for React/TypeScript applications with Vitest, React Testing Library, Playwright, and MSW v2. Covers unit tests, component tests, E2E tests, and API mocking.
version: "1.0.0"
lastUpdated: "2026-01-11"
frameworkVersions:
  vitest: "4.x"
  playwright: "1.50+"
  msw: "2.x"
  testing-library-react: "16.x"
---

# Testing Patterns

> **Updated 2026-01-11:** Vitest 4.x with Browser Mode, Playwright 1.50+ fixtures, MSW v2 syntax.

## Purpose

Comprehensive testing guide for React/TypeScript applications. Covers the full testing pyramid: unit tests (Vitest), component tests (React Testing Library), E2E tests (Playwright), and API mocking (MSW).

## When to Use This Skill

Automatically activates when working on:
- Writing unit or integration tests
- Testing React components
- E2E testing with Playwright
- Mocking API requests
- Setting up test configuration
- Test utilities and factories

---

## Quick Start

### Installation

```bash
# Vitest + React Testing Library
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event jsdom

# Playwright
npm install -D @playwright/test
npx playwright install

# MSW v2
npm install -D msw
```

### Project Structure

```
src/
├── __tests__/           # Unit tests
├── components/
│   └── Button/
│       ├── Button.tsx
│       └── Button.test.tsx  # Component tests colocated
tests/
├── e2e/                 # Playwright E2E tests
├── mocks/               # MSW handlers
│   ├── handlers.ts
│   └── server.ts
└── utils/               # Test utilities
    ├── render.tsx       # Custom render
    └── factories.ts     # Test data factories
```

---

## Vitest Configuration

### Basic Setup

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules', 'tests', '**/*.d.ts'],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
```

### Setup File

```typescript
// tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test"
  }
}
```

---

## React Testing Library

### Custom Render with Providers

```typescript
// tests/utils/render.tsx
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactElement, ReactNode } from 'react';

interface WrapperProps {
  children: ReactNode;
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function AllProviders({ children }: WrapperProps) {
  const queryClient = createTestQueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function customRender(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AllProviders, ...options });
}

export * from '@testing-library/react';
export { customRender as render };
```

### Query Priority

Use queries in this order of preference:

1. **getByRole** - Accessible, semantic queries (preferred)
2. **getByLabelText** - Form elements
3. **getByPlaceholderText** - Input placeholders
4. **getByText** - Non-interactive content
5. **getByTestId** - Last resort

```typescript
// Good - semantic query
const button = screen.getByRole('button', { name: /submit/i });

// Avoid - test ID unless necessary
const button = screen.getByTestId('submit-button');
```

### Query Variants

| Variant | No Match | 1 Match | >1 Match | Async |
|---------|----------|---------|----------|-------|
| `getBy` | throw | return | throw | No |
| `queryBy` | null | return | throw | No |
| `findBy` | throw | return | throw | Yes |

### User Events

```typescript
import { render, screen } from './utils/render';
import userEvent from '@testing-library/user-event';

describe('LoginForm', () => {
  it('should submit form with credentials', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });
});
```

### Testing Async Components

```typescript
import { render, screen, waitFor } from './utils/render';

describe('UserProfile', () => {
  it('should display user data after loading', async () => {
    render(<UserProfile userId="123" />);

    // Wait for loading to complete
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data to appear
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Or use findBy (combines getBy + waitFor)
    const userName = await screen.findByText('John Doe');
    expect(userName).toBeInTheDocument();
  });
});
```

See [component-testing.md](resources/component-testing.md) for advanced patterns.

---

## Playwright E2E

### Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

### Page Object Model

```typescript
// tests/e2e/pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.submitButton = page.getByRole('button', { name: 'Sign in' });
    this.errorMessage = page.getByRole('alert');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
```

### Fixtures

```typescript
// tests/e2e/fixtures.ts
import { test as base } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';

type Fixtures = {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  authenticatedPage: Page;
};

export const test = base.extend<Fixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/e2e/.auth/user.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Auth State Reuse

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill('test@example.com');
  await page.getByLabel('Password').fill('password123');
  await page.getByRole('button', { name: 'Sign in' }).click();

  await page.waitForURL('/dashboard');
  await page.context().storageState({ path: authFile });
});
```

See [e2e-playwright.md](resources/e2e-playwright.md) for advanced patterns.

---

## MSW v2 Mocking

### Handler Setup

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/user', () => {
    return HttpResponse.json({
      id: '123',
      name: 'John Doe',
      email: 'john@example.com',
    });
  }),

  http.post('/api/login', async ({ request }) => {
    const body = await request.json();

    if (body.email === 'test@example.com') {
      return HttpResponse.json({ token: 'fake-token' });
    }

    return HttpResponse.json(
      { error: 'Invalid credentials' },
      { status: 401 }
    );
  }),

  http.get('/api/users/:id', ({ params }) => {
    return HttpResponse.json({ id: params.id, name: 'User ' + params.id });
  }),
];
```

### Server Setup

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

### Integration with Vitest

```typescript
// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Per-Test Handler Override

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('UserProfile', () => {
  it('should handle error state', async () => {
    // Override for this test only
    server.use(
      http.get('/api/user', () => {
        return HttpResponse.json(
          { error: 'Not found' },
          { status: 404 }
        );
      })
    );

    render(<UserProfile />);

    await screen.findByText(/user not found/i);
  });
});
```

See [mocking-msw.md](resources/mocking-msw.md) for advanced patterns.

---

## Test Data Factories

```typescript
// tests/utils/factories.ts
import { faker } from '@faker-js/faker';

export function createUser(overrides = {}) {
  return {
    id: faker.string.uuid(),
    name: faker.person.fullName(),
    email: faker.internet.email(),
    avatar: faker.image.avatar(),
    createdAt: faker.date.past().toISOString(),
    ...overrides,
  };
}

export function createPost(overrides = {}) {
  return {
    id: faker.string.uuid(),
    title: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(3),
    author: createUser(),
    publishedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

// Usage
const user = createUser({ name: 'Test User' });
const posts = Array.from({ length: 5 }, () => createPost({ author: user }));
```

---

## Common Patterns

### Testing Hooks

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('should increment counter', () => {
    const { result } = renderHook(() => useCounter(0));

    expect(result.current.count).toBe(0);

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

### Testing Error Boundaries

```typescript
describe('ErrorBoundary', () => {
  it('should catch and display errors', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    spy.mockRestore();
  });
});
```

---

## Gotchas & Real-World Warnings

### Tests Pass, Code Breaks

**MSW mocks diverge from reality.** Your mocks return `{ user: { id, name } }` but the real API returns `{ data: { user: { id, name, createdAt } } }`. Tests pass, production breaks.

```typescript
// DANGER: This mock looks fine but might not match real API
http.get('/api/user', () => HttpResponse.json({ id: '1', name: 'John' }))

// BETTER: Use actual API response snapshots or OpenAPI schemas
import { userResponseSchema } from '@/api/schemas';
```

**Timing issues hide bugs.** `waitFor` with short timeouts passes locally, fails in CI. Or worse: a race condition only appears under CI load.

```typescript
// FRAGILE: Works on your machine
await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument());

// SAFER: Explicit timeout, but you're just hiding the real problem
await waitFor(() => expect(screen.getByText('Done')).toBeInTheDocument(), { timeout: 5000 });

// BEST: Ask why the component is slow. Is there a loading state you should test?
```

### False Confidence

**High coverage ≠ high quality.** You can have 90% coverage testing that buttons render without testing they do anything useful.

**Happy path blindness.** These patterns show successful flows. Real apps need:
- What happens when the API returns 500?
- What if the user double-clicks?
- What if the network times out mid-request?
- What if localStorage is full?

**Component isolation hides integration bugs.** Your `<LoginForm>` tests pass but it breaks when wrapped in the actual `<AuthProvider>` with real routing.

### E2E Fragility

**Playwright tests rot fast.** A designer changes a button label, 47 E2E tests break. Page Object Model helps but isn't magic.

**Auth state sharing is fragile.** The `storageState` auth pattern works until:
- Session expires mid-test
- Parallel tests invalidate each other's sessions
- Cookie format changes

**Screenshot tests become noise.** Every font rendering difference, every animation frame, every timezone difference causes failures. Most teams disable them.

### What These Patterns Don't Tell You

1. **Test data cleanup** - Who deletes the test users your E2E suite creates in staging?
2. **Test database management** - Parallel tests hitting the same DB cause flaky failures
3. **Third-party service mocking** - What about Stripe webhooks? Auth0 callbacks?
4. **CI performance** - 500 tests × 3 browsers = 1500 tests = 45 minute CI pipeline
5. **Debugging failures** - Playwright traces are great until you have 200 of them to review

---

## Anti-Patterns to Avoid

- Testing implementation details (internal state, private methods)
- Using `waitFor` with `getBy` queries (use `findBy` instead)
- Testing library code (React, third-party packages)
- Snapshot testing for dynamic content
- Not cleaning up after tests
- Hardcoded test data instead of factories
- Tight coupling between tests

---

## Navigation Guide

| Need to... | Read this |
|------------|-----------|
| Configure Vitest | [vitest-config.md](resources/vitest-config.md) |
| Test React components | [component-testing.md](resources/component-testing.md) |
| Write E2E tests | [e2e-playwright.md](resources/e2e-playwright.md) |
| Mock API requests | [mocking-msw.md](resources/mocking-msw.md) |
| Create test utilities | [test-utilities.md](resources/test-utilities.md) |

---

## Resource Files

### [vitest-config.md](resources/vitest-config.md)
Workspace setup, coverage configuration, browser mode, in-source testing

### [component-testing.md](resources/component-testing.md)
React Testing Library patterns, async testing, form testing, accessibility

### [e2e-playwright.md](resources/e2e-playwright.md)
Page Object Model, fixtures, visual regression, CI/CD integration

### [mocking-msw.md](resources/mocking-msw.md)
MSW v2 handlers, network scenarios, GraphQL mocking, WebSocket mocking

### [test-utilities.md](resources/test-utilities.md)
Custom render, test factories, test helpers, common utilities

---

## External Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)

---

**Skill Status**: COMPLETE
**Line Count**: < 500
**Progressive Disclosure**: 5 resource files
