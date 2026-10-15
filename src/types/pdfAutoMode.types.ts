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
