import { api } from './api';
import type {
  ComparisonTrial,
  ComparisonTrialWithJob,
  ComparisonTrialContentType,
  ComparisonTrialMode,
  AutoColorContrastMode,
  TrialReport,
  AggregateReport,
  ExternalPacReport,
  ExternalPacReportSummary,
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

  // External PAC Report — a real, operator-uploaded third-party PAC-tool
  // report file. Not to be confused with Ninja's own self-generated PAC
  // report (pac-report.service.ts) or the veraPDF ninjaPacResult/
  // pdfxtPacResult failure-count blob on the trial object itself.
  getExternalPacReportUploadUrl: (
    trialId: string,
    filename: string,
    contentType: string
  ): Promise<{ uploadUrl: string; expiresIn: number }> =>
    api.post(`${BASE}/trials/${encodeURIComponent(trialId)}/pac-report-upload-url`, { filename, contentType }).then((r) => r.data.data),

  confirmExternalPacReportUpload: (
    trialId: string,
    data: { originalFileName: string; mimeType: string; summary: ExternalPacReportSummary }
  ): Promise<ExternalPacReport> =>
    api.post(`${BASE}/trials/${encodeURIComponent(trialId)}/pac-report-confirm`, data).then((r) => r.data.data),

  // data.data is null when nothing has been uploaded yet — that's a valid
  // "no report attached" state, not an error, so callers shouldn't treat a
  // null resolution as a failure.
  getExternalPacReport: (trialId: string): Promise<ExternalPacReport | null> =>
    api.get(`${BASE}/trials/${encodeURIComponent(trialId)}/pac-report`).then((r) => r.data.data),

  deleteExternalPacReport: (trialId: string): Promise<{ success: true }> =>
    api.delete(`${BASE}/trials/${encodeURIComponent(trialId)}/pac-report`).then((r) => r.data.data),
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

/**
 * Upload an External PAC Report file — same presign + direct-PUT-to-S3
 * shape as uploadComparisonPdf, but scoped to a trial and without a
 * returned s3Key: the confirm step below doesn't need one, the backend
 * already knows which key it presigned for this trial.
 */
export async function uploadExternalPacReportFile(trialId: string, file: File): Promise<void> {
  const { uploadUrl } = await comparisonStudyService.getExternalPacReportUploadUrl(
    trialId,
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
}
