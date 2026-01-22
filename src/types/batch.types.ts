export type BatchStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type FileStatus =
  | 'UPLOADED'
  | 'AUDITING'
  | 'AUDITED'
  | 'PLANNING'
  | 'PLANNED'
  | 'REMEDIATING'
  | 'REMEDIATED'
  | 'FAILED'
  | 'SKIPPED';

export interface BatchFileIssue {
  criterion: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  fixApplied?: string;
  suggestedFix?: string;
  guidance?: string;
}

export interface BatchFile {
  fileId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  status: FileStatus;

  auditScore?: number;
  issuesFound?: number;
  issuesAutoFixed?: number;
  remainingQuickFix?: number;
  remainingManual?: number;

  error?: string;
  remediatedS3Key?: string;

  uploadedAt: string;
  remediationCompletedAt?: string;

  auditJobId?: string;
  planJobId?: string;
  remediationJobId?: string;

  autoFixedIssues?: BatchFileIssue[];
  quickFixIssues?: BatchFileIssue[];
  manualIssues?: BatchFileIssue[];
}

export interface Batch {
  batchId: string;
  name: string;
  status: BatchStatus;

  totalFiles: number;
  filesUploaded: number;
  filesAudited: number;
  filesPlanned: number;
  filesRemediated: number;
  filesFailed: number;

  totalIssuesFound: number;
  autoFixedIssues: number;
  quickFixIssues: number;
  manualIssues: number;

  files: BatchFile[];

  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface BatchListItem {
  batchId: string;
  name: string;
  status: BatchStatus;
  totalFiles: number;
  filesRemediated: number;
  createdAt: string;
  completedAt?: string;
}

export interface CreateBatchRequest {
  name?: string;
}

export interface StartBatchRequest {
  options?: {
    skipAudit?: boolean;
    autoRemediateOnly?: boolean;
  };
}

export interface GenerateAcrRequest {
  mode: 'individual' | 'aggregate';
  options?: {
    edition: 'VPAT2.5-508' | 'VPAT2.5-WCAG' | 'VPAT2.5-EU' | 'VPAT2.5-INT';
    batchName: string;
    vendor: string;
    contactEmail: string;
    aggregationStrategy: 'conservative' | 'optimistic';
  };
}

export interface BatchSSEEvent {
  type:
    | 'file_auditing'
    | 'file_audited'
    | 'file_planning'
    | 'file_planned'
    | 'file_remediating'
    | 'file_remediated'
    | 'file_failed'
    | 'batch_completed';
  batchId: string;
  fileId?: string;
  fileName?: string;
  [key: string]: unknown;
}

export interface BatchListResponse {
  batches: BatchListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface BatchExportResponse {
  downloadUrl: string;
}
