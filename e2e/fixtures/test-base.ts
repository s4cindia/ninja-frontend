import { test as base, expect } from '@playwright/test';

/**
 * Extended Playwright test with authentication fixture
 * Use this for tests that require logged-in user
 */

// Test user credentials (update for your test environment)
const TEST_USER = {
  email: 'test@example.com',
  password: 'password123',
};

// Extended test with authenticated page
export const test = base.extend<{ authenticatedPage: typeof base }>({
  authenticatedPage: async ({ page }, use) => {
    // Navigate to login
    await page.goto('/login');

    // Fill login form
    await page.fill('[name="email"], [type="email"], #email', TEST_USER.email);
    await page.fill('[name="password"], [type="password"], #password', TEST_USER.password);

    // Submit login
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 10000 });

    // Use the authenticated page
    await use(page);
  },
});

// Re-export expect for convenience
export { expect };

// Helper: Login function for beforeEach hooks
export async function login(page: typeof base) {
  await page.goto('/login');
  await page.fill('[name="email"], [type="email"], #email', TEST_USER.email);
  await page.fill('[name="password"], [type="password"], #password', TEST_USER.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|jobs)/, { timeout: 10000 });
}
