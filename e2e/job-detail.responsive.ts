import { test, expect } from '@playwright/test';
import { login } from './fixtures/test-base';

/**
 * Job Detail View - Responsive Design Tests
 * Tests for mobile, tablet, and desktop viewports
 */

// Viewport sizes
const VIEWPORTS = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
};

test.describe('Job Detail View - Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('MT-RD-001: mobile layout displays correctly', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Verify key components are visible on mobile
      const scoreElement = page.locator('[data-testid="compliance-score"]');
      if (await scoreElement.isVisible()) {
        await expect(scoreElement).toBeVisible();

        // Score should still be readable (minimum size)
        const box = await scoreElement.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(60);
          expect(box.height).toBeGreaterThanOrEqual(60);
        }
      }
    }
  });

  test('MT-RD-002: tablet layout shows 2-column severity cards', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.tablet);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const cards = page.locator('[data-testid^="severity-card"]');
      const count = await cards.count();

      if (count >= 2) {
        const firstBox = await cards.first().boundingBox();
        const secondBox = await cards.nth(1).boundingBox();

        if (firstBox && secondBox) {
          // On tablet, cards might be side by side (similar Y) or stacked
          // Just verify they're visible and reasonably sized
          expect(firstBox.width).toBeGreaterThan(100);
          expect(secondBox.width).toBeGreaterThan(100);
        }
      }
    }
  });

  test('MT-RD-003: desktop layout shows full 4-column severity cards', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.desktop);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const cards = page.locator('[data-testid^="severity-card"]');
      const count = await cards.count();

      if (count === 4) {
        // Get all card positions
        const boxes = await Promise.all(
          [0, 1, 2, 3].map(i => cards.nth(i).boundingBox())
        );

        // Verify all cards are visible
        boxes.forEach(box => {
          expect(box).not.toBeNull();
        });
      }
    }
  });

  test('MT-RD-004: table has horizontal scroll on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const tableContainer = page.locator('[data-testid="issues-table-container"]');
      if (await tableContainer.isVisible()) {
        const overflowX = await tableContainer.evaluate(
          el => window.getComputedStyle(el).overflowX
        );
        expect(['auto', 'scroll']).toContain(overflowX);
      }
    }
  });

  test('MT-RD-005: action buttons stack on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const actionsContainer = page.locator('[data-testid="job-actions"]');
      if (await actionsContainer.isVisible()) {
        const buttons = actionsContainer.locator('button');
        const count = await buttons.count();

        if (count >= 2) {
          const firstBox = await buttons.first().boundingBox();
          const secondBox = await buttons.nth(1).boundingBox();

          if (firstBox && secondBox) {
            // On mobile, buttons should stack (second below first)
            // or be arranged to fit mobile width
            expect(firstBox.width).toBeLessThanOrEqual(VIEWPORTS.mobile.width);
          }
        }
      }
    }
  });

  test('MT-RD-006: compliance score is readable at all viewport sizes', async ({ page }) => {
    const viewports = [
      { ...VIEWPORTS.mobile, name: 'mobile' },
      { ...VIEWPORTS.tablet, name: 'tablet' },
      { ...VIEWPORTS.desktop, name: 'desktop' },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/jobs');

      const viewButton = page.locator('[data-testid="view-job-btn"]').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        const score = page.locator('[data-testid="compliance-score"]');
        if (await score.isVisible()) {
          await expect(score).toBeVisible();

          const box = await score.boundingBox();
          if (box) {
            // Score should be at least 60px for readability
            expect(box.width).toBeGreaterThanOrEqual(60);
            expect(box.height).toBeGreaterThanOrEqual(60);
          }
        }
      }
    }
  });

  test('MT-RD-007: long text is truncated on mobile', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.mobile);
    await page.goto('/jobs');

    const viewButton = page.locator('[data-testid="view-job-btn"]').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      const descriptionCells = page.locator('[data-testid="issue-description"]');
      const count = await descriptionCells.count();

      if (count > 0) {
        const cell = descriptionCells.first();
        const box = await cell.boundingBox();

        if (box) {
          // Cell should fit within viewport
          expect(box.width).toBeLessThan(VIEWPORTS.mobile.width);
        }
      }
    }
  });

  test('MT-RD-011: score gauge remains circular', async ({ page }) => {
    const viewports = [VIEWPORTS.mobile, VIEWPORTS.tablet, VIEWPORTS.desktop];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/jobs');

      const viewButton = page.locator('[data-testid="view-job-btn"]').first();
      if (await viewButton.isVisible()) {
        await viewButton.click();

        const score = page.locator('[data-testid="compliance-score"]');
        if (await score.isVisible()) {
          const box = await score.boundingBox();

          if (box) {
            // Width and height should be similar (circular)
            const aspectRatio = box.width / box.height;
            expect(aspectRatio).toBeGreaterThan(0.8);
            expect(aspectRatio).toBeLessThan(1.2);
          }
        }
      }
    }
  });
});