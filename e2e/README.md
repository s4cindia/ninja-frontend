# E2E Testing Guide

## Prerequisites

- Node.js 20+
- Playwright browsers installed: `npx playwright install`

## Testing Modes

### Mock API Mode (Default for CI)

For testing without a backend, use mock API mode:

```bash
MOCK_API=true npm run test:e2e
```

This uses Playwright route interception to mock all API responses. No backend required.

### Real Backend Mode

For testing against a real backend:

```bash
TEST_USER_EMAIL=your@email.com TEST_USER_PASSWORD=password npm run test:e2e
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MOCK_API` | No | Set to `true` to use mocked API responses |
| `TEST_USER_EMAIL` | If not mock mode | Test user email address |
| `TEST_USER_PASSWORD` | If not mock mode | Test user password |
| `PLAYWRIGHT_BASE_URL` | No | Base URL (defaults to `http://localhost:5000`) |

**IMPORTANT**: Never use real user credentials or commit `.env.test` to git!

## Security Guidelines

- Use dedicated test accounts with minimal permissions
- Never commit `.env.test` files to version control (already in `.gitignore`)
- Rotate test credentials regularly
- Test accounts should only exist in development/staging environments
- Do not use production credentials for testing
- If credentials are accidentally committed, contact the security team immediately and rotate credentials

## Running Tests

```bash
# Run all E2E tests with mock API
MOCK_API=true npm run test:e2e

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

- `e2e/fixtures/test-base.ts` - Authentication fixture with mock API support
- `e2e/mocks/api-mocks.ts` - Playwright route handlers for API mocking
- `e2e/job-detail.e2e.ts` - Functional tests
- `e2e/job-detail.a11y.ts` - Accessibility tests (axe-core)
- `e2e/job-detail.responsive.ts` - Responsive design tests

## CI/CD

Tests run automatically on PR via GitHub Actions. See `.github/workflows/pr-checks.yml`.

### Default CI Configuration

- **e2e-tests**: Runs with `MOCK_API=true` (no backend required)
- **accessibility-tests**: Runs with `MOCK_API=true`
- **e2e-tests-staging**: Runs against real staging (only if `PLAYWRIGHT_BASE_URL` is set)

### Optional GitHub Configuration for Staging Tests

To run tests against a real staging environment:

- Variables:
  - `PLAYWRIGHT_BASE_URL` - Staging URL (e.g., `https://staging.example.com`)
  - `TEST_USER_EMAIL` - Test user email
- Secrets:
  - `TEST_USER_PASSWORD` - Test user password

## Mock Data

When using `MOCK_API=true`, the following mock jobs are available:

| Job ID | Type | Status | Description |
|--------|------|--------|-------------|
| `job-001` | epub_audit | completed | Has results with score 85 |
| `job-002` | pdf_remediation | processing | Progress at 45% |
| `job-003` | epub_audit | failed | Has error message |
| `job-004` | pdf_audit | pending | Waiting to start |

## Troubleshooting

### Tests timeout on login

1. Check if `MOCK_API=true` is set (for CI without backend)
2. Verify backend is running (for real backend mode)
3. Check login page has `data-testid` attributes

### Tests fail with "credentials not set"

Set either:
- `MOCK_API=true` for mock mode, OR
- `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` for real backend
