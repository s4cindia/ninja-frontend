import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfRemediationService } from './pdf-remediation.service';
import { api } from './api';

vi.mock('./api', () => ({
  api: { post: vi.fn() },
}));

const mockApi = api as Mocked<typeof api>;

describe('pdfRemediationService.reauditPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('regression: unwraps response.data.data (the comparisonResult payload), not the outer {success, data, error} envelope — the outer envelope only reflects "did the HTTP request succeed," while the payload\'s own `success` reflects "did the comparison itself succeed," and both objects have a `success` key so a `|| response.data` fallback could never detect the mistake', async () => {
    const comparisonResult = {
      success: false, // the comparison itself failed — must survive the unwrap
      jobId: 'job-123',
      originalAuditId: 'audit-1',
      reauditId: 'audit-2',
      fileName: 'fixed.pdf',
      comparison: {},
      metrics: { resolvedCount: 0, remainingCount: 10, regressionCount: 0 },
    };
    mockApi.post.mockResolvedValueOnce({
      data: {
        success: true, // the HTTP request itself succeeded — a different flag
        data: comparisonResult,
        error: { code: null, message: null, details: null },
      },
    });

    const result = await pdfRemediationService.reauditPdf('job-123', new File(['x'], 'fixed.pdf'));

    expect(result).toEqual(comparisonResult);
    expect(result.success).toBe(false);
    expect((result as unknown as { metrics: unknown }).metrics).toEqual(comparisonResult.metrics);
  });

  it('sends the file as multipart form data to the correct endpoint', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { success: true, metrics: {} }, error: null },
    });

    await pdfRemediationService.reauditPdf('job-123', new File(['x'], 'fixed.pdf'));

    expect(mockApi.post).toHaveBeenCalledWith(
      '/pdf/job-123/remediation/re-audit',
      expect.any(FormData),
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  });
});
