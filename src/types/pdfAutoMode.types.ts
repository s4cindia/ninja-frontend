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

/**
 * Only PdfAutoRemediationRun (the job-native path) has this column —
 * ComparisonTrial doesn't, so a trial-linked job always reports null here
 * (inherits the tenant/default altTextMode). See the backend schema's own
 * doc comment on PdfAutoRemediationRun.autoAltTextMode.
 */
export type AutoAltTextMode = 'apply-to-pdf' | 'guidance-only' | null;

export interface AutoModeStatusResponse {
  mode: 'manual' | 'auto';
  autoStatus: AutoModeStatus;
  autoStopReason: AutoModeStopReason;
  autoRoundsCompleted: number;
  autoMaxRounds: number;
  autoCostSpentUsd: number;
  autoCostLimitUsd: number;
  autoColorContrastMode: AutoColorContrastMode;
  autoAltTextMode: AutoAltTextMode;
  /**
   * When the CURRENT run started (ninja-backend#671) — null if no run has
   * ever started, or once a run has stopped. Anchors a live elapsed-time
   * ticker while autoStatus === 'running'; not meant to span multiple
   * rounds' own individual timings, just "how long has this run been going".
   */
  autoStartedAt?: string | null;
}

/**
 * One per-job boolean override as reported by GET/PATCH /pdf/:jobId/settings
 * (ninja-backend#826) -- `override` is this job's own raw column value
 * (null means "inherit the tenant default", distinct from an explicit
 * true/false), `tenantDefault` is the current tenant-wide setting it falls
 * back to, and `effective` is the already-resolved value actually in play
 * for this job (what the backend's own resolveFullAutoMode/
 * resolveEscalateOnStall would compute). Shown together so the UI can
 * render "On (tenant default)" vs. "On (this job's own override)" without
 * having to resolve it client-side itself.
 */
export interface JobSettingOverride {
  override: boolean | null;
  tenantDefault: boolean;
  effective: boolean;
}

/**
 * GET/PATCH /pdf/:jobId/settings response (ninja-backend#826) -- the
 * visible, editable-any-time home for both Full Auto Mode's and
 * Auto-escalate-on-stall's per-job overrides. Previously fullAutoMode was
 * set-and-forget at upload time with no way to see or change it afterward;
 * this is what JobSettingsMenu reads/writes instead.
 */
export interface JobSettingsResponse {
  fullAutoMode: JobSettingOverride;
  autoEscalateOnStall: JobSettingOverride;
}

/**
 * PATCH body for /pdf/:jobId/settings. Omitting a field leaves it
 * untouched; an explicit `null` resets it to "inherit the tenant default",
 * distinct from omitting it -- mirrors updateJobSettingsSchema on the
 * backend exactly.
 */
export interface UpdateJobSettingsBody {
  fullAutoMode?: boolean | null;
  autoEscalateOnStall?: boolean | null;
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
