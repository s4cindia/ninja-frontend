/**
 * PDF Audit API Service
 *
 * Provides methods for PDF accessibility audit operations including:
 * - File upload with progress tracking
 * - Audit status polling
 * - Result retrieval
 * - Report generation and download
 * - Error handling with retry logic
 */

import { api } from '../api';
import { AxiosError } from 'axios';
import type {
  PdfAuditResult,
  PdfAuditListResponse,
  PdfAuditStatus,
} from '@/types/pdf.types';

// ============================================================================
// Types
// ============================================================================

/**
 * ACR (Accessibility Conformance Report) structure
 */
export interface ACRReport {
  /** Report ID */
  id: string;
  /** Associated job ID */
  jobId: string;
  /** Report title */
  title: string;
  /** WCAG version (e.g., "2.1", "2.2") */
  wcagVersion: string;
  /** Conformance level (A, AA, AAA) */
  conformanceLevel: 'A' | 'AA' | 'AAA';
  /** Product name */
  productName: string;
  /** Product version */
  productVersion?: string;
  /** Evaluation date */
  evaluationDate: string;
  /** Evaluator name */
  evaluatorName?: string;
  /** Conformance claims by criterion */
  criteria: ACRCriterion[];
  /** Overall summary */
  summary: {
    /** Number of criteria that support */
    supports: number;
    /** Number of criteria that partially support */
    partiallySupports: number;
    /** Number of criteria that do not support */
    doesNotSupport: number;
    /** Number of criteria not applicable */
    notApplicable: number;
  };
}

/**
 * Individual WCAG criterion in ACR report
 */
export interface ACRCriterion {
  /** Criterion ID (e.g., "1.1.1") */
  id: string;
  /** Criterion name */
  name: string;
  /** WCAG level */
  level: 'A' | 'AA' | 'AAA';
  /** Conformance status */
  status: 'supports' | 'partially-supports' | 'does-not-support' | 'not-applicable';
  /** Supporting remarks */
  remarks?: string;
  /** Related issues */
  issues?: Array<{
    id: string;
    message: string;
    severity: string;
  }>;
}

/**
 * Upload progress callback
 */
export type UploadProgressCallback = (percentage: number) => void;

/**
 * Audit status response
 */
export interface AuditStatusResponse {
  /** Current status */
  status: PdfAuditStatus;
  /** Progress percentage (0-100) */
  progress: number;
  /** Status message */
  message?: string;
}

/**
 * Upload response
 */
export interface UploadResponse {
  /** Job ID for tracking */
  jobId: string;
  /** File ID */
  fileId?: string;
}

/**
 * Custom PDF API error
 */
export class PdfApiError extends Error {
  constructor(
    message: string,
    public code: string = 'UNKNOWN_ERROR',
    public status?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'PdfApiError';
    Object.setPrototypeOf(this, PdfApiError.prototype);
  }

  static fromAxiosError(error: AxiosError): PdfApiError {
    const response = error.response?.data as Record<string, unknown>;
    const errorData = response?.error as Record<string, unknown> | undefined;
    const message = (errorData?.message || response?.message || error.message) as string;
    const code = (errorData?.code || response?.code || 'API_ERROR') as string;
    const status = error.response?.status;
    const details = errorData?.details || response?.details;

    return new PdfApiError(message, code, status, details);
  }
}

// ============================================================================
// Retry Logic Helper
// ============================================================================

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffFactor: 2,
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: AxiosError): boolean {
  // Retry on network errors
  if (!error.response) return true;

  // Retry on specific status codes
  const status = error.response.status;
  return status === 503 || status === 429 || (status >= 500 && status < 600);
}

/**
 * Calculate delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelay * Math.pow(config.backoffFactor, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Execute function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if not retryable or last attempt
      if (!isRetryableError(error as AxiosError) || attempt === retryConfig.maxRetries) {
        break;
      }

      // Wait before retry with exponential backoff
      const delay = calculateDelay(attempt, retryConfig);
      await sleep(delay);
    }
  }

  throw lastError!;
}

// ============================================================================
// PDF Audit API Service Class
// ============================================================================

class PdfAuditApiService {
  /**
   * Upload PDF file for audit
   */
  async uploadPdfForAudit(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post<{ data: UploadResponse }>('/pdf/audit-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percentage = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percentage);
          }
        },
      });

      return response.data.data;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Get audit status
   */
  async getAuditStatus(jobId: string): Promise<AuditStatusResponse> {
    try {
      const response = await withRetry(() =>
        api.get<{ data: AuditStatusResponse }>(`/pdf/job/${encodeURIComponent(jobId)}/status`)
      );

      return response.data.data;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Get audit result
   */
  async getAuditResult(jobId: string): Promise<PdfAuditResult> {
    try {
      const response = await withRetry(() =>
        api.get<{ data: PdfAuditResult }>(`/pdf/job/${encodeURIComponent(jobId)}/audit/result`)
      );

      return response.data.data;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Get ACR report
   */
  async getAcrReport(jobId: string, format: 'json' | 'html' = 'json'): Promise<ACRReport> {
    try {
      const response = await withRetry(() =>
        api.get<{ data: ACRReport }>(`/pdf/job/${encodeURIComponent(jobId)}/acr`, {
          params: { format },
        })
      );

      return response.data.data;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Download report in PDF or DOCX format
   */
  async downloadReport(jobId: string, format: 'pdf' | 'docx' = 'pdf'): Promise<Blob> {
    try {
      const response = await withRetry(() =>
        api.get<Blob>(`/pdf/job/${encodeURIComponent(jobId)}/report`, {
          params: { format },
          responseType: 'blob',
        })
      );

      return response.data;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * List all audits with pagination
   */
  async listAudits(page: number = 1, limit: number = 20): Promise<PdfAuditListResponse> {
    try {
      const response = await withRetry(() =>
        api.get<PdfAuditListResponse>('/pdf/audits', {
          params: { page, limit },
        })
      );

      // Handle both wrapped and unwrapped responses
      if ('data' in response.data && 'success' in response.data) {
        return response.data as PdfAuditListResponse;
      }

      return response.data as PdfAuditListResponse;
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Delete audit
   */
  async deleteAudit(jobId: string): Promise<void> {
    try {
      await withRetry(() => api.delete(`/pdf/job/${encodeURIComponent(jobId)}`));
    } catch (error) {
      throw PdfApiError.fromAxiosError(error as AxiosError);
    }
  }

  /**
   * Poll for audit completion
   *
   * @param jobId - Job ID to poll
   * @param interval - Polling interval in milliseconds (default: 2000)
   * @param timeout - Timeout in milliseconds (default: 300000 = 5 minutes)
   * @returns Promise that resolves when audit completes
   */
  async pollForCompletion(
    jobId: string,
    interval: number = 2000,
    timeout: number = 300000
  ): Promise<PdfAuditResult> {
    const startTime = Date.now();
    const abortController = new AbortController();
    let timeoutReached = false;

    // Setup timeout
    const timeoutId = setTimeout(() => {
      timeoutReached = true;
      abortController.abort();
    }, timeout);

    try {
      while (!abortController.signal.aborted) {
        // Check if timeout exceeded
        if (Date.now() - startTime >= timeout) {
          throw new PdfApiError(
            'Audit polling timeout exceeded',
            'POLLING_TIMEOUT',
            408
          );
        }

        // Get current status
        const status = await this.getAuditStatus(jobId);

        // Check if completed
        if (status.status === 'completed') {
          clearTimeout(timeoutId);
          return await this.getAuditResult(jobId);
        }

        // Check if failed
        if (status.status === 'failed') {
          clearTimeout(timeoutId);
          throw new PdfApiError(
            status.message || 'Audit failed',
            'AUDIT_FAILED',
            500
          );
        }

        // Wait before next poll
        await sleep(interval);
      }

      // Check if aborted due to timeout or manual abort
      if (timeoutReached) {
        throw new PdfApiError(
          'Audit polling timeout exceeded',
          'POLLING_TIMEOUT',
          408
        );
      }

      throw new PdfApiError(
        'Audit polling was aborted',
        'POLLING_ABORTED',
        499
      );
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create a cancellable polling operation
   *
   * @returns Object with promise and abort function
   */
  createCancellablePolling(
    jobId: string,
    interval: number = 2000,
    timeout: number = 300000
  ): {
    promise: Promise<PdfAuditResult>;
    abort: () => void;
  } {
    const abortController = new AbortController();
    let timeoutId: NodeJS.Timeout;

    // Extract async polling logic to separate function
    const runPolling = async (): Promise<PdfAuditResult> => {
      const startTime = Date.now();

      while (!abortController.signal.aborted) {
        // Check if timeout exceeded
        if (Date.now() - startTime >= timeout) {
          throw new PdfApiError(
            'Audit polling timeout exceeded',
            'POLLING_TIMEOUT',
            408
          );
        }

        // Get current status
        const status = await this.getAuditStatus(jobId);

        // Check if completed
        if (status.status === 'completed') {
          const result = await this.getAuditResult(jobId);
          return result;
        }

        // Check if failed
        if (status.status === 'failed') {
          throw new PdfApiError(
            status.message || 'Audit failed',
            'AUDIT_FAILED',
            500
          );
        }

        // Wait before next poll
        await sleep(interval);
      }

      throw new PdfApiError(
        'Audit polling was aborted',
        'POLLING_ABORTED',
        499
      );
    };

    const promise = new Promise<PdfAuditResult>((resolve, reject) => {
      // Setup timeout
      timeoutId = setTimeout(() => {
        abortController.abort();
        reject(
          new PdfApiError(
            'Audit polling timeout exceeded',
            'POLLING_TIMEOUT',
            408
          )
        );
      }, timeout);

      // Run polling logic
      runPolling()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          clearTimeout(timeoutId);
        });
    });

    return {
      promise,
      abort: () => {
        abortController.abort();
        if (timeoutId) clearTimeout(timeoutId);
      },
    };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

/**
 * Singleton instance of PDF Audit API service
 */
export const pdfAuditApi = new PdfAuditApiService();

/**
 * Default export (same as singleton)
 */
export default pdfAuditApi;
