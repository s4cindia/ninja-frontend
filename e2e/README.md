# E2E Testing Guide

## Prerequisites

- Node.js 20+
- Playwright browsers installed: `npx playwright install`

## Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Test user credentials (required for authenticated tests)
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpassword123

# Base URL (optional, defaults to http://localhost:5000)
PLAYWRIGHT_BASE_URL=http://localhost:5000

Running Tests

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/job-detail.e2e.ts

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run accessibility tests only
npm run test:a11y

# Run responsive tests only
npm run test:responsive

# Debug mode
npm run test:e2e:debug

Test Structure

- e2e/fixtures/test-base.ts - Authentication fixture
- e2e/job-detail.e2e.ts - Functional tests
- e2e/job-detail.a11y.ts - Accessibility tests (axe-core)
- e2e/job-detail.responsive.ts - Responsive design tests

CI/CD

Tests run automatically on PR via GitHub Actions. See .github/workflows/pr-checks.yml.

Test Data

Tests expect:
- A running backend at the configured URL
- At least one job in the database
- Valid test user credentials