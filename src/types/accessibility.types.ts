export type IssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

export type IssueCategory = 
  | 'metadata'
  | 'structure'
  | 'navigation'
  | 'images'
  | 'color'
  | 'language'
  | 'links'
  | 'tables'
  | 'forms'
  | 'multimedia'
  | 'other';

export type FixTypeLabel = 'autofix' | 'quickfix' | 'manual';

export interface AccessibilityIssue {
  id: string;
  code: string;
  message: string;
  description?: string;
  severity: IssueSeverity;
  category?: IssueCategory;
  location?: string;
  filePath?: string;
  lineNumber?: number;
  columnNumber?: number;
  html?: string;
  element?: string;
  context?: string;
  snippet?: string;
  currentContent?: string;
  wcagCriteria?: string[];
  remediation?: string;
  helpUrl?: string;
  confidence?: number;
  fixType?: FixTypeLabel;
  status?: string;
}

export interface AccessibilityAuditResult {
  id: string;
  jobId: string;
  epubId: string;
  score: number;
  issues: AccessibilityIssue[];
  summary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
    passed: number;
  };
  categories: Record<IssueCategory, {
    passed: number;
    failed: number;
    issues: AccessibilityIssue[];
  }>;
  completedAt: string;
}
