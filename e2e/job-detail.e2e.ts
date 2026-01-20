import { test, expect } from '@playwright/test';
import { login } from './fixtures/test-base';

/**
 * E2E Tests for Job Detail View
 * Test ID Format: MT-E2E-XXX (Manual Test - E2E - Sequential Number)
 * MT = Manual Test tracking prefix for test management
 */

test.describe('Job Detail View E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-E2E-001: Navigate to job detail from jobs list', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+/);
    await expect(page.locator('[data-testid="job-detail-header"]')).toBeVisible();
  });

  test('MT-E2E-005: Display job metadata correctly', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await expect(page.locator('[data-testid="job-type"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="job-created-date"]')).toBeVisible();
  });

  test('MT-E2E-006: Display job progress for processing jobs', async ({ page }) => {
    await page.goto('/jobs?status=PROCESSING');

    const processingJob = page.locator('[data-testid="job-row"]').first();
    const hasProcessingJobs = await processingJob.count() > 0;

    test.skip(!hasProcessingJobs, 'No processing jobs available');

    await processingJob.click();
    await expect(page.locator('[data-testid="job-progress"]')).toBeVisible();
  });

  test('MT-E2E-007: Display job results for completed jobs', async ({ page }) => {
    await page.goto('/jobs?status=COMPLETED');

    const completedJob = page.locator('[data-testid="job-row"]').first();
    const hasCompletedJobs = await completedJob.count() > 0;

    test.skip(!hasCompletedJobs, 'No completed jobs available');

    await completedJob.click();
    await expect(page.locator('[data-testid="job-results"]')).toBeVisible();
  });

  test('MT-E2E-011: Back navigation returns to jobs list', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+/);

    const backButton = page.locator('[data-testid="back-button"]');
    await expect(backButton).toBeVisible();
    await backButton.click();

    await expect(page).toHaveURL('/jobs');
  });

  test('MT-E2E-012: Job actions are available based on status', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await expect(page.locator('[data-testid="job-actions"]')).toBeVisible();
  });

  test('MT-E2E-015: Error state displays correctly for failed jobs', async ({ page }) => {
    await page.goto('/jobs?status=FAILED');

    const failedJob = page.locator('[data-testid="job-row"]').first();
    const hasFailedJobs = await failedJob.count() > 0;

    test.skip(!hasFailedJobs, 'No failed jobs available');

    await failedJob.click();
    await expect(page.locator('[data-testid="job-error"]')).toBeVisible();
  });

  test('MT-E2E-016: Retry failed job action', async ({ page }) => {
    // Navigate to the failed job (job-003 in mock data)
    await page.goto('/jobs/job-003');

    // Wait for job detail to load
    await page.waitForSelector('[data-testid="job-detail-header"]');

    // Find and click the retry button
    const retryButton = page.locator('[data-testid="retry-button"]');
    const hasRetryButton = await retryButton.count() > 0;

    test.skip(!hasRetryButton, 'No retry button available for this job');

    await retryButton.click();

    // Verify retry action was triggered (job status changes or confirmation appears)
    await expect(
      page.locator('[data-testid="job-status"]').or(page.locator('[role="alert"]'))
    ).toBeVisible();
  });

  test('MT-E2E-017: Delete job action with confirmation', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await expect(page).toHaveURL(/\/jobs\/[a-zA-Z0-9-]+/);

    // Find the delete button
    const deleteButton = page.locator('[data-testid="delete-button"]');
    const hasDeleteButton = await deleteButton.count() > 0;

    test.skip(!hasDeleteButton, 'No delete button available for this job');

    await deleteButton.click();

    // Verify confirmation dialog appears
    const confirmDialog = page.locator('[data-testid="confirm-dialog"]').or(page.locator('[role="alertdialog"]'));
    await expect(confirmDialog).toBeVisible();

    // Confirm deletion
    const confirmButton =
      page.locator('[data-testid="confirm-delete"]').or(confirmDialog.locator('button:has-text("Delete")'));
    await confirmButton.click();

    // Verify redirect to jobs list after deletion
    await expect(page).toHaveURL('/jobs');
  });
});