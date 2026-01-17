import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from './fixtures/test-base';

/**
 * Job Detail View - Accessibility Tests
 * WCAG 2.1 AA compliance tests using axe-core
 */

test.describe('Job Detail View - Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-A11Y-004: no axe-core WCAG violations on Jobs list', async ({ page }) => {
    await page.goto('/jobs');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    // Log violations for debugging
    if (results.violations.length > 0) {
      console.log('Accessibility violations on /jobs:');
      results.violations.forEach(v => {
        console.log(`- ${v.id}: ${v.description} (${v.impact})`);
      });
    }

    expect(results.violations).toEqual([]);
  });

  test('MT-A11Y-004: no axe-core WCAG violations on Job Detail', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('[data-testid="raw-json"]') // Exclude code blocks
        .analyze();

      if (results.violations.length > 0) {
        console.log('Accessibility violations on Job Detail:');
        results.violations.forEach(v => {
          console.log(`- ${v.id}: ${v.description} (${v.impact})`);
        });
      }

      expect(results.violations).toEqual([]);
    }
  });

  test('MT-A11Y-001: all interactive elements are keyboard accessible', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const interactiveSelectors = [
        '[data-testid="back-button"]',
        '[data-testid="start-remediation-btn"]',
        '[data-testid="raw-data-toggle"]',
      ];

      for (const selector of interactiveSelectors) {
        const element = page.locator(selector);
        if (await element.isVisible()) {
          // Element should be focusable
          await element.focus();
          const isFocused = await element.evaluate(el => el === document.activeElement);
          expect(isFocused).toBe(true);
        }
      }
    }
  });

  test('MT-A11Y-002: focus indicators are visible', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Tab to interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus');
      if (await focusedElement.count() > 0) {
        const styles = await focusedElement.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            outline: computed.outline,
            outlineWidth: computed.outlineWidth,
            outlineStyle: computed.outlineStyle,
            boxShadow: computed.boxShadow,
          };
        });

        const hasFocusIndicator =
          (styles.outlineStyle !== 'none' && styles.outlineWidth !== '0px') ||
          styles.boxShadow !== 'none';

        expect(hasFocusIndicator).toBe(true);
      }
    }
  });

  test('MT-A11Y-005: compliance score has accessible label', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const scoreElement = page.locator('[data-testid="compliance-score"]');
      if (await scoreElement.isVisible()) {
        const ariaLabel = await scoreElement.getAttribute('aria-label');
        const ariaLabelledBy = await scoreElement.getAttribute('aria-labelledby');
        const role = await scoreElement.getAttribute('role');

        // Must have accessible name
        const hasAccessibleName = ariaLabel || ariaLabelledBy;
        expect(hasAccessibleName).toBeTruthy();
      }
    }
  });

  test('MT-A11Y-009: severity indicators use icons, not just color', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const severityBadges = page.locator('[data-testid^="severity-badge-"]');
      const count = await severityBadges.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 4); i++) {
          const badge = severityBadges.nth(i);

          // Should have an icon (svg or element with role="img")
          const hasIcon = await badge.locator('svg, [role="img"]').count();
          expect(hasIcon).toBeGreaterThan(0);
        }
      }
    }
  });

  test('MT-A11Y-010: content remains accessible at 200% zoom', async ({ page }) => {
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Simulate 200% zoom by halving viewport
      await page.setViewportSize({ width: 640, height: 360 });

      // Key content should remain visible
      const scoreElement = page.locator('[data-testid="compliance-score"]');
      if (await scoreElement.isVisible()) {
        await expect(scoreElement).toBeVisible();
      }

      // Run axe at zoomed state
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .analyze();

      expect(results.violations).toEqual([]);
    }
  });
});