import { Page, Route } from '@playwright/test';

const TEST_USER = {
  id: 'test-user-123',
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  name: 'Test User',
  role: 'user',
};

const MOCK_TOKEN = 'mock-jwt-token-for-e2e-testing';

export const MOCK_JOBS = [
  {
    id: 'job-001',
    type: 'epub_audit',
    status: 'completed',
    progress: 100,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: 'sample-book.epub',
    results: {
      score: 85,
      totalIssues: 12,
      criticalIssues: 1,
      seriousIssues: 3,
      moderateIssues: 5,
      minorIssues: 3,
    },
  },
  {
    id: 'job-002',
    type: 'pdf_remediation',
    status: 'processing',
    progress: 45,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: 'document.pdf',
  },
  {
    id: 'job-003',
    type: 'epub_audit',
    status: 'failed',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: 'corrupt-file.epub',
    error: 'Failed to process file: Invalid EPUB structure',
  },
  {
    id: 'job-004',
    type: 'pdf_audit',
    status: 'pending',
    progress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fileName: 'pending-doc.pdf',
  },
];

async function handleRoute(route: Route, handler: () => Promise<unknown> | unknown) {
  const response = await handler();
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(response),
  });
}

export async function setupApiMocks(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON() as { email?: string; password?: string } | null;
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'password123';

    if (postData?.email === testEmail && postData?.password === testPassword) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: MOCK_TOKEN,
          user: TEST_USER,
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    }
  });

  await page.route('**/api/auth/me', async (route) => {
    await handleRoute(route, () => ({ user: TEST_USER }));
  });

  await page.route('**/api/auth/logout', async (route) => {
    await handleRoute(route, () => ({ success: true }));
  });

  await page.route('**/api/jobs', async (route) => {
    if (route.request().method() === 'GET') {
      await handleRoute(route, () => ({
        jobs: MOCK_JOBS,
        total: MOCK_JOBS.length,
        page: 1,
        limit: 10,
      }));
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/jobs/*', async (route) => {
    const url = route.request().url();
    const method = route.request().method();
    const jobIdMatch = url.match(/\/api\/jobs\/([^/?]+)/);
    const jobId = jobIdMatch?.[1];

    if (!jobId || jobId === 'undefined') {
      await route.continue();
      return;
    }

    const job = MOCK_JOBS.find((j) => j.id === jobId);

    if (method === 'GET') {
      if (job) {
        await handleRoute(route, () => job);
      } else {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Job not found' }),
        });
      }
    } else if (method === 'DELETE') {
      await handleRoute(route, () => ({ success: true }));
    } else {
      await route.continue();
    }
  });

  await page.route('**/api/jobs/*/retry', async (route) => {
    const url = route.request().url();
    const jobIdMatch = url.match(/\/api\/jobs\/([^/]+)\/retry/);
    const jobId = jobIdMatch?.[1];
    const job = MOCK_JOBS.find((j) => j.id === jobId);

    if (job) {
      await handleRoute(route, () => ({ ...job, status: 'pending', progress: 0 }));
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Job not found' }),
      });
    }
  });

  await page.route('**/api/dashboard/stats', async (route) => {
    await handleRoute(route, () => ({
      totalFiles: 156,
      processed: 142,
      pending: 8,
      failed: 6,
      complianceScore: 87,
    }));
  });
}
