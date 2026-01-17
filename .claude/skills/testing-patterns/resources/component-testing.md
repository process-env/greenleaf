# Component Testing with React Testing Library

## Custom Render Function

```typescript
// tests/utils/render.tsx
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ReactElement, ReactNode } from 'react';

interface ExtendedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  queryClient?: QueryClient;
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // Suppress error logs in tests
    },
  });
}

interface WrapperProps {
  children: ReactNode;
}

export function createWrapper(options: ExtendedRenderOptions = {}) {
  const queryClient = options.queryClient ?? createTestQueryClient();

  return function Wrapper({ children }: WrapperProps) {
    return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ThemeProvider>{children}</ThemeProvider>
        </BrowserRouter>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: ExtendedRenderOptions = {}
): RenderResult & { queryClient: QueryClient } {
  const queryClient = options.queryClient ?? createTestQueryClient();

  if (options.route) {
    window.history.pushState({}, 'Test page', options.route);
  }

  const result = render(ui, {
    wrapper: createWrapper({ ...options, queryClient }),
    ...options,
  });

  return { ...result, queryClient };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
```

## Form Testing

```typescript
import { render, screen } from '@tests/utils/render';
import userEvent from '@testing-library/user-event';
import { ContactForm } from './ContactForm';

describe('ContactForm', () => {
  it('should validate required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ContactForm onSubmit={onSubmit} />);

    // Submit empty form
    await user.click(screen.getByRole('button', { name: /submit/i }));

    // Check validation messages
    expect(await screen.findByText(/name is required/i)).toBeInTheDocument();
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('should submit valid form data', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(<ContactForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'John Doe');
    await user.type(screen.getByLabelText(/email/i), 'john@example.com');
    await user.selectOptions(screen.getByLabelText(/subject/i), 'support');
    await user.type(screen.getByLabelText(/message/i), 'Hello!');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: 'John Doe',
      email: 'john@example.com',
      subject: 'support',
      message: 'Hello!',
    });
  });
});
```

## Async State Testing

```typescript
import { render, screen, waitFor, waitForElementToBeRemoved } from '@tests/utils/render';

describe('UserList', () => {
  it('should display loading then users', async () => {
    render(<UserList />);

    // Verify loading state
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Wait for loading to disappear
    await waitForElementToBeRemoved(() => screen.queryByRole('progressbar'));

    // Verify data loaded
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should handle empty state', async () => {
    // Override MSW handler for this test
    server.use(
      http.get('/api/users', () => HttpResponse.json([]))
    );

    render(<UserList />);

    await waitFor(() => {
      expect(screen.getByText(/no users found/i)).toBeInTheDocument();
    });
  });
});
```

## Testing with React Query

```typescript
import { render, screen, waitFor } from '@tests/utils/render';
import { QueryClient } from '@tanstack/react-query';

describe('UserProfile', () => {
  it('should prefetch and display user data', async () => {
    const queryClient = new QueryClient();

    // Prefetch data
    await queryClient.prefetchQuery({
      queryKey: ['user', '123'],
      queryFn: () => ({ id: '123', name: 'John Doe' }),
    });

    render(<UserProfile userId="123" />, { queryClient });

    // Data should be immediately available
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should handle mutation success', async () => {
    const user = userEvent.setup();

    render(<UserProfile userId="123" />);

    await user.click(screen.getByRole('button', { name: /update/i }));

    await waitFor(() => {
      expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
    });
  });
});
```

## Modal/Dialog Testing

```typescript
import { render, screen, within } from '@tests/utils/render';

describe('ConfirmDialog', () => {
  it('should open and close dialog', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();

    render(<ConfirmDialog onConfirm={onConfirm} />);

    // Open dialog
    await user.click(screen.getByRole('button', { name: /delete/i }));

    // Find dialog
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();

    // Query within dialog
    const confirmButton = within(dialog).getByRole('button', { name: /confirm/i });
    await user.click(confirmButton);

    expect(onConfirm).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

## Accessibility Testing

```typescript
import { render } from '@tests/utils/render';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Button', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

## Snapshot Testing

```typescript
import { render } from '@tests/utils/render';

describe('Card', () => {
  it('should match snapshot', () => {
    const { container } = render(
      <Card title="Test" description="Description">
        Content
      </Card>
    );
    expect(container).toMatchSnapshot();
  });

  // Inline snapshot for small components
  it('should match inline snapshot', () => {
    const { container } = render(<Badge>New</Badge>);
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<span class="badge">New</span>"`
    );
  });
});
```

## Portal Testing

```typescript
describe('Tooltip', () => {
  it('should render in portal', async () => {
    const user = userEvent.setup();

    render(
      <Tooltip content="Help text">
        <button>Hover me</button>
      </Tooltip>
    );

    await user.hover(screen.getByRole('button'));

    // Tooltip renders in portal at document.body
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
  });
});
```

## Context Testing

```typescript
import { render, screen } from '@tests/utils/render';
import { useTheme, ThemeProvider } from '@/contexts/ThemeContext';

function TestComponent() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

describe('ThemeContext', () => {
  it('should toggle theme', async () => {
    const user = userEvent.setup();

    render(<TestComponent />, {
      wrapper: ({ children }) => (
        <ThemeProvider defaultTheme="light">{children}</ThemeProvider>
      ),
    });

    expect(screen.getByTestId('theme')).toHaveTextContent('light');

    await user.click(screen.getByRole('button', { name: /toggle/i }));

    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });
});
```
