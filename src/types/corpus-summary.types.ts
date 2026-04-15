// Types for Corpus Summary v2 (FE PR #2).
//
// These mirror the response shapes of the backend endpoints introduced in
// Backend PR #344 (`/calibration/corpus/lineage-summary` and
// `/calibration/corpus/timesheet-summary`).
//
// NOTE: the shapes here are the *planned* shapes from the FE PR #2 design doc
// (Ninja-Documentation/Annotations/FRONTEND_PR2_PLAN_CORPUS_SUMMARY_V2.md §3).
// They must be verified against the actual staging response payloads before
// being relied on in production code — see the staging curl checks in that
// same doc. Any field marked `// TODO: verify` is a guess pending backend
// confirmation.

export interface DateRange {
  /** ISO date, YYYY-MM-DD, inclusive. */
  from: string;
  /** ISO date, YYYY-MM-DD, inclusive. */
  to: string;
}

// ─── Lineage summary ──────────────────────────────────────────────────

export interface LineageHeadline {
  totalZones: number;
  /** 0..1 */
  aiAgreementRate: number;
  /** 0..1 */
  humanCorrectionRate: number;
  /** 0..1 */
  humanRejectionRate: number;
}

export interface ConfusionMatrix {
  labels: string[];
  /** cells[aiLabelIdx][finalLabelIdx] */
  cells: number[][];
}

export interface PerZoneTypeLineage {
  zoneType: string;
  totalZones: number;
  /** 0..100 */
  aiConfirmPct: number;
  /** 0..100 */
  aiCorrectionPct: number;
  /** 0..100 */
  aiRejectionPct: number;
  topCorrectedTo: string | null;
}

export interface BucketFlowEntry {
  total: number;
  humanConfirmed: number;
  humanCorrected: number;
  humanRejected: number;
}

export interface BucketFlow {
  green: BucketFlowEntry;
  amber: BucketFlowEntry;
  red: BucketFlowEntry;
}

export type RunIssueCategory =
  | 'PAGE_ALIGNMENT_MISMATCH'
  | 'INSUFFICIENT_JOINT_COVERAGE'
  | 'LIMITED_ZONE_COVERAGE'
  | 'UNEQUAL_EXTRACTOR_COVERAGE'
  | 'SINGLE_EXTRACTOR_ONLY'
  | 'ZONE_CONTENT_DIVERGENCE'
  | 'COMPLETED_WITH_REDUCED_SCOPE'
  | 'OTHER';

export interface IssuesLogTitle {
  runId: string;
  documentName: string;
  /** ISO timestamp */
  completedAt: string;
  pagesAffected: number | null;
  description: string;
  blocking: boolean;
}

export interface IssuesLogEntry {
  category: RunIssueCategory;
  titleCount: number;
  totalPagesAffected: number;
  blockingCount: number;
  titles: IssuesLogTitle[];
}

export interface ExtractorDisagreementEntry {
  finalLabel: string;
  totalZones: number;
  /** 0..100 */
  disagreementPct: number;
}

export interface LineageSummaryResponse {
  range: DateRange;
  runsIncluded: number;
  headline: LineageHeadline;
  confusionMatrix: ConfusionMatrix;
  perZoneType: PerZoneTypeLineage[];
  bucketFlow: BucketFlow;
  issuesLog: IssuesLogEntry[];
  extractorDisagreement: ExtractorDisagreementEntry[];
}

// ─── Timesheet summary ────────────────────────────────────────────────

export interface TimesheetTotals {
  wallClockHours: number;
  activeHours: number;
  idleHours: number;
  zonesReviewed: number;
  zonesPerHour: number;
  annotatorCostInr: number;
}

export interface PerOperatorEntry {
  operator: string;
  activeHours: number;
  zonesReviewed: number;
  zonesPerHour: number;
  /** 0..100 */
  confirmPct: number;
  /** 0..100 */
  correctPct: number;
  /** 0..100 */
  rejectPct: number;
  runsContributedTo: number;
  costInr: number;
}

export interface PerTitleEntry {
  runId: string;
  documentName: string;
  pages: number;
  activeHours: number;
  zonesReviewed: number;
  zonesPerHour: number;
  costInr: number;
  issuesCount: number;
  /** ISO timestamp */
  completedAt: string;
}

export interface PerZoneTypeTiming {
  zoneType: string;
  totalZones: number;
  avgSecondsPerZone: number;
}

export interface ThroughputTrendEntry {
  /** YYYY-MM-DD, day-bucketed */
  date: string;
  zonesReviewed: number;
  activeHours: number;
  zonesPerHour: number;
  operatorsActive: number;
}

export interface TimesheetSummaryResponse {
  range: DateRange;
  runsIncluded: number;
  totals: TimesheetTotals;
  perOperator: PerOperatorEntry[];
  perTitle: PerTitleEntry[];
  perZoneType: PerZoneTypeTiming[];
  throughputTrend: ThroughputTrendEntry[];
}
