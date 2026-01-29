// Timestamp type for ISO 8601 formatted date strings
export type ISODateString = string;

// PDF Audit Status Types
export type PdfAuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

// PDF Issue Severity Types
export type PdfIssueSeverity = 'critical' | 'serious' | 'moderate' | 'minor';

// Matterhorn Checkpoint Status Types
export type MatterhornCheckpointStatus = 'passed' | 'failed' | 'not-applicable';

/**
 * PDF document metadata extracted during audit
 */
export interface PdfMetadata {
  /** Document title from PDF metadata */
  title?: string;
  /** Author name from PDF metadata */
  author?: string;
  /** Application that created the original document */
  creator?: string;
  /** Application that produced the PDF */
  producer?: string;
  /** PDF specification version (e.g., "1.7", "2.0") */
  pdfVersion: string;
  /** Whether the PDF contains accessibility tags */
  isTagged: boolean;
  /** Whether the PDF has a valid structure tree for accessibility */
  hasStructureTree: boolean;
  /** Primary language of the document (ISO 639 code) */
  language?: string;
}

/**
 * Individual Matterhorn Protocol checkpoint result
 * @see https://www.pdfa.org/resource/the-matterhorn-protocol/
 */
export interface MatterhornCheckpoint {
  /** Matterhorn checkpoint identifier (e.g., "01-001", "07-002") */
  id: string;
  /** Human-readable description of the checkpoint requirement */
  description: string;
  /** Validation status of this checkpoint */
  status: MatterhornCheckpointStatus;
  /** Number of issues found for this checkpoint (0 if passed) */
  issueCount: number;
}

/**
 * Matterhorn Protocol category grouping related checkpoints
 */
export interface MatterhornCategory {
  /** Category identifier (e.g., "01", "07") */
  id: string;
  /** Human-readable category name (e.g., "Document", "Fonts") */
  name: string;
  /** List of checkpoints within this category */
  checkpoints: MatterhornCheckpoint[];
}

/**
 * Summary of Matterhorn Protocol compliance checks
 * Provides high-level overview of PDF/UA validation results
 * @see https://www.pdfa.org/resource/the-matterhorn-protocol/
 */
export interface MatterhornSummary {
  /** Total number of Matterhorn checkpoints evaluated */
  totalCheckpoints: number;
  /** Number of checkpoints that passed validation */
  passed: number;
  /** Number of checkpoints that failed validation */
  failed: number;
  /** Number of checkpoints not applicable to this document */
  notApplicable: number;
  /** Grouped checkpoint results by category */
  categories: MatterhornCategory[];
}

/**
 * Individual accessibility issue found in PDF audit
 */
export interface PdfAuditIssue {
  /** Unique identifier for this issue */
  id: string;
  /** Rule or check identifier that detected this issue */
  ruleId: string;
  /** Severity level of the accessibility issue */
  severity: PdfIssueSeverity;
  /** Brief summary of the issue */
  message: string;
  /** Detailed explanation of the accessibility problem */
  description: string;
  /** PDF page number where issue was found (1-indexed) */
  pageNumber?: number;
  /** XPath or element path within PDF structure tree */
  elementPath?: string;
  /** Related WCAG 2.x success criteria (e.g., ["1.1.1", "4.1.2"]) */
  wcagCriteria?: string[];
  /** Associated Matterhorn Protocol checkpoint ID */
  matterhornCheckpoint?: string;
  /** Recommended remediation action */
  suggestedFix?: string;
}

/**
 * Complete PDF accessibility audit result
 */
export interface PdfAuditResult {
  /** Unique identifier for this audit result */
  id: string;
  /** Associated job ID that generated this audit */
  jobId: string;
  /** Original PDF filename */
  fileName: string;
  /** File size in bytes */
  fileSize: number;
  /** Total number of pages in the PDF */
  pageCount: number;
  /** Overall accessibility score (0-100) */
  score: number;
  /** Current status of the audit process */
  status: PdfAuditStatus;
  /** Timestamp when audit was initiated */
  createdAt: ISODateString;
  /** Timestamp when audit completed (if finished) */
  completedAt?: ISODateString;
  /** List of accessibility issues found */
  issues: PdfAuditIssue[];
  /** Matterhorn Protocol compliance summary */
  matterhornSummary: MatterhornSummary;
  /** Extracted PDF document metadata */
  metadata: PdfMetadata;
}

/**
 * API response wrapper for single PDF audit result
 */
export interface PdfAuditResponse {
  /** Whether the request was successful */
  success: boolean;
  /** The PDF audit result data */
  data: PdfAuditResult;
}

/**
 * API response wrapper for paginated list of PDF audit results
 */
export interface PdfAuditListResponse {
  /** Whether the request was successful */
  success: boolean;
  /** Array of PDF audit results */
  data: PdfAuditResult[];
  /** Pagination metadata */
  pagination: {
    /** Total number of results across all pages */
    total: number;
    /** Current page number (1-indexed) */
    page: number;
    /** Number of results per page */
    limit: number;
  };
}

/**
 * Filter options for querying PDF audit results and issues
 */
export interface PdfAuditFilters {
  /** Filter by audit status */
  status?: PdfAuditStatus;
  /** Filter by issue severity level */
  severity?: PdfIssueSeverity;
  /** Filter by Matterhorn category ID (type-safe reference) */
  matterhornCategory?: MatterhornCategory['id'];
  /** Filter by specific page number */
  pageNumber?: number;
  /** Filter by page range (inclusive) */
  pageRange?: {
    /** Starting page number */
    from: number;
    /** Ending page number */
    to: number;
  };
}
