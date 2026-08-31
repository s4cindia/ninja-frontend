/**
 * Comparison Study "Auto Mode" — job-scoped types
 *
 * Auto mode has the backend loop on its own (analyze -> auto-approve ->
 * apply -> re-audit, repeating) until convergence or a limit is hit. These
 * mirror the ComparisonTrial fields of the same name (see
 * comparisonStudy.types.ts) but as returned by the job-scoped
 * GET /pdf/:jobId/auto-mode/status endpoint.
 */

import type { AutoModeStatus, AutoModeStopReason } from './comparisonStudy.types';

export interface AutoModeStatusResponse {
  mode: 'manual' | 'auto';
  autoStatus: AutoModeStatus;
  autoStopReason: AutoModeStopReason;
  autoRoundsCompleted: number;
  autoMaxRounds: number;
  autoCostSpentUsd: number;
  autoCostLimitUsd: number;
}
