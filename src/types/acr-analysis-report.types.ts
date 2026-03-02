export type ExplanationSource = 'hardcoded' | 'gemini' | 'hybrid';

export interface IssueExplanation {
  fixType: 'auto' | 'quickfix' | 'manual';
  reason: string;
  whatPlatformDid: string | null;
  whatUserMustDo: string | null;
  wcagGuidance: string;
  estimatedTime: string | null;
}

export interface RemediationDiff {
  before: string;
  after: string;
  filePath: string;
  changeType: string;
}

export interface ExplainedAutoFixedItem {
  ruleId: string;
  description: string;
  wcagCriteria?: string;
  explanation: IssueExplanation;
  diff: RemediationDiff | null;
}

export interface ExplainedIssueItem {
  ruleId: string;
  description: string;
  wcagCriteria?: string;
  explanation: IssueExplanation;
}

export interface RemediationExplainability {
  autoFixed: ExplainedAutoFixedItem[];
  quickFixes: ExplainedIssueItem[];
  manualRequired: ExplainedIssueItem[];
}

export interface CriterionSummary {
  criterionId: string;
  criterionNumber: string;
  criterionName: string;
  level: string;
  confidence: number;
  aiStatus: string;
  conformanceLevel?: string;
  isNotApplicable: boolean;
}

export interface WcagLevelStats {
  total: number;
  passed: number;
  manual: number;
  na: number;
}

export interface ReportStatistics {
  totalCriteria: number;
  automatedPassed: number;
  manualRequired: number;
  notApplicable: number;
  overallConfidence: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  autoFixed: number;
  quickFix: number;
  manual: number;
  byWcagLevel: {
    A: WcagLevelStats;
    AA: WcagLevelStats;
    AAA: WcagLevelStats;
  };
}

export interface AiInsights {
  generatedAt: string;
  model: string;
  topPriorities: string[];
  riskAssessment: string;
  specificRecommendations: string[];
}

export interface KeyFinding {
  type: 'success' | 'warning' | 'info';
  text: string;
}

export interface ExecutiveSummary {
  overallConfidence: number;
  totalCriteria: number;
  automatedPassed: number;
  manualRequired: number;
  notApplicable: number;
  keyFindings: KeyFinding[];
  criticalActions: string[];
}

export interface ACRAnalysisReport {
  metadata: {
    jobId: string;
    acrJobId: string;
    contentTitle: string;
    analysisDate: string;
    reportVersion: string;
    explanationSource: ExplanationSource;
  };
  executiveSummary: ExecutiveSummary;
  remediationExplainability: RemediationExplainability;
  aiInsights?: AiInsights;
  statistics: ReportStatistics;
  categorizedCriteria: {
    manualRequired: CriterionSummary[];
    needsReviewHigh: CriterionSummary[];
    needsReviewMedium: CriterionSummary[];
    passed: CriterionSummary[];
    notApplicable: CriterionSummary[];
  };
}
