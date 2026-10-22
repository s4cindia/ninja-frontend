/**
 * Comparison Study "Auto Mode" — job-scoped types
 *
 * Auto mode has the backend loop on its own (analyze -> auto-approve ->
 * apply -> re-audit, repeating) until convergence or a limit is hit. These
 * mirror the ComparisonTrial fields of the same name (see
 * comparisonStudy.types.ts) but as returned by the job-scoped
 * GET /pdf/:jobId/auto-mode/status endpoint.
 */

import type { AutoColorContrastMode, AutoModeStatus, AutoModeStopReason } from './comparisonStudy.types';

export interface AutoModeStatusResponse {
  mode: 'manual' | 'auto';
  autoStatus: AutoModeStatus;
  autoStopReason: AutoModeStopReason;
  autoRoundsCompleted: number;
  autoMaxRounds: number;
  autoCostSpentUsd: number;
  autoCostLimitUsd: number;
  autoColorContrastMode: AutoColorContrastMode;
  /**
   * When the CURRENT run started (ninja-backend#671) — null if no run has
   * ever started, or once a run has stopped. Anchors a live elapsed-time
   * ticker while autoStatus === 'running'; not meant to span multiple
   * rounds' own individual timings, just "how long has this run been going".
   */
  autoStartedAt?: string | null;
}

/**
 * Suggested autoCostLimitUsd, derived from real historical spend on
 * similarly-sized documents instead of a flat hardcoded default (see
 * ninja-backend's auto-mode-budget-estimate.service.ts). `confidence: 'low'`
 * means the sample was too thin to trust -- estimatedCostUsd is the same
 * flat $2.00 default in that case, not a guess.
 */
export interface BudgetEstimate {
  estimatedCostUsd: number;
  confidence: 'low' | 'medium' | 'high';
  sampleSize: number;
  /** This job's own issuesFound when job-specific; null for the batch/tenant-wide case. */
  basedOnIssueCount: number | null;
}
