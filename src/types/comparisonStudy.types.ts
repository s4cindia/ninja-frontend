export type ComparisonTrialContentType = 'text-dominant' | 'table-heavy' | 'figure-heavy' | 'mixed';

/** Status values actually set by the backend — 'ninja_complete' and 'reported' are schema-aspirational, no code path sets them. */
export type ComparisonTrialStatus = 'registered' | 'pdfxt_logged' | 'validated';

/** manual: operator drives each analyze/approve/apply/re-audit round by hand (existing behavior). auto: the backend loops on its own until convergence or a limit is hit. */
export type ComparisonTrialMode = 'manual' | 'auto';

/** null while never started or between runs; 'running' while the backend loop is actively executing rounds; 'stopped' once it has concluded (see autoStopReason for why). */
export type AutoModeStatus = 'running' | 'stopped' | null;

export type AutoModeStopReason =
  | 'converged'      // no AI-actionable fixes remain
  | 'round_limit'    // hit autoMaxRounds
  | 'budget_limit'   // hit autoCostLimitUsd
  | 'manual_stop'    // operator called the /stop endpoint
  | 'stalled'        // no progress being made
  | 'error'          // the loop itself failed
  | null;

/**
 * null means "not explicitly overridden for this trial" — the backend falls
 * back to the tenant's own aiRemediation.colorContrastMode setting (or its
 * own default if the tenant hasn't set one either). It is NOT the same as
 * 'disabled' — don't render copy that asserts a definite behavior when this
 * is null, since the true effective mode isn't visible to the frontend.
 */
export type AutoColorContrastMode = 'guidance-only' | 'disabled' | 'apply-to-pdf' | null;

export interface VeraPdfFailure {
  ruleId: string;
  description: string;
  pageNumber?: number;
  context?: string;
}

export interface ComparisonTrial {
  id: string;
  sourceFileName: string;
  sourceS3Path: string;
  contentType: ComparisonTrialContentType;
  operatorId: string;

  ninjaJobId: string | null;
  ninjaActiveMs: number | null;
  ninjaGpuCostUsd: number | null;
  ninjaPacResult: VeraPdfFailure[] | null;

  pdfxtS3Path: string | null;
  pdfxtTimeMs: number | null;
  pdfxtPageCount: number | null;
  pdfxtCostUsd: number | null;
  pdfxtPacResult: VeraPdfFailure[] | null;

  status: ComparisonTrialStatus;
  createdAt: string;
  updatedAt: string;

  mode: ComparisonTrialMode;
  autoMaxRounds: number;
  autoCostLimitUsd: number;
  autoRoundsCompleted: number;
  autoCostSpentUsd: number;
  autoStatus: AutoModeStatus;
  autoStopReason: AutoModeStopReason;
  autoColorContrastMode: AutoColorContrastMode;
  // autoStopRequested (internal cooperative-cancel flag) is intentionally
  // omitted — use the /stop endpoint, never read/write this directly.
}

export interface ComparisonTrialWithJob extends ComparisonTrial {
  job: { id: string; status: string; output: unknown } | null;
}

export interface TrialReport {
  trialId: string;
  sourceFileName: string;
  contentType: string;
  pageCount: number | null;
  ninja: {
    activeMs: number | null;
    costUsd: number | null;
    pacFailureCount: number | null;
    pagesPerHour: number | null;
  };
  pdfxt: {
    timeMs: number | null;
    costUsd: number | null;
    pacFailureCount: number | null;
    pagesPerHour: number | null;
  };
}

export interface AggregateReport {
  trialCount: number;
  validatedCount: number;
  avgNinjaActiveMs: number | null;
  avgPdfxtTimeMs: number | null;
  estimatedSpeedup: number | null;
  avgNinjaPacFailures: number | null;
  avgPdfxtPacFailures: number | null;
  avgNinjaCostUsd: number | null;
  avgPdfxtCostUsd: number | null;
}
