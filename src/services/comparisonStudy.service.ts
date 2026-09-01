import { api } from './api';
import type {
  ComparisonTrial,
  ComparisonTrialWithJob,
  ComparisonTrialContentType,
  ComparisonTrialMode,
  AutoColorContrastMode,
  TrialReport,
  AggregateReport,
} from '@/types/comparisonStudy.types';

// Routes are mounted under /admin, not bare /comparison-study.
const BASE = '/admin/comparison-study';

export interface ComparisonTrialListResponse {
  trials: ComparisonTrial[];
  nextCursor: string | null;
}

export const comparisonStudyService = {
  getUploadUrl: (
    filename: string,
    contentType = 'application/pdf'
  ): Promise<{ uploadUrl: string; s3Key: string; expiresAt: string }> =>
    api.post(`${BASE}/upload-url`, { filename, contentType }).then((r) => r.data.data),

  registerTrial: (data: {
    sourceFileName: string;
    sourceS3Key: string;
    contentType: ComparisonTrialContentType;
  }): Promise<ComparisonTrial> =>
    api.post(`${BASE}/trials`, data).then((r) => r.data.data),

  listTrials: (params?: {
    limit?: number;
    cursor?: string;
    status?: string;
    contentType?: string;
  }): Promise<ComparisonTrialListResponse> =>
    api.get(`${BASE}/trials`, { params }).then((r) => r.data.data),

  getTrial: (id: string): Promise<ComparisonTrialWithJob> =>
    api.get(`${BASE}/trials/${encodeURIComponent(id)}`).then((r) => r.data.data),

  // PATCH .../trials/:id/pdfxt — not bare .../trials/:id.
  logPdfxtData: (
    id: string,
    data: {
      pdfxtS3Key?: string;
      pdfxtTimeMs?: number;
      pdfxtPageCount?: number;
      pdfxtCostUsd?: number;
    }
  ): Promise<ComparisonTrial> =>
    api.patch(`${BASE}/trials/${encodeURIComponent(id)}/pdfxt`, data).then((r) => r.data.data),

  validateTrial: (id: string): Promise<ComparisonTrial> =>
    api.post(`${BASE}/trials/${encodeURIComponent(id)}/validate`).then((r) => r.data.data),

  // 409 if mode is changed while autoStatus === 'running' — stop the run first.
  updateAutoModeConfig: (
    id: string,
    data: {
      mode?: ComparisonTrialMode;
      autoMaxRounds?: number;
      autoCostLimitUsd?: number;
      autoColorContrastMode?: AutoColorContrastMode;
    }
  ): Promise<ComparisonTrial> =>
    api.patch(`${BASE}/trials/${encodeURIComponent(id)}/auto-mode`, data).then((r) => r.data.data),

  getTrialReport: (id: string): Promise<TrialReport> =>
    api.get(`${BASE}/trials/${encodeURIComponent(id)}/report`).then((r) => r.data.data),

  getAggregateReport: (): Promise<AggregateReport> =>
    api.get(`${BASE}/aggregate-report`).then((r) => r.data.data),

  deleteTrial: (id: string): Promise<{ id: string }> =>
    api.delete(`${BASE}/trials/${encodeURIComponent(id)}`).then((r) => r.data.data),
};

/**
 * Upload a PDF via presigned S3 URL — same pattern as corpus tagged-PDF
 * uploads, deliberately bypassing the CloudFront WAF's multipart/form-data
 * block by PUTting directly to S3 instead of routing through our API.
 */
export async function uploadComparisonPdf(file: File): Promise<string> {
  const { uploadUrl, s3Key } = await comparisonStudyService.getUploadUrl(
    file.name,
    file.type || 'application/pdf'
  );
  const s3Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });
  if (!s3Res.ok) {
    throw new Error(`S3 upload failed: ${s3Res.status}`);
  }
  return s3Key;
}
