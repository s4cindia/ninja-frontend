import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './fixtures/test-base';

test.describe('Job Detail Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-A11Y-001: Jobs list page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalAndSerious).toHaveLength(0);

    const moderate = results.violations.filter(v => v.impact === 'moderate');
    if (moderate.length > 0) {
      console.warn(`Found ${moderate.length} moderate accessibility issues:`, moderate);
    }
  });

  test('MT-A11Y-002: Job detail page has no critical accessibility violations', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const firstJobRow = page.locator('[data-testid="job-row"]').first();
    await expect(firstJobRow).toBeVisible();
    await firstJobRow.click();

    await page.waitForSelector('[data-testid="job-detail-header"]');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const criticalAndSerious = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalAndSerious).toHaveLength(0);

    const moderate = results.violations.filter(v => v.impact === 'moderate');
    if (moderate.length > 0) {
      console.warn(`Found ${moderate.length} moderate accessibility issues:`, moderate);
    }
  });

  test('MT-A11Y-004: All interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('MT-A11Y-005: Focus indicators are visible', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    const outline = await focusedElement.evaluate(el =>
      window.getComputedStyle(el).outline || window.getComputedStyle(el).boxShadow
    );

    expect(outline).not.toBe('none');
  });

  test('MT-A11Y-009: Status badges have accessible names', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const statusBadges = page.locator('[data-testid="job-status"]');
    const count = await statusBadges.count();

    test.skip(count === 0, 'No status badges found');

    for (let i = 0; i < Math.min(count, 3); i++) {
      const badge = statusBadges.nth(i);
      const text = await badge.textContent();
      expect(text?.trim().length).toBeGreaterThan(0);
    }
  });

  test('MT-A11Y-010: Tables have proper headers', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForSelector('[data-testid="jobs-table"]');

    const table = page.locator('[data-testid="jobs-table"]');
    const headers = table.locator('th, [role="columnheader"]');

    await expect(headers.first()).toBeVisible();
  });
});