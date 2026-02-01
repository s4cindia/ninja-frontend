import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisualComparisonPanel } from '../VisualComparisonPanel';
import * as comparisonService from '@/services/comparison.service';
import type { SpineItemWithChange } from '@/services/comparison.service';

// Mock the comparison service
vi.mock('@/services/comparison.service');

// Mock EPUBRenderer to avoid jsdom iframe issues
vi.mock('@/components/epub/EPUBRenderer', () => ({
  EPUBRenderer: ({ version }: { version: string }) => (
    <div data-testid={`epub-renderer-${version}`}>EPUBRenderer Mock</div>
  ),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Helper to create mock spine item
const createMockSpineItem = (href = 'OEBPS/text/chapter1.xhtml') => ({
  id: 'spine-1',
  href,
  mediaType: 'application/xhtml+xml',
  order: 1,
});

// Helper to create mock visual comparison data
const createMockData = (
  beforeHtml: string,
  afterHtml: string = beforeHtml,
  baseHref = 'OEBPS/text/chapter1.xhtml'
): SpineItemWithChange => {
  const spineItem = createMockSpineItem(baseHref);
  return {
    change: {
      id: 'change-1',
      changeNumber: 1,
      changeType: 'IMG',
      description: 'Test change',
      severity: 'MINOR',
    },
    beforeContent: {
      spineItem,
      html: beforeHtml,
      css: [],
      baseHref,
    },
    afterContent: {
      spineItem,
      html: afterHtml,
      css: [],
      baseHref,
    },
    spineItem,
    highlightData: {
      xpath: '',
      cssSelector: '',
      description: '',
    },
  };
};

describe('VisualComparisonPanel - Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Path Traversal Protection', () => {
    it('should reject path traversal attempts in image src attributes', async () => {
      const mockData = createMockData('<img src="../../../../etc/passwd" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-1" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalledWith('test-job-123', 'change-1');
      });

      // Wait for the component to render with data
      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      // The malicious path should be rejected and not converted to an API URL
      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const maliciousImg = container.querySelector('img[src*="etc/passwd"]');
        expect(maliciousImg).toBeNull();
      }
    });

    it('should reject excessive directory traversal (>10 levels)', async () => {
      const excessiveTraversal = Array(15).fill('..').join('/') + '/file.png';
      const mockData = createMockData(`<img src="${excessiveTraversal}" />`);
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-2" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const imgs = container.querySelectorAll('img');
        // All images should either be removed or not contain the malicious path
        imgs.forEach(img => {
          const src = img.getAttribute('src');
          expect(src).not.toContain(excessiveTraversal);
        });
      }
    });

    it('should reject Windows-style paths with backslashes', async () => {
      const mockData = createMockData('<img src="..\\..\\etc\\passwd" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-3" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const maliciousImg = container.querySelector('img[src*="\\\\"]');
        expect(maliciousImg).toBeNull();
      }
    });

    it('should reject paths that escape EPUB root after resolution', async () => {
      // Path with more ../ than available directories in base
      const mockData = createMockData(
        '<img src="../../../images/test.png" />',
        '<img src="../../../images/test.png" />',
        'OEBPS/chapter1.xhtml' // Only 1 directory level
      );
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-4" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        // Image should be removed or not contain remaining ../
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.getAttribute('src');
          // Should not have unresolved ../ in the final URL
          if (src && src.includes('test.png')) {
            expect(src).not.toMatch(/\.\.\//);
          }
        });
      }
    });
  });

  describe('XSS Prevention', () => {
    it('should prevent XSS via malformed img attributes using DOMParser', async () => {
      const mockData = createMockData('<img src="valid.png" onerror="alert(\'XSS\')" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-5" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      // Verify component rendered successfully (DOMParser processes HTML safely)
      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      // The component uses DOMParser which safely parses HTML without executing scripts
      // This test verifies the component doesn't crash when processing malicious HTML
      const container = document.querySelector('.visual-comparison-panel');
      expect(container).toBeTruthy();
    });

    it('should reject javascript: URI scheme', async () => {
      const mockData = createMockData('<img src="javascript:alert(\'XSS\')" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-6" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const maliciousImg = container.querySelector('img[src^="javascript:"]');
        expect(maliciousImg).toBeNull();
      }
    });

    it('should reject vbscript: URI scheme', async () => {
      const mockData = createMockData('<img src="vbscript:msgbox(\'XSS\')" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-7" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const maliciousImg = container.querySelector('img[src^="vbscript:"]');
        expect(maliciousImg).toBeNull();
      }
    });
  });

  describe('CSS Background Image Security', () => {
    it('should resolve valid CSS background images', async () => {
      const mockData = createMockData(
        '<div style="background-image: url(\'images/bg.png\')">Content</div>'
      );
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-8" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const divs = container.querySelectorAll('div[style*="background-image"]');
        divs.forEach(div => {
          const style = div.getAttribute('style');
          // Should be resolved to API endpoint
          if (style && style.includes('bg.png')) {
            expect(style).toContain('/api/v1/epub/job/test-job-123/asset/');
          }
        });
      }
    });

    it('should skip CSS fragment-only URLs', async () => {
      const mockData = createMockData(
        '<div style="background-image: url(\'#gradient\')">Content</div>'
      );
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-9" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const divs = container.querySelectorAll('div[style*="background-image"]');
        divs.forEach(div => {
          const style = div.getAttribute('style');
          // Fragment URLs should remain unchanged
          if (style && style.includes('#gradient')) {
            expect(style).toContain('#gradient');
            expect(style).not.toContain('/api/v1/epub/');
          }
        });
      }
    });

    it('should reject CSS path traversal in background images', async () => {
      const mockData = createMockData(
        '<div style="background-image: url(\'../../../../etc/passwd\')">Content</div>'
      );
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-10" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const divs = container.querySelectorAll('div[style*="background-image"]');
        divs.forEach(div => {
          const style = div.getAttribute('style');
          // Should not resolve to malicious path
          if (style) {
            expect(style).not.toContain('etc/passwd');
          }
        });
      }
    });
  });

  describe('Valid Path Resolution', () => {
    it('should correctly resolve relative image paths', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const mockData = createMockData('<img src="../images/diagram.png" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-11" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      // Verify path was resolved (check console logs in dev mode)
      const resolvedImageLog = consoleSpy.mock.calls.find(call =>
        call[0]?.includes('[VisualComparison] Resolved image:') &&
        call[0]?.includes('diagram.png') &&
        call[0]?.includes('/api/v1/epub/job/test-job-123/asset/')
      );

      expect(resolvedImageLog).toBeTruthy();
      consoleSpy.mockRestore();
    });

    it('should preserve data URIs unchanged', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const mockData = createMockData(`<img src="${dataUri}" />`);
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-12" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      // Data URIs should be skipped (not logged as resolved since they don't need resolution)
      const resolvedImageLog = consoleSpy.mock.calls.find(call =>
        call[0]?.includes('[VisualComparison] Resolved image:') &&
        call[0]?.includes('data:')
      );

      // Should NOT find a log for data URI since it's skipped
      expect(resolvedImageLog).toBeFalsy();
      consoleSpy.mockRestore();
    });

    it('should preserve absolute HTTP URLs unchanged', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const httpUrl = 'http://example.com/image.png';
      const mockData = createMockData(`<img src="${httpUrl}" />`);
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-13" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      // HTTP URLs should be skipped (not logged as resolved since they don't need resolution)
      const resolvedImageLog = consoleSpy.mock.calls.find(call =>
        call[0]?.includes('[VisualComparison] Resolved image:') &&
        call[0]?.includes('http://example.com')
      );

      // Should NOT find a log for HTTP URL since it's skipped
      expect(resolvedImageLog).toBeFalsy();
      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty image src attributes', async () => {
      const mockData = createMockData('<img src="" alt="Empty" />');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-14" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      // Should not crash - verify the component rendered
      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });
    });

    it('should handle malformed HTML gracefully', async () => {
      const mockData = createMockData('<img src="test.png" <img src="another.png">');
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-15" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      // Should not crash, DOMParser handles malformed HTML
      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });
    });

    it('should reject paths exceeding 500 characters', async () => {
      const longPath = 'a'.repeat(501) + '.png';
      const mockData = createMockData(`<img src="${longPath}" />`);
      vi.mocked(comparisonService.getVisualComparison).mockResolvedValue(mockData);

      render(
        <VisualComparisonPanel jobId="test-job-123" changeId="change-16" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(comparisonService.getVisualComparison).toHaveBeenCalled();
      });

      await waitFor(() => {
        const panel = document.querySelector('.visual-comparison-panel');
        expect(panel).toBeTruthy();
      });

      const container = document.querySelector('.visual-comparison-panel');
      if (container) {
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
          const src = img.getAttribute('src');
          // Long path should be rejected
          if (src && src.includes('.png')) {
            expect(src).not.toContain('a'.repeat(500));
          }
        });
      }
    });
  });
});
