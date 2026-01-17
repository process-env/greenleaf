# Vitest Configuration

## Workspace Setup

```typescript
// vitest.workspace.ts
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    extends: './vitest.config.ts',
    test: {
      name: 'unit',
      include: ['src/**/*.test.ts'],
      environment: 'node',
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'components',
      include: ['src/**/*.test.tsx'],
      environment: 'jsdom',
    },
  },
  {
    extends: './vitest.config.ts',
    test: {
      name: 'browser',
      include: ['src/**/*.browser.test.ts'],
      browser: {
        enabled: true,
        name: 'chromium',
        provider: 'playwright',
      },
    },
  },
]);
```

## Coverage Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules',
        'tests',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/**',
        '**/__mocks__/**',
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        // Per-file thresholds
        perFile: true,
        // Fail if coverage decreases
        autoUpdate: true,
      },
    },
  },
});
```

## In-Source Testing

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

// In-source test block (stripped in production)
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe('add', () => {
    it('should add two numbers', () => {
      expect(add(1, 2)).toBe(3);
    });
  });
}
```

Enable in config:

```typescript
// vitest.config.ts
export default defineConfig({
  define: {
    'import.meta.vitest': 'undefined',
  },
  test: {
    includeSource: ['src/**/*.ts'],
  },
});
```

## Browser Mode

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    browser: {
      enabled: true,
      name: 'chromium',
      provider: 'playwright',
      headless: true,
      screenshotFailures: true,
    },
  },
});
```

## Path Aliases

```typescript
// vitest.config.ts
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
    },
  },
});
```

## TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

## Environment Variables

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      API_URL: 'http://localhost:3000',
    },
    // Or load from .env.test
    environmentMatchGlobs: [
      ['**/*.test.tsx', 'jsdom'],
      ['**/*.test.ts', 'node'],
    ],
  },
});
```

## Watch Mode Options

```typescript
export default defineConfig({
  test: {
    watch: true,
    watchExclude: ['node_modules', 'dist', '.git'],
    forceRerunTriggers: ['**/vitest.config.*/**', '**/vite.config.*/**'],
  },
});
```

## Reporter Configuration

```typescript
export default defineConfig({
  test: {
    reporters: ['verbose', 'html', 'junit'],
    outputFile: {
      junit: './test-results/junit.xml',
      html: './test-results/index.html',
    },
  },
});
```

## Parallel Execution

```typescript
export default defineConfig({
  test: {
    pool: 'threads', // 'threads' | 'forks' | 'vmThreads'
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },
    // Isolate tests by file
    isolate: true,
    // Run tests sequentially in a file
    sequence: {
      hooks: 'list',
    },
  },
});
```

## Global Setup/Teardown

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});

// tests/global-setup.ts
export async function setup() {
  // Run once before all tests
  console.log('Starting test database...');
}

export async function teardown() {
  // Run once after all tests
  console.log('Stopping test database...');
}
```
