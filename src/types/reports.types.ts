// Operational Reports -- internal/admin reporting, distinct from the
// PAC/ACR/VPAT compliance reports elsewhere in the app. Mirrors
// ninja-backend's throughput-report.service.ts response shape exactly
// (5 groups total are planned; this covers Group 1, Time/Throughput).
export type ReportGroupBy = 'day' | 'week';

export interface DurationSummary {
  avgMs: number | null;
  p50Ms: number | null;
  p95Ms: number | null;
  count: number;
}

export type RoundAction = 'ai_analysis' | 'apply_fixes' | 'reaudit';

export interface RoundDurationEntry extends DurationSummary {
  action: string;
}

export interface ThroughputTrendPoint {
  period: string; // 'YYYY-MM-DD' -- a day, or a Monday-anchored week start
  queueWaitAvgMs: number | null;
  initialAuditAvgMs: number | null;
  jobCount: number;
}

export interface StuckJobEntry {
  jobId: string;
  status: string;
  updatedAt: string;
  stuckForMs: number;
  fileName: string | null;
}

export interface ThroughputReport {
  period: { from: string; to: string; groupBy: ReportGroupBy };
  queueWait: DurationSummary;
  initialAudit: DurationSummary;
  roundDuration: RoundDurationEntry[];
  trend: ThroughputTrendPoint[];
  stuckJobs: StuckJobEntry[];
  concurrency: { totalUnits: number; unitsInUse: number } | null;
}

export interface ThroughputReportFilters {
  from?: string; // ISO date
  to?: string; // ISO date
  groupBy?: ReportGroupBy;
}

export const ROUND_ACTION_LABELS: Record<string, string> = {
  ai_analysis: 'AI Analysis',
  apply_fixes: 'Apply Fixes',
  reaudit: 'Re-audit',
};

// Group 5 (RBAC / team activity). Shared by two call sites with the same
// response shape: GET /admin/reports/team-activity (ADMIN, whole tenant)
// and GET /jobs/team/review-activity (TEAM_LEADER/VIEWER, own team only).
export interface ReviewThroughputEntry {
  reviewerId: string;
  reviewerName: string;
  reviewerEmail: string;
  okCount: number;
  needsCorrectionCount: number;
  total: number;
}

export interface OwnershipEntry {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  inProgressJobs: number;
}

export interface TeamActivityReport {
  period: { from: string; to: string };
  reviewThroughput: ReviewThroughputEntry[];
  ownership: OwnershipEntry[];
}

export interface TeamActivityReportFilters {
  from?: string;
  to?: string;
}

// Group 2 (Cost). capHitFrequency keys are autoStopReason values
// ('converged' | 'round_limit' | 'budget_limit' | 'manual_stop' | 'stalled'
// | 'error') plus 'not_stopped' for a run with no stop reason recorded --
// kept as Record<string, number> rather than a fixed union since the
// backend treats these as plain strings, not a Prisma enum.
export interface SpendEntry {
  jobId: string;
  source: 'comparison_trial' | 'job_native';
  costUsd: number;
  stopReason: string | null;
  pageCount: number | null;
}

export interface CostReport {
  period: { from: string; to: string };
  totalSpentUsd: number;
  runCount: number;
  avgCostPerRunUsd: number | null;
  avgCostPerPageUsd: number | null;
  capHitFrequency: Record<string, number>;
  spendByRun: SpendEntry[];
}

export interface CostReportFilters {
  from?: string;
  to?: string;
}

export interface RoundCostPoint {
  cycleNumber: number;
  costUsd: number | null;
  completedAt: string;
}

export interface CostRoundTrend {
  jobId: string;
  rounds: RoundCostPoint[];
}

export const SPEND_SOURCE_LABELS: Record<SpendEntry['source'], string> = {
  comparison_trial: 'Comparison Study',
  job_native: 'Production Job',
};

// Group 4 (Reliability / infra health). interruptionsByAction is sparse
// (only keys that occurred at least once); failuresByCategory is always
// fully populated with all 5 keys, zero-filled. UNKNOWN is expected to be
// a meaningful chunk -- the classifier is deliberately narrow, not
// exhaustive -- so it's "not yet categorized," not a bug signal.
export type ErrorCategory = 'SIZE_LIMIT_EXCEEDED' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN';

export interface ReliabilityReport {
  period: { from: string; to: string };
  interruptionCount: number;
  interruptionsByAction: Record<string, number>;
  failureCount: number;
  failuresByCategory: Record<ErrorCategory, number>;
}

export interface ReliabilityReportFilters {
  from?: string;
  to?: string;
}

export const INTERRUPTION_ACTION_LABELS: Record<string, string> = {
  force_stopped: 'Deploy-interrupted',
  orphan_reconciled: 'Crash-interrupted',
};

export const ERROR_CATEGORY_LABELS: Record<ErrorCategory, string> = {
  SIZE_LIMIT_EXCEEDED: 'Size Limit Exceeded',
  TIMEOUT: 'Timeout',
  PARSE_ERROR: 'Parse Error',
  VALIDATION_ERROR: 'Validation Error',
  UNKNOWN: 'Not Yet Categorized',
};
