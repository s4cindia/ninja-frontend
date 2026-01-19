import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Jobs Page E2E Testing
 * Ninja Platform - Frontend
 *
 * Test files:
 * - e2e/job-detail.e2e.ts (E2E tests)
 * - e2e/job-detail.a11y.ts (Accessibility tests)
 * - e2e/job-detail.responsive.ts (Responsive tests)
 */

export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail build on CI if test.only is left in code
  forbidOnly: !!process.env.CI,

  // Retry failed tests (2 times in CI, 0 locally)
  retries: process.env.CI ? 2 : 0,

  // Two workers in CI for faster execution
  workers: process.env.CI ? 2 : undefined,

  // Test timeout (30 seconds)
  timeout: 30000,

  // Expect timeout (5 seconds)
  expect: {
    timeout: 5000,
  },

  // Reporters
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5000',

    // Capture trace on first retry
    trace: 'on-first-retry',

    // Screenshot on failure only
    screenshot: 'only-on-failure',

    // Video on failure only
    video: 'retain-on-failure',

    // Viewport
    viewport: { width: 1280, height: 720 },
  },

  // Test projects
  projects: [
    // E2E Tests - Cross Browser
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.e2e\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testMatch: /.*\.e2e\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testMatch: /.*\.e2e\.ts/,
    },

    // Responsive Tests - Mobile & Tablet
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      testMatch: /.*\.responsive\.ts/,
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      testMatch: /.*\.responsive\.ts/,
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] },
      testMatch: /.*\.responsive\.ts/,
    },

    // Accessibility Tests
    {
      name: 'accessibility',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /.*\.a11y\.ts/,
    },
  ],

  // Local dev server (optional - for running tests without manual server start)
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5000',
    reuseExistingServer: !process.env.CI,
    timeout: 60000, // 60 seconds should be sufficient
  },
});