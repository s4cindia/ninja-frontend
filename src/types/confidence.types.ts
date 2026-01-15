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

export interface CriterionConfidenceWithIssues {
  criterionId: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  status: 'pass' | 'fail' | 'not_applicable' | 'not_tested';
  confidenceScore: number;
  remarks: string;
  relatedIssues?: IssueMapping[];
  issueCount?: number;
}

export interface ConfidenceSummary {
  totalCriteria: number;
  passingCriteria: number;
  failingCriteria: number;
  needsReviewCriteria: number;
  notApplicableCriteria: number;
  totalIssues: number;
  averageConfidence: number;
}

export interface ConfidenceWithIssuesResponse {
  jobId: string;
  edition: string;
  summary: ConfidenceSummary;
  criteria: CriterionConfidenceWithIssues[];
}
