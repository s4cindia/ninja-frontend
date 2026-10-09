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
