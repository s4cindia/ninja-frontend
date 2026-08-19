import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { comparisonStudyService, uploadComparisonPdf } from './comparisonStudy.service';
import { api } from './api';

vi.mock('./api');

describe('uploadComparisonPdf', () => {
  const mockApi = api as Mocked<typeof api>;

  beforeEach(() => {
    mockApi.post.mockReset();
    global.fetch = vi.fn();
  });

  it('gets a presigned URL, PUTs the file to S3, and returns the s3Key', async () => {
    mockApi.post.mockResolvedValue({
      data: { data: { uploadUrl: 'https://s3.example.com/presigned', s3Key: 'uploads/a.pdf', expiresAt: '2026-08-01T11:00:00Z' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true });

    const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });
    const s3Key = await uploadComparisonPdf(file);

    expect(mockApi.post).toHaveBeenCalledWith('/admin/comparison-study/upload-url', {
      filename: 'a.pdf',
      contentType: 'application/pdf',
    });
    expect(global.fetch).toHaveBeenCalledWith('https://s3.example.com/presigned', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/pdf' },
      body: file,
    });
    expect(s3Key).toBe('uploads/a.pdf');
  });

  it('throws when the S3 PUT fails', async () => {
    mockApi.post.mockResolvedValue({
      data: { data: { uploadUrl: 'https://s3.example.com/presigned', s3Key: 'uploads/a.pdf', expiresAt: '2026-08-01T11:00:00Z' } },
    });
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 403 });

    const file = new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' });
    await expect(uploadComparisonPdf(file)).rejects.toThrow('S3 upload failed: 403');
  });
});

describe('comparisonStudyService', () => {
  const mockApi = api as Mocked<typeof api>;

  beforeEach(() => {
    mockApi.get.mockReset();
    mockApi.post.mockReset();
    mockApi.patch.mockReset();
  });

  it('logPdfxtData PATCHes the /pdfxt sub-route, not the bare trial route', async () => {
    mockApi.patch.mockResolvedValue({ data: { data: { id: 'trial-1', status: 'pdfxt_logged' } } });

    await comparisonStudyService.logPdfxtData('trial-1', { pdfxtTimeMs: 5000 });

    expect(mockApi.patch).toHaveBeenCalledWith('/admin/comparison-study/trials/trial-1/pdfxt', { pdfxtTimeMs: 5000 });
  });

  it('registerTrial POSTs to /admin/comparison-study/trials', async () => {
    mockApi.post.mockResolvedValue({ data: { data: { id: 'trial-1' } } });

    await comparisonStudyService.registerTrial({
      sourceFileName: 'a.pdf',
      sourceS3Key: 'uploads/a.pdf',
      contentType: 'mixed',
    });

    expect(mockApi.post).toHaveBeenCalledWith('/admin/comparison-study/trials', {
      sourceFileName: 'a.pdf',
      sourceS3Key: 'uploads/a.pdf',
      contentType: 'mixed',
    });
  });
});
