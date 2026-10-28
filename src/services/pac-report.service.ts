/**
 * PAC Report API Service
 *
 * Fetches the Matterhorn Protocol 1.1 compliance report for a completed
 * PDF audit job.
 */

import { api } from './api';

// ─── Types (mirrors backend PacReport interfaces) ─────────────────────────────

export type PacConditionStatus =
  | 'PASS'
  | 'FAIL'
  | 'UNTESTED'
  | 'HUMAN_REQUIRED'
  | 'NOT_APPLICABLE';

export type PacCheckpointStatus = 'PASS' | 'FAIL' | 'UNTESTED' | 'HUMAN_REQUIRED';

export interface PacConditionResult {
  id: string;
  description: string;
  how: 'M' | 'H' | '--';
  status: PacConditionStatus;
  issueIds?: string[];
  source?: 'ninja' | 'verapdf' | 'pdfa11y';
}

export interface PacCheckpointResult {
  id: string;
  title: string;
  status: PacCheckpointStatus;
  conditions: PacConditionResult[];
}

export interface PacReportSummary {
  total: number;
  pass: number;
  fail: number;
  untested: number;
  humanRequired: number;
  notApplicable: number;
}

export interface PacReport {
  jobId: string;
  fileName: string;
  generatedAt: string;
  ninjaVersion: string;
  isTagged: boolean;
  summary: PacReportSummary;
  checkpoints: PacCheckpointResult[];
}

// ─── axes4 PAC Cloud live check (mirrors backend Axes4 types) ─────────────────
//
// Separate from the Ninja report above: this runs the job's current document
// through axes4's real, paid cloud checker instead of Ninja's own free,
// instant, simulated one. checkId is axes4's own raw string — NOT yet mapped
// to a Matterhorn checkpoint/condition id (that mapping is deferred backend
// work), so these render as their own flat list, not slotted into the
// 31-checkpoint grid above.

export interface Axes4Failure {
  checkId: string;
  description: string;
  /** Absent for document-level checks (not tied to a specific page). */
  pageNumber?: number;
  rectangle?: { top: number; bottom: number; left: number; right: number };
  count: number;
}

export interface Axes4LiveResult {
  ran: boolean;
  /** Only present when ran is true. */
  uaIndex?: number;
  failures: Axes4Failure[];
  /** false in any environment without real axes4 credentials — ran is also false in that case. */
  configured: boolean;
  source: 'remediated' | 'original' | null;
}

export interface Axes4QuotaStatus {
  configured: boolean;
  pagesUsedThisPeriod: number;
  pagesLimitThisPeriod: number;
  /** null (with both counts 0) when configured is false. */
  periodResetAt: string | null;
}

// ─── External PAC report upload (job-native) ──────────────────────────────────
//
// Job-native counterpart to comparisonStudy.service.ts's own
// ExternalPacReport upload flow (same shape, keyed on jobId instead of
// trialId) — lets an operator upload a real, external PAC-tool report
// against a regular PDF Accessibility job that has no linked Comparison
// Study trial. Defined here (not reused from comparisonStudy.types.ts)
// since that type's `trialId` field doesn't translate directly.

export interface JobExternalPacReport {
  id: string;
  jobId: string;
  s3Key: string;
  originalFileName: string;
  mimeType: string;
  size: number;
  pass: number | null;
  fail: number | null;
  untested: number | null;
  humanRequired: number | null;
  notApplicable: number | null;
  uploadedById: string;
  createdAt: string;
  /** Presigned GET, generated fresh on every fetch of this report — link to it directly, no extra request needed. */
  downloadUrl: string;
}

export interface JobExternalPacReportSummary {
  pass?: number;
  fail?: number;
  untested?: number;
  humanRequired?: number;
  notApplicable?: number;
}

export async function getJobExternalPacReportUploadUrl(
  jobId: string,
  filename: string,
  contentType: string,
): Promise<{ uploadUrl: string; expiresIn: number }> {
  const response = await api.post(`/pdf/${encodeURIComponent(jobId)}/pac-report/external/upload-url`, { filename, contentType });
  return response.data.data;
}

export async function confirmJobExternalPacReportUpload(
  jobId: string,
  data: { originalFileName: string; mimeType: string; summary: JobExternalPacReportSummary },
): Promise<JobExternalPacReport> {
  const response = await api.post(`/pdf/${encodeURIComponent(jobId)}/pac-report/external/confirm`, data);
  return response.data.data;
}

// data.data is null when nothing has been uploaded yet — a valid "no report
// attached" state, not an error, so callers shouldn't treat a null
// resolution as a failure (matches getExternalPacReport's own convention).
export async function getJobExternalPacReport(jobId: string): Promise<JobExternalPacReport | null> {
  const response = await api.get(`/pdf/${encodeURIComponent(jobId)}/pac-report/external`);
  return response.data.data;
}

export async function deleteJobExternalPacReport(jobId: string): Promise<void> {
  await api.delete(`/pdf/${encodeURIComponent(jobId)}/pac-report/external`);
}

/**
 * Uploads the file half of the flow — presign, then PUT straight to S3
 * (same WAF-bypass reasoning as comparisonStudy.service.ts's
 * uploadExternalPacReportFile). Caller still has to call
 * confirmJobExternalPacReportUpload afterward with the summary counts.
 */
export async function uploadJobExternalPacReportFile(jobId: string, file: File): Promise<void> {
  const { uploadUrl } = await getJobExternalPacReportUploadUrl(jobId, file.name, file.type || 'application/pdf');
  const s3Res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/pdf' },
    body: file,
  });
  if (!s3Res.ok) {
    throw new Error(`S3 upload failed: ${s3Res.status}`);
  }
}

// ─── API calls ────────────────────────────────────────────────────────────────

export async function getPacReport(jobId: string): Promise<PacReport> {
  const response = await api.get(`/pdf/${encodeURIComponent(jobId)}/pac-report`);
  return response.data.data;
}

/**
 * Bills real money per page against axes4's real quota — must only ever be
 * called from an explicit operator click, never automatically.
 */
export async function runLivePacCheck(jobId: string): Promise<Axes4LiveResult> {
  const response = await api.post(`/pdf/${encodeURIComponent(jobId)}/pac-report/live`);
  return response.data.data;
}

export async function getAxes4QuotaStatus(): Promise<Axes4QuotaStatus> {
  const response = await api.get('/pdf/axes4/quota');
  return response.data.data;
}
