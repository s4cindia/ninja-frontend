import { test as base, Page } from '@playwright/test';

const WCAG_MINIMUM_TOUCH_TARGET = 44;
const TOUCH_TARGET_RENDERING_TOLERANCE = 4;
const LOGIN_NAVIGATION_TIMEOUT = 10000; // 10 seconds for post-login redirect

export const MIN_TOUCH_TARGET_SIZE = WCAG_MINIMUM_TOUCH_TARGET - TOUCH_TARGET_RENDERING_TOLERANCE;

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
  
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: LOGIN_NAVIGATION_TIMEOUT });
  
  const errorMessage = page.locator('[role="alert"], .error-message, [data-testid="login-error"]');
  const errorCount = await errorMessage.count();
  if (errorCount > 0) {
    const errorText = await errorMessage.first().textContent();
    throw new Error(`Login failed: ${errorText}`);
  }
}

export const test = base.extend<{ authenticatedPage: Page }>({
  authenticatedPage: async ({ page }, use) => {
    await login(page);
    await use(page);
  },
});

export { expect } from '@playwright/test';
export { login };
