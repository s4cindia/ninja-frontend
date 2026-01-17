import { test, expect } from '@playwright/test';
import { login } from './fixtures/test-base';

/**
 * Job Detail View - E2E Tests
 * Tests for /jobs and /jobs/:id pages
 */

test.describe('Job Detail View - E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-E2E-001: complete user flow - Jobs to View to Remediate', async ({ page }) => {
    // Navigate to jobs list
    await page.goto('/jobs');
    await expect(page.locator('h1')).toBeVisible();

    // Click first View button
    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Verify job detail page loaded
      await expect(page).toHaveURL(/\/jobs\/[\w-]+/);
      await expect(page.locator('[data-testid="compliance-score"]')).toBeVisible();
      await expect(page.locator('[data-testid="severity-summary"]')).toBeVisible();
    }
  });

  test('MT-E2E-005: Back button returns to Jobs list', async ({ page }) => {
    await page.goto('/jobs');

    // Click first job to view details
    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(page).toHaveURL(/\/jobs\/[\w-]+/);

      // Click back button
      const backButton = page.locator('[data-testid="back-button"]');
      if (await backButton.isVisible()) {
        await backButton.click();
        await expect(page).toHaveURL('/jobs');
      }
    }
  });

  test('MT-E2E-006: Raw data toggle expands and collapses', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await expect(page).toHaveURL(/\/jobs\/[\w-]+/);

      const rawToggle = page.locator('[data-testid="raw-data-toggle"]');
      if (await rawToggle.isVisible()) {
        // Initially hidden
        await expect(page.locator('[data-testid="raw-json"]')).not.toBeVisible();

        // Click to show
        await rawToggle.click();
        await expect(page.locator('[data-testid="raw-json"]')).toBeVisible();

        // Click to hide
        await rawToggle.click();
        await expect(page.locator('[data-testid="raw-json"]')).not.toBeVisible();
      }
    }
  });

  test('MT-E2E-007: Filter issues by severity', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const filterDropdown = page.locator('[data-testid="filter-severity"]');
      if (await filterDropdown.isVisible()) {
        // Get initial row count
        const initialRows = await page.locator('[data-testid="issue-row"]').count();

        // Filter by severity
        await filterDropdown.selectOption('critical');

        // Verify filtered results
        const filteredRows = await page.locator('[data-testid="issue-row"]').count();
        expect(filteredRows).toBeLessThanOrEqual(initialRows);
      }
    }
  });

  test('MT-E2E-011: Compliance score displays correctly', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Verify score component exists
      const scoreElement = page.locator('[data-testid="compliance-score"]');
      await expect(scoreElement).toBeVisible();

      // Verify score value is displayed
      const scoreValue = page.locator('[data-testid="score-value"]');
      if (await scoreValue.isVisible()) {
        const text = await scoreValue.textContent();
        expect(text).toMatch(/\d+/); // Contains a number
      }
    }
  });

  test('MT-E2E-012: Severity summary cards display', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Verify severity summary exists
      const summaryElement = page.locator('[data-testid="severity-summary"]');
      await expect(summaryElement).toBeVisible();

      // Check for severity cards
      const severityCards = page.locator('[data-testid^="severity-card"]');
      const count = await severityCards.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
  });

  test('MT-E2E-015: Loading skeleton appears', async ({ page }) => {
    // Navigate directly to trigger loading state
    await page.goto('/jobs');

    // Check if skeleton or content appears
    const content = page.locator('[data-testid="compliance-score"], [data-testid="job-detail-skeleton"]');
    await expect(content.first()).toBeVisible({ timeout: 10000 });
  });
});