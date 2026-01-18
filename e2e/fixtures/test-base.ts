import { test as base, Page, expect } from '@playwright/test';

const WCAG_MINIMUM_TOUCH_TARGET = 44;
const TOUCH_TARGET_TOLERANCE = 4;

export const MIN_TOUCH_TARGET_SIZE = WCAG_MINIMUM_TOUCH_TARGET - TOUCH_TARGET_TOLERANCE;

const email = process.env.TEST_USER_EMAIL;
const password = process.env.TEST_USER_PASSWORD;

if (!email || !password) {
  throw new Error(
    'TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set. ' +
    'See e2e/README.md for setup instructions.'
  );
}

const TEST_USER = { email, password };

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  
  await page.fill('[data-testid="email-input"]', TEST_USER.email);
  await page.fill('[data-testid="password-input"]', TEST_USER.password);
  await page.click('[data-testid="login-button"]');
  
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 10000 });
  
  const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="login-error"]');
  await expect(errorMessage).toHaveCount(0);
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { login };
