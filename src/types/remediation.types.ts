import type { AccessibilityIssue } from './accessibility.types';

export type RemediationStatus = 'pending' | 'in_progress' | 'fixed' | 'skipped' | 'manual_required';

export type RemediationMode = 'quickfix' | 'preview' | 'editor';

export interface RemediationTask {
  id: string;
  issue: AccessibilityIssue;
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
