# E2E Testing Guide

## Prerequisites

- Node.js 20+
- Playwright browsers installed: `npx playwright install`

## Environment Variables

Create a `.env.test` file or set these environment variables:

```bash
# Test user credentials (required for authenticated tests)
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-secure-password-here

# Base URL (optional, defaults to http://localhost:5000)
PLAYWRIGHT_BASE_URL=http://localhost:5000
```

**IMPORTANT**: Never use real user credentials or commit `.env.test` to git!

## Security Guidelines

- Use dedicated test accounts with minimal permissions
- Never commit `.env.test` files to version control (already in `.gitignore`)
- Rotate test credentials regularly
- Test accounts should only exist in development/staging environments
- Do not use production credentials for testing

## Running Tests

```bash
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
```

## Test Structure

- `e2e/fixtures/test-base.ts` - Authentication fixture
- `e2e/job-detail.e2e.ts` - Functional tests
- `e2e/job-detail.a11y.ts` - Accessibility tests (axe-core)
- `e2e/job-detail.responsive.ts` - Responsive design tests

## CI/CD

Tests run automatically on PR via GitHub Actions. See `.github/workflows/pr-checks.yml`.

Required GitHub Secrets:
- `TEST_USER_EMAIL` - Test user email address
- `TEST_USER_PASSWORD` - Test user password

Required GitHub Variables:
- `PLAYWRIGHT_BASE_URL` - Base URL for the application (e.g., staging URL)

## Test Data

Tests expect:
- A running backend at the configured URL
- At least one job in the database
- Valid test user credentials
