import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { pdfRemediationService } from './pdf-remediation.service';
import { api } from './api';
import { uploadService } from './upload.service';

vi.mock('./api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));
vi.mock('./upload.service', () => ({
  uploadService: {
    getPresignedUrl: vi.fn(),
    uploadToS3: vi.fn(),
    confirmUpload: vi.fn(),
  },
}));

const mockApi = api as Mocked<typeof api>;
const mockUploadService = uploadService as Mocked<typeof uploadService>;

describe('pdfRemediationService.reauditPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  beforeEach(() => {
    // Every test here goes through the full presign -> PUT -> confirm flow
    // before reauditPdf ever calls the backend re-audit endpoint itself.
    mockUploadService.getPresignedUrl.mockResolvedValue({
      uploadUrl: 'https://s3.example.com/presigned-put-url',
      fileKey: 'tenant-1/file-1/fixed.pdf',
      fileId: 'file-1',
      expiresIn: 3600,
    });
    mockUploadService.uploadToS3.mockResolvedValue(undefined);
    mockUploadService.confirmUpload.mockResolvedValue(undefined);
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

  // Regression test for a real, live-confirmed incident, 2026-11-05: this
  // endpoint's old direct-multipart POST shares the backend's CloudFront
  // distribution, which has AWSManagedRulesCommonRuleSet actively enforced
  // -- a 15MB "Upload Fixed PDF" attempt produced a browser "Network Error"
  // and never reached the backend at all, across two separate attempts.
  // Uploading via presigned S3 first means the large binary never transits
  // this backend's own CloudFront distribution, so the WAF never sees it.
  it('uploads the file via presigned S3 (not multipart to this backend), then calls re-audit-from-file with the resulting fileId', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { success: true, data: { success: true, metrics: {} }, error: null },
    });
    const file = new File(['x'], 'fixed.pdf', { type: 'application/pdf' });

    await pdfRemediationService.reauditPdf('job-123', file);

    expect(mockUploadService.getPresignedUrl).toHaveBeenCalledWith('fixed.pdf', file.size, 'application/pdf');
    expect(mockUploadService.uploadToS3).toHaveBeenCalledWith(
      'https://s3.example.com/presigned-put-url',
      file,
      undefined,
      'application/pdf'
    );
    expect(mockUploadService.confirmUpload).toHaveBeenCalledWith('file-1');
    expect(mockApi.post).toHaveBeenCalledWith(
      '/pdf/job-123/remediation/re-audit-from-file',
      { fileId: 'file-1' }
    );
  });
});

describe('pdfRemediationService.getRemediationHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the history endpoint and returns the runs array', async () => {
    const runs = [
      { cycleNumber: 1, events: [{ action: 'apply_fixes', source: 'apply_all', status: 'completed', startedAt: '2026-08-01T00:00:00Z' }] },
    ];
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: { runs } } });

    const result = await pdfRemediationService.getRemediationHistory('job-123');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job-123/remediation/history');
    expect(result).toEqual(runs);
  });

  it('returns an empty array when there are no runs yet', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: { runs: [] } } });

    const result = await pdfRemediationService.getRemediationHistory('job-123');

    expect(result).toEqual([]);
  });
});

describe('pdfRemediationService.getApplyFailureReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the apply-failures endpoint and returns the report', async () => {
    const report = {
      totalFailed: 2,
      groups: [
        {
          suggestionType: 'color-contrast-fix',
          reason: 'Fix did not verify even after escalating to #000000',
          category: 'needs_investigation',
          categoryLabel: 'Needs investigation -- contrast verification',
          explanation: 'explanation text',
          count: 2,
          issueIds: ['issue-1', 'issue-2'],
        },
      ],
    };
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: report } });

    const result = await pdfRemediationService.getApplyFailureReport('job-123');

    expect(mockApi.get).toHaveBeenCalledWith('/pdf/job-123/remediation/apply-failures');
    expect(result).toEqual(report);
  });

  it('falls back to an empty report when the response has no data payload', async () => {
    mockApi.get.mockResolvedValueOnce({ data: { success: true, data: null } });

    const result = await pdfRemediationService.getApplyFailureReport('job-123');

    expect(result).toEqual({ totalFailed: 0, groups: [] });
  });
});
