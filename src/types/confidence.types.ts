export interface IssueLocation {
  startLine?: number;
  endLine?: number;
  startColumn?: number;
  endColumn?: number;
}

export interface IssueMapping {
  issueId: string;
  ruleId: string;
  impact: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  filePath: string;
  location?: IssueLocation;
  htmlSnippet?: string;
  xpath?: string;
}

// Shared status type for remediation across all interfaces
export type RemediationStatusValue = 'REMEDIATED' | 'FAILED' | 'SKIPPED' | 'completed' | 'remediated';

export interface RemediationInfo {
  status: RemediationStatusValue;
  completedAt?: string;
  method?: 'autofix' | 'quickfix' | 'manual';
  description?: string;
}

export interface RemediatedIssue {
  ruleId: string;
  message: string;
  filePath: string;
  status?: 'remediated' | 'completed';
  remediationInfo?: RemediationInfo;
  issueId?: string;
  impact?: string;
  xpath?: string;
}

export interface CriterionConfidenceWithIssues {
  criterionId: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'not_applicable' | 'not_tested' | 'needs_review';
  confidenceScore: number;
  confidence?: number;
  remarks: string;
  relatedIssues?: IssueMapping[];
  issueCount?: number;
  remainingCount?: number;
  hasIssues?: boolean;
  remediatedIssues?: RemediatedIssue[];
  remediatedCount?: number;
  fixedIssues?: RemediatedIssue[];
  fixedCount?: number;
}

export interface ConfidenceSummary {
  totalCriteria: number;
  passingCriteria: number;
  failingCriteria: number;
  needsReviewCriteria: number;
  notApplicableCriteria: number;
  totalIssues: number;
  averageConfidence: number;
  criteriaWithIssuesCount?: number;
}

export type RemediationStatusType = 'pending' | 'fixed' | 'failed' | 'skipped';

export interface OtherIssue {
  code: string;
  message: string;
  location?: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  status?: RemediationStatusType;
  // Note: OtherIssue.remediationInfo uses 'auto' | 'manual' from the legacy ACR endpoint,
  // while RemediationInfo.method uses 'autofix' | 'quickfix' | 'manual' from the confidence API.
  // These differ because they originate from different backend endpoints.
  remediationInfo?: {
    status?: RemediationStatusValue;
    method?: 'auto' | 'manual';
    completedAt?: string;
    description?: string;
    details?: Record<string, unknown>;
  };
}

export interface OtherIssuesData {
  count: number;
  pendingCount?: number;
  fixedCount?: number;
  issues: OtherIssue[];
}

export interface ConfidenceWithIssuesResponse {
  jobId: string;
  edition: string;
  summary: ConfidenceSummary;
  criteria: CriterionConfidenceWithIssues[];
  otherIssues?: OtherIssuesData;
}
