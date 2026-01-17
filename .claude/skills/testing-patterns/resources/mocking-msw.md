# MSW v2 Mocking Patterns

## Handler Types

### REST Handlers

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse, delay } from 'msw';

export const handlers = [
  // GET request
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: '1', name: 'John Doe' },
      { id: '2', name: 'Jane Smith' },
    ]);
  }),

  // GET with params
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({ id, name: `User ${id}` });
  }),

  // POST request
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: crypto.randomUUID(), ...body },
      { status: 201 }
    );
  }),

  // PATCH request
  http.patch('/api/users/:id', async ({ params, request }) => {
    const { id } = params;
    const updates = await request.json();
    return HttpResponse.json({ id, ...updates });
  }),

  // DELETE request
  http.delete('/api/users/:id', () => {
    return new HttpResponse(null, { status: 204 });
  }),
];
```

### Query Parameters

```typescript
http.get('/api/search', ({ request }) => {
  const url = new URL(request.url);
  const query = url.searchParams.get('q');
  const page = url.searchParams.get('page') ?? '1';
  const limit = url.searchParams.get('limit') ?? '10';

  return HttpResponse.json({
    query,
    page: parseInt(page),
    limit: parseInt(limit),
    results: [],
  });
});
```

### Request Headers

```typescript
http.get('/api/protected', ({ request }) => {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return HttpResponse.json({ data: 'protected data' });
});
```

### Form Data

```typescript
http.post('/api/upload', async ({ request }) => {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const name = formData.get('name') as string;

  return HttpResponse.json({
    filename: file.name,
    size: file.size,
    name,
  });
});
```

## Server Setup

### Node.js (Vitest)

```typescript
// tests/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

// tests/setup.ts
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'error', // Fail on unhandled requests
  });
});

afterEach(() => {
  server.resetHandlers(); // Reset to default handlers
});

afterAll(() => {
  server.close();
});
```

### Browser (Playwright/Cypress)

```typescript
// tests/mocks/browser.ts
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start in your app's entry point
if (process.env.NODE_ENV === 'development') {
  const { worker } = await import('./mocks/browser');
  await worker.start({
    onUnhandledRequest: 'bypass',
  });
}
```

## Network Scenarios

### Delayed Response

```typescript
http.get('/api/slow', async () => {
  await delay(3000); // 3 second delay
  return HttpResponse.json({ data: 'slow response' });
});

// Random delay
http.get('/api/variable', async () => {
  await delay('real'); // Random realistic delay
  return HttpResponse.json({ data: 'response' });
});
```

### Error Responses

```typescript
// 404 Not Found
http.get('/api/users/:id', ({ params }) => {
  if (params.id === 'nonexistent') {
    return HttpResponse.json(
      { error: 'User not found' },
      { status: 404 }
    );
  }
  return HttpResponse.json({ id: params.id, name: 'User' });
});

// 500 Server Error
http.get('/api/error', () => {
  return HttpResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
});

// Network Error
http.get('/api/network-error', () => {
  return HttpResponse.error();
});
```

### Conditional Responses

```typescript
let callCount = 0;

http.get('/api/flaky', () => {
  callCount++;

  // Fail first 2 requests, succeed after
  if (callCount <= 2) {
    return HttpResponse.json(
      { error: 'Service unavailable' },
      { status: 503 }
    );
  }

  return HttpResponse.json({ data: 'success' });
});
```

## Per-Test Overrides

```typescript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

describe('UserProfile', () => {
  it('should handle loading state', async () => {
    // Delay for this test only
    server.use(
      http.get('/api/user', async () => {
        await delay(1000);
        return HttpResponse.json({ name: 'John' });
      })
    );

    render(<UserProfile />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    // Error for this test only
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

## GraphQL Handlers

```typescript
import { graphql, HttpResponse } from 'msw';

export const graphqlHandlers = [
  // Query
  graphql.query('GetUser', ({ variables }) => {
    const { id } = variables;
    return HttpResponse.json({
      data: {
        user: { id, name: 'John Doe', email: 'john@example.com' },
      },
    });
  }),

  // Mutation
  graphql.mutation('CreateUser', ({ variables }) => {
    const { input } = variables;
    return HttpResponse.json({
      data: {
        createUser: {
          id: crypto.randomUUID(),
          ...input,
        },
      },
    });
  }),

  // Error
  graphql.query('GetSecret', () => {
    return HttpResponse.json({
      errors: [{ message: 'Unauthorized' }],
    });
  }),
];
```

## Handler Composition

```typescript
// tests/mocks/factories.ts
import { http, HttpResponse, delay } from 'msw';

export function createUserHandlers(users: User[]) {
  return [
    http.get('/api/users', () => HttpResponse.json(users)),
    http.get('/api/users/:id', ({ params }) => {
      const user = users.find((u) => u.id === params.id);
      if (!user) {
        return HttpResponse.json({ error: 'Not found' }, { status: 404 });
      }
      return HttpResponse.json(user);
    }),
  ];
}

export function createAuthHandlers(isAuthenticated: boolean) {
  return [
    http.get('/api/me', () => {
      if (!isAuthenticated) {
        return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      return HttpResponse.json({ id: '1', name: 'Current User' });
    }),
  ];
}

// Usage in tests
server.use(
  ...createUserHandlers([{ id: '1', name: 'Test User' }]),
  ...createAuthHandlers(true)
);
```

## Passthrough Requests

```typescript
import { passthrough } from 'msw';

export const handlers = [
  // Mock this endpoint
  http.get('/api/users', () => HttpResponse.json([])),

  // Let this one through to the real server
  http.get('/api/health', () => passthrough()),
];
```

## Response Cookies

```typescript
http.post('/api/login', () => {
  return HttpResponse.json(
    { success: true },
    {
      headers: {
        'Set-Cookie': 'session=abc123; HttpOnly; Secure',
      },
    }
  );
});
```
