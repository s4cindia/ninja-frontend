import type { AccessibilityIssue } from './accessibility.types';

export type RemediationStatus = 'pending' | 'in_progress' | 'fixed' | 'skipped' | 'manual_required' | 'failed';

export type RemediationMode = 'quickfix' | 'preview' | 'editor';

export type FixType = 'auto' | 'quickfix' | 'manual' | 'fixed';

export interface RemediationTask {
  id: string;
  issue: AccessibilityIssue;
  issueCode?: string;
  message?: string;
  severity?: 'critical' | 'serious' | 'moderate' | 'minor';
  location?: string;
  fixType?: FixType;
  fixTypeLabel?: string;
  status: RemediationStatus;
  fixApplied?: QuickFixResult;
  fixedAt?: string;
  fixedBy?: 'auto' | 'manual' | 'quickfix';
  notes?: string;
}

export interface QuickFixResult {
  templateId: string;
  values: Record<string, unknown>;
  changes: FileChange[];
  appliedAt: string;
  aiGenerated?: boolean;
}

export interface FileChange {
  type: 'insert' | 'replace' | 'delete' | 'attribute';
  filePath: string;
  xpath?: string;
  selector?: string;
  content?: string;
  oldContent?: string;
  attribute?: string;
  value?: string;
  lineNumber?: number;
  description?: string;
}

export interface RemediationSession {
  id: string;
  jobId: string;
  epubId: string;
  tasks: RemediationTask[];
  startedAt: string;
  completedAt?: string;
  stats: {
    total: number;
    fixed: number;
    skipped: number;
    pending: number;
  };
}

export interface RemediationProgress {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  failed: number;
  percentage: number;
}

export interface RemediationPlanStats {
  total: number;
  autoFixable: number;
  quickFixable: number;
  manual: number;
}

export interface RemediationPlan {
  id: string;
  jobId: string;
  tasks: RemediationTask[];
  stats: RemediationPlanStats;
}

export interface AutoRemediationResult {
  attempted: number;
  fixed: number;
  failed: number;
  skipped: number;
  quickFixPending: number;
  manualPending: number;
}

export interface RemediationConfig {
  colorContrastAutoFix: boolean;
}

export interface RemediationConfigResponse {
  success: boolean;
  data: RemediationConfig;
  message?: string;
}
