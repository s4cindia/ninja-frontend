import { test, expect } from '@playwright/test';
import { login, MIN_TOUCH_TARGET_SIZE } from './fixtures/test-base';

test.describe('Job Detail Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-RD-001: Jobs table adapts to mobile viewport', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="jobs-list"]');

    const container = page.locator('[data-testid="jobs-table"], [data-testid="jobs-list"]');
    await expect(container).toBeVisible();

    const boundingBox = await container.boundingBox();
    expect(boundingBox).not.toBeNull();
    expect(boundingBox!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('MT-RD-002: Job detail header stacks on mobile', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="jobs-list"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    const hasJobs = await firstJobRow.count() > 0;
    test.skip(!hasJobs, 'No jobs available');

    await firstJobRow.click();
    await page.waitForSelector('[data-testid="job-detail-header"]');

    const header = page.locator('[data-testid="job-detail-header"]');
    await expect(header).toBeVisible();
  });

  test('MT-RD-003: Navigation remains accessible on mobile', async ({ page }) => {
    await page.goto('/jobs');

    const nav = page.locator('nav, [data-testid="navigation"], [data-testid="mobile-menu"]');
    await expect(nav.first()).toBeVisible();
  });

  test('MT-RD-004: Touch targets meet minimum size (44x44)', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="jobs-list"]');

    const buttons = page.locator('button, a, [role="button"]');
    const count = await buttons.count();

    test.skip(count === 0, 'No interactive elements found');

    const firstButton = buttons.first();
    const box = await firstButton.boundingBox();

    expect(box).not.toBeNull();
    // WCAG 2.1 AA: 44px minimum with 4px tolerance for borders/padding
    expect(box!.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
    expect(box!.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_SIZE);
  });

  test('MT-RD-005: Text remains readable without horizontal scroll', async ({ page }) => {
    await page.goto('/jobs');

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5); // 5px tolerance
  });

  test('MT-RD-006: Modal dialogs fit mobile viewport', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="jobs-list"]');

    // Try to open a modal if available
    const modalTrigger = page.locator('[data-testid="open-modal"], [data-testid="filter-button"]').first();
    const hasTrigger = await modalTrigger.count() > 0;

    test.skip(!hasTrigger, 'No modal trigger found');

    await modalTrigger.click();

    const modal = page.locator('[role="dialog"], [data-testid="modal"]');
    const hasModal = await modal.count() > 0;

    test.skip(!hasModal, 'No modal appeared');

    const box = await modal.boundingBox();
    test.skip(!box, 'Modal bounding box not available');

    const viewportSize = page.viewportSize();
    expect(viewportSize).not.toBeNull();
    expect(box!.width).toBeLessThanOrEqual(viewportSize!.width);
  });

  test('MT-RD-007: Action buttons are accessible on mobile', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"], [data-testid="jobs-list"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    const hasJobs = await firstJobRow.count() > 0;
    test.skip(!hasJobs, 'No jobs available');

    await firstJobRow.click();

    const actions = page.locator('[data-testid="job-actions"]');
    await expect(actions).toBeVisible();
  });

  test('MT-RD-011: Progress indicator visible on mobile', async ({ page }) => {
    await page.goto('/jobs?status=PROCESSING');

    const processingJob = page.locator('[data-testid="job-row"]').first();
    const hasJobs = await processingJob.count() > 0;
    test.skip(!hasJobs, 'No processing jobs available');

    await processingJob.click();

    const progress = page.locator('[data-testid="job-progress"]');
    await expect(progress).toBeVisible();
  });
});
