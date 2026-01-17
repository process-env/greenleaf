# Playwright E2E Testing

## Page Object Model

```typescript
// tests/e2e/pages/BasePage.ts
import { Page, Locator } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  readonly header: Locator;
  readonly footer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header');
    this.footer = page.locator('footer');
  }

  async waitForLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }
}

// tests/e2e/pages/DashboardPage.ts
import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly statsCards: Locator;
  readonly activityFeed: Locator;
  readonly settingsButton: Locator;

  constructor(page: Page) {
    super(page);
    this.welcomeMessage = page.getByRole('heading', { level: 1 });
    this.statsCards = page.locator('[data-testid="stat-card"]');
    this.activityFeed = page.getByRole('list', { name: 'Activity' });
    this.settingsButton = page.getByRole('button', { name: 'Settings' });
  }

  async goto() {
    await this.page.goto('/dashboard');
    await this.waitForLoad();
  }

  async getStatValue(statName: string): Promise<string> {
    const card = this.statsCards.filter({ hasText: statName });
    return card.locator('.stat-value').textContent() ?? '';
  }

  async expectWelcomeMessage(name: string) {
    await expect(this.welcomeMessage).toContainText(`Welcome, ${name}`);
  }
}
```

## Fixtures

```typescript
// tests/e2e/fixtures/index.ts
import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ApiClient } from '../utils/ApiClient';

// Define fixture types
interface PageFixtures {
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  settingsPage: SettingsPage;
}

interface WorkerFixtures {
  apiClient: ApiClient;
}

// Extend base test with fixtures
export const test = base.extend<PageFixtures, WorkerFixtures>({
  // Page fixtures (created per test)
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  settingsPage: async ({ page }, use) => {
    const settingsPage = new SettingsPage(page);
    await use(settingsPage);
  },

  // Worker fixtures (shared across tests in worker)
  apiClient: [async ({}, use) => {
    const client = new ApiClient(process.env.API_URL!);
    await use(client);
  }, { scope: 'worker' }],
});

export { expect };
```

## Authentication Setup

```typescript
// tests/e2e/auth.setup.ts
import { test as setup, expect } from '@playwright/test';

const STORAGE_STATE = 'tests/e2e/.auth/user.json';
const ADMIN_STORAGE_STATE = 'tests/e2e/.auth/admin.json';

setup('authenticate as user', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_USER_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_USER_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/dashboard');
  await page.context().storageState({ path: STORAGE_STATE });
});

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(process.env.TEST_ADMIN_EMAIL!);
  await page.getByLabel('Password').fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in' }).click();

  await expect(page).toHaveURL('/admin/dashboard');
  await page.context().storageState({ path: ADMIN_STORAGE_STATE });
});
```

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  projects: [
    // Setup project
    { name: 'setup', testMatch: /.*\.setup\.ts/ },

    // User tests
    {
      name: 'user-tests',
      use: { storageState: 'tests/e2e/.auth/user.json' },
      dependencies: ['setup'],
    },

    // Admin tests
    {
      name: 'admin-tests',
      testMatch: '**/admin/**',
      use: { storageState: 'tests/e2e/.auth/admin.json' },
      dependencies: ['setup'],
    },
  ],
});
```

## Visual Regression Testing

```typescript
import { test, expect } from '../fixtures';

test.describe('Visual Regression', () => {
  test('dashboard should match snapshot', async ({ dashboardPage }) => {
    await dashboardPage.goto();

    // Full page screenshot
    await expect(dashboardPage.page).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  test('card component should match snapshot', async ({ page }) => {
    await page.goto('/components/card');

    // Element screenshot
    const card = page.locator('.card').first();
    await expect(card).toHaveScreenshot('card.png');
  });

  test('should handle responsive snapshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    await expect(page).toHaveScreenshot('dashboard-mobile.png');
  });
});
```

## API Testing with Playwright

```typescript
import { test, expect } from '@playwright/test';

test.describe('API Tests', () => {
  test('should create user via API', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    });

    expect(response.ok()).toBeTruthy();

    const user = await response.json();
    expect(user).toHaveProperty('id');
    expect(user.name).toBe('Test User');
  });

  test('should handle API errors', async ({ request }) => {
    const response = await request.get('/api/users/nonexistent');

    expect(response.status()).toBe(404);
  });
});
```

## Network Interception

```typescript
import { test, expect } from '../fixtures';

test('should mock API response', async ({ page }) => {
  // Mock API route
  await page.route('/api/users', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: '1', name: 'Mocked User' },
      ]),
    });
  });

  await page.goto('/users');
  await expect(page.getByText('Mocked User')).toBeVisible();
});

test('should simulate network error', async ({ page }) => {
  await page.route('/api/data', (route) => {
    route.abort('failed');
  });

  await page.goto('/data');
  await expect(page.getByText(/failed to load/i)).toBeVisible();
});

test('should delay response', async ({ page }) => {
  await page.route('/api/slow', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await route.continue();
  });

  await page.goto('/slow-page');
  await expect(page.getByText(/loading/i)).toBeVisible();
});
```

## File Upload/Download

```typescript
import { test, expect } from '../fixtures';
import path from 'path';

test('should upload file', async ({ page }) => {
  await page.goto('/upload');

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Upload' }).click();
  const fileChooser = await fileChooserPromise;

  await fileChooser.setFiles(path.join(__dirname, 'fixtures/test-file.pdf'));

  await expect(page.getByText('test-file.pdf')).toBeVisible();
});

test('should download file', async ({ page }) => {
  await page.goto('/downloads');

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Report' }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toBe('report.pdf');
  await download.saveAs(path.join(__dirname, 'downloads', download.suggestedFilename()));
});
```

## CI/CD Configuration

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

## Debugging Tips

```typescript
// Pause execution and open inspector
await page.pause();

// Slow down execution
test.use({ launchOptions: { slowMo: 100 } });

// Enable tracing
test.use({ trace: 'on' });

// Take screenshot on failure
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    await page.screenshot({
      path: `screenshots/${testInfo.title}.png`,
    });
  }
});
```
