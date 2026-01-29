// PDF Audit Status Types
export type PdfAuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

// PDF Issue Severity Types
export type PdfIssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

// Matterhorn Checkpoint Status Types
export type MatterhornCheckpointStatus = 'passed' | 'failed' | 'not-applicable';

// PDF Metadata Interface
export interface PdfMetadata {
  title?: string;
  author?: string;
  creator?: string;
  producer?: string;
  pdfVersion: string;
  isTagged: boolean;
  hasStructureTree: boolean;
  language?: string;
}

// Matterhorn Checkpoint Interface
export interface MatterhornCheckpoint {
  id: string;
  description: string;
  status: MatterhornCheckpointStatus;
  issueCount: number;
}

// Matterhorn Category Interface
export interface MatterhornCategory {
  id: string;
  name: string;
  checkpoints: MatterhornCheckpoint[];
}

// Matterhorn Summary Interface
export interface MatterhornSummary {
  totalCheckpoints: number;
  passed: number;
  failed: number;
  notApplicable: number;
  categories: MatterhornCategory[];
}

// PDF Audit Issue Interface
export interface PdfAuditIssue {
  id: string;
  ruleId: string;
  severity: PdfIssueSeverity;
  message: string;
  description: string;
  pageNumber?: number;
  elementPath?: string;
  wcagCriteria?: string[];
  matterhornCheckpoint?: string;
  suggestedFix?: string;
}

// PDF Audit Result Interface
export interface PdfAuditResult {
  id: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  pageCount: number;
  score: number;
  status: PdfAuditStatus;
  createdAt: string;
  completedAt?: string;
  issues: PdfAuditIssue[];
  matterhornSummary: MatterhornSummary;
  metadata: PdfMetadata;
}

// API Response Types
export interface PdfAuditResponse {
  success: boolean;
  data: PdfAuditResult;
}

export interface PdfAuditListResponse {
  success: boolean;
  data: PdfAuditResult[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// Filter Types
export interface PdfAuditFilters {
  status?: PdfAuditStatus;
  severity?: PdfIssueSeverity;
  matterhornCategory?: string;
  pageNumber?: number;
}
