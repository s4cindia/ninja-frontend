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
  source?: 'ninja' | 'verapdf';
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

// ─── API call ─────────────────────────────────────────────────────────────────

export async function getPacReport(jobId: string): Promise<PacReport> {
  const response = await api.get(`/pdf/${jobId}/pac-report`);
  return response.data.data;
}
