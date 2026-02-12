/**
 * Types for ACR Report Review & Edit
 * Phase 1: Review & Edit Page
 */

export interface AcrCriterionReview {
  id: string;
  acrJobId: string;
  criterionId: string;
  criterionNumber: string;
  criterionName: string;
  level?: string;
  confidence: number;
  aiStatus?: string;
  evidence?: Record<string, unknown>;
  conformanceLevel?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  // Verification data (carried forward)
  verificationStatus?: string;
  verificationMethod?: string;
  verificationNotes?: string;
  isNotApplicable: boolean;
  naReason?: string;
  naSuggestionData?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AcrJob {
  id: string;
  jobId: string;
  edition: string;
  documentTitle?: string;
  status: string;
  executiveSummary?: string;
  conformanceLevel?: string;
  documentType?: string;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface AcrReportSummary {
  totalCriteria: number;
  applicableCriteria: number;
  notApplicableCriteria: number;
  passingCriteria: number;
  failingCriteria: number;
  needsReviewCriteria: number;
  conformancePercentage: number;
}

export interface AcrReportData {
  acrJob: AcrJob;
  summary: AcrReportSummary;
  criteria: AcrCriterionReview[];
  naCriteria: AcrCriterionReview[];
  lastUpdated: string;
}

export interface CriterionUpdateData {
  verificationStatus?: string;
  verificationMethod?: string;
  verificationNotes?: string;
  reviewerNotes?: string;
  conformanceLevel?: string;
  isNotApplicable?: boolean;
  naReason?: string;
}

export interface ReportMetadataUpdate {
  executiveSummary?: string;
  conformanceLevel?: string;
  documentType?: string;
}

export interface CriterionChangeLog {
  id: string;
  criterionReviewId: string;
  jobId: string;
  criterionId: string;
  changedBy: string;
  changeType: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  createdAt: string;
}
