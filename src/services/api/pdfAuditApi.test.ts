import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pdfAuditApi, PdfApiError } from './pdfAuditApi';
import { api } from '../api';
import { AxiosError } from 'axios';
import type { PdfAuditResult, PdfAuditListResponse } from '@/types/pdf.types';

// Mock the api module
vi.mock('../api');

const mockApi = api as vi.Mocked<typeof api>;

describe('PdfAuditApiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('uploadPdfForAudit', () => {
    it('uploads PDF file successfully', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = {
        data: {
          data: {
            jobId: 'job-123',
            fileId: 'file-456',
          },
        },
      };

      mockApi.post.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.uploadPdfForAudit(mockFile);

      expect(result).toEqual({ jobId: 'job-123', fileId: 'file-456' });
      expect(mockApi.post).toHaveBeenCalledWith(
        '/pdf/audit-upload',
        expect.any(FormData),
        expect.objectContaining({
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      );
    });

    it('calls progress callback during upload', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const mockResponse = {
        data: {
          data: { jobId: 'job-123' },
        },
      };
      const onProgress = vi.fn();

      mockApi.post.mockImplementation((_url, _data, config) => {
        // Simulate progress
        if (config?.onUploadProgress) {
          config.onUploadProgress({
            loaded: 50,
            total: 100,
            bytes: 50,
            lengthComputable: true
          });
          config.onUploadProgress({
            loaded: 100,
            total: 100,
            bytes: 100,
            lengthComputable: true
          });
        }
        return Promise.resolve(mockResponse);
      });

      await pdfAuditApi.uploadPdfForAudit(mockFile, onProgress);

      expect(onProgress).toHaveBeenCalledWith(50);
      expect(onProgress).toHaveBeenCalledWith(100);
    });

    it('throws PdfApiError on upload failure', async () => {
      const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
      const axiosError = {
        response: {
          data: {
            error: {
              message: 'Upload failed',
              code: 'UPLOAD_ERROR',
            },
          },
          status: 400,
        },
        message: 'Request failed',
      } as AxiosError;

      mockApi.post.mockRejectedValueOnce(axiosError);

      await expect(pdfAuditApi.uploadPdfForAudit(mockFile)).rejects.toThrow(PdfApiError);
    });
  });

  describe('getAuditStatus', () => {
    it('retrieves audit status successfully', async () => {
      const mockResponse = {
        data: {
          data: {
            status: 'processing',
            progress: 45,
            message: 'Processing PDF...',
          },
        },
      };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.getAuditStatus('job-123');

      expect(result).toEqual({
        status: 'processing',
        progress: 45,
        message: 'Processing PDF...',
      });
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/status');
    });

    it('retries on retryable error', async () => {
      const mockError = {
        response: { status: 503 },
        message: 'Service unavailable',
      } as AxiosError;

      const mockResponse = {
        data: {
          data: {
            status: 'completed',
            progress: 100,
          },
        },
      };

      mockApi.get
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.getAuditStatus('job-123');

      expect(result.status).toBe('completed');
      expect(mockApi.get).toHaveBeenCalledTimes(3);
    });

    it('throws error after max retries', async () => {
      const mockError = {
        response: { status: 503 },
        message: 'Service unavailable',
      } as AxiosError;

      mockApi.get.mockRejectedValue(mockError);

      await expect(pdfAuditApi.getAuditStatus('job-123')).rejects.toThrow();
      expect(mockApi.get).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });
  });

  describe('getAuditResult', () => {
    it('retrieves audit result successfully', async () => {
      const mockResult: PdfAuditResult = {
        id: 'audit-1',
        jobId: 'job-123',
        fileName: 'test.pdf',
        fileSize: 1024000,
        pageCount: 10,
        score: 75,
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
        issues: [],
        matterhornSummary: {
          totalCheckpoints: 31,
          passed: 25,
          failed: 4,
          notApplicable: 2,
          categories: [],
        },
        metadata: {
          pdfVersion: '1.7',
          isTagged: true,
          hasStructureTree: true,
        },
      };

      const mockResponse = { data: { data: mockResult } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.getAuditResult('job-123');

      expect(result).toEqual(mockResult);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/audit/result');
    });

    it('throws PdfApiError on failure', async () => {
      const axiosError = {
        response: {
          data: {
            error: {
              message: 'Result not found',
              code: 'NOT_FOUND',
            },
          },
          status: 404,
        },
        message: 'Not found',
      } as AxiosError;

      mockApi.get.mockRejectedValueOnce(axiosError);

      await expect(pdfAuditApi.getAuditResult('job-123')).rejects.toThrow(PdfApiError);
    });
  });

  describe('getAcrReport', () => {
    it('retrieves ACR report in JSON format', async () => {
      const mockReport = {
        id: 'acr-1',
        jobId: 'job-123',
        title: 'Test Report',
        wcagVersion: '2.1',
        conformanceLevel: 'AA' as const,
        productName: 'Test PDF',
        evaluationDate: '2024-01-15',
        criteria: [],
        summary: {
          supports: 10,
          partiallySupports: 5,
          doesNotSupport: 2,
          notApplicable: 3,
        },
      };

      const mockResponse = { data: { data: mockReport } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.getAcrReport('job-123', 'json');

      expect(result).toEqual(mockReport);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/acr', {
        params: { format: 'json' },
      });
    });

    it('retrieves ACR report in HTML format', async () => {
      const mockReport = {
        id: 'acr-1',
        jobId: 'job-123',
        title: 'Test Report',
        wcagVersion: '2.1',
        conformanceLevel: 'AA' as const,
        productName: 'Test PDF',
        evaluationDate: '2024-01-15',
        criteria: [],
        summary: {
          supports: 10,
          partiallySupports: 5,
          doesNotSupport: 2,
          notApplicable: 3,
        },
      };

      const mockResponse = { data: { data: mockReport } };
      mockApi.get.mockResolvedValueOnce(mockResponse);

      await pdfAuditApi.getAcrReport('job-123', 'html');

      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/acr', {
        params: { format: 'html' },
      });
    });
  });

  describe('downloadReport', () => {
    it('downloads report in PDF format', async () => {
      const mockBlob = new Blob(['pdf content'], { type: 'application/pdf' });
      const mockResponse = { data: mockBlob };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.downloadReport('job-123', 'pdf');

      expect(result).toEqual(mockBlob);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/report', {
        params: { format: 'pdf' },
        responseType: 'blob',
      });
    });

    it('downloads report in DOCX format', async () => {
      const mockBlob = new Blob(['docx content'], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });
      const mockResponse = { data: mockBlob };

      mockApi.get.mockResolvedValueOnce(mockResponse);

      const result = await pdfAuditApi.downloadReport('job-123', 'docx');

      expect(result).toEqual(mockBlob);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/job/job-123/report', {
        params: { format: 'docx' },
        responseType: 'blob',
      });
    });
  });

  describe('listAudits', () => {
    it('lists audits with default pagination', async () => {
      const mockResponse: PdfAuditListResponse = {
        success: true,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 20,
        },
      };

      mockApi.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await pdfAuditApi.listAudits();

      expect(result).toEqual(mockResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/audits', {
        params: { page: 1, limit: 20 },
      });
    });

    it('lists audits with custom pagination', async () => {
      const mockResponse: PdfAuditListResponse = {
        success: true,
        data: [],
        pagination: {
          total: 100,
          page: 3,
          limit: 50,
        },
      };

      mockApi.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await pdfAuditApi.listAudits(3, 50);

      expect(result).toEqual(mockResponse);
      expect(mockApi.get).toHaveBeenCalledWith('/pdf/audits', {
        params: { page: 3, limit: 50 },
      });
    });
  });

  describe('deleteAudit', () => {
    it('deletes audit successfully', async () => {
      mockApi.delete.mockResolvedValueOnce({ data: {} });

      await pdfAuditApi.deleteAudit('job-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/pdf/job/job-123');
    });

    it('throws PdfApiError on deletion failure', async () => {
      const axiosError = {
        response: {
          data: {
            error: {
              message: 'Delete failed',
              code: 'DELETE_ERROR',
            },
          },
          status: 403,
        },
        message: 'Forbidden',
      } as AxiosError;

      mockApi.delete.mockRejectedValueOnce(axiosError);

      await expect(pdfAuditApi.deleteAudit('job-123')).rejects.toThrow(PdfApiError);
    });
  });

  describe('pollForCompletion', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('polls until completion', async () => {
      const mockResult: PdfAuditResult = {
        id: 'audit-1',
        jobId: 'job-123',
        fileName: 'test.pdf',
        fileSize: 1024000,
        pageCount: 10,
        score: 75,
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
        issues: [],
        matterhornSummary: {
          totalCheckpoints: 31,
          passed: 25,
          failed: 4,
          notApplicable: 2,
          categories: [],
        },
        metadata: {
          pdfVersion: '1.7',
          isTagged: true,
          hasStructureTree: true,
        },
      };

      mockApi.get
        .mockResolvedValueOnce({
          data: { data: { status: 'processing', progress: 30 } },
        })
        .mockResolvedValueOnce({
          data: { data: { status: 'processing', progress: 60 } },
        })
        .mockResolvedValueOnce({
          data: { data: { status: 'completed', progress: 100 } },
        })
        .mockResolvedValueOnce({
          data: { data: mockResult },
        });

      const promise = pdfAuditApi.pollForCompletion('job-123', 1000, 10000);

      // Advance timers to trigger polls
      await vi.advanceTimersByTimeAsync(1000); // First poll
      await vi.advanceTimersByTimeAsync(1000); // Second poll
      await vi.advanceTimersByTimeAsync(1000); // Third poll (completed)

      const result = await promise;

      expect(result).toEqual(mockResult);
      expect(mockApi.get).toHaveBeenCalledTimes(4); // 3 status checks + 1 result fetch
    });

    it('throws error when audit fails', async () => {
      mockApi.get.mockResolvedValue({
        data: {
          data: { status: 'failed', progress: 0, message: 'Audit failed' },
        },
      });

      const promise = pdfAuditApi.pollForCompletion('job-123', 1000, 10000);

      await vi.advanceTimersByTimeAsync(1000);

      await expect(promise).rejects.toThrow(PdfApiError);
      await expect(promise).rejects.toMatchObject({
        message: 'Audit failed',
        code: 'AUDIT_FAILED',
      });
    });

    it('throws error on timeout', async () => {
      mockApi.get.mockResolvedValue({
        data: { data: { status: 'processing', progress: 50 } },
      });

      const promise = pdfAuditApi.pollForCompletion('job-123', 1000, 5000);

      // Advance past timeout
      await vi.advanceTimersByTimeAsync(6000);

      await expect(promise).rejects.toThrow(PdfApiError);
      await expect(promise).rejects.toMatchObject({
        code: 'POLLING_TIMEOUT',
      });
    });
  });

  describe('createCancellablePolling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('creates cancellable polling operation', async () => {
      mockApi.get.mockResolvedValue({
        data: { data: { status: 'processing', progress: 50 } },
      });

      const { promise, abort } = pdfAuditApi.createCancellablePolling('job-123', 1000, 10000);

      // Start polling
      await vi.advanceTimersByTimeAsync(1000);

      // Cancel operation
      abort();

      await expect(promise).rejects.toThrow(PdfApiError);
      await expect(promise).rejects.toMatchObject({
        code: 'POLLING_ABORTED',
      });
    });

    it('resolves when audit completes', async () => {
      const mockResult: PdfAuditResult = {
        id: 'audit-1',
        jobId: 'job-123',
        fileName: 'test.pdf',
        fileSize: 1024000,
        pageCount: 10,
        score: 75,
        status: 'completed',
        createdAt: '2024-01-15T10:00:00Z',
        completedAt: '2024-01-15T10:05:00Z',
        issues: [],
        matterhornSummary: {
          totalCheckpoints: 31,
          passed: 25,
          failed: 4,
          notApplicable: 2,
          categories: [],
        },
        metadata: {
          pdfVersion: '1.7',
          isTagged: true,
          hasStructureTree: true,
        },
      };

      mockApi.get
        .mockResolvedValueOnce({
          data: { data: { status: 'processing', progress: 50 } },
        })
        .mockResolvedValueOnce({
          data: { data: { status: 'completed', progress: 100 } },
        })
        .mockResolvedValueOnce({
          data: { data: mockResult },
        });

      const { promise } = pdfAuditApi.createCancellablePolling('job-123', 1000, 10000);

      await vi.advanceTimersByTimeAsync(1000); // First poll
      await vi.advanceTimersByTimeAsync(1000); // Second poll (completed)

      const result = await promise;
      expect(result).toEqual(mockResult);
    });
  });

  describe('PdfApiError', () => {
    it('creates error from axios error', () => {
      const axiosError = {
        response: {
          data: {
            error: {
              message: 'Test error',
              code: 'TEST_ERROR',
              details: { field: 'test' },
            },
          },
          status: 400,
        },
        message: 'Request failed',
      } as AxiosError;

      const error = PdfApiError.fromAxiosError(axiosError);

      expect(error).toBeInstanceOf(PdfApiError);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.status).toBe(400);
      expect(error.details).toEqual({ field: 'test' });
    });

    it('handles axios error without response data', () => {
      const axiosError = {
        message: 'Network error',
      } as AxiosError;

      const error = PdfApiError.fromAxiosError(axiosError);

      expect(error.message).toBe('Network error');
      expect(error.code).toBe('API_ERROR');
    });
  });
});
