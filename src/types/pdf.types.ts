import type { IssueSeverity } from './accessibility.types';

/**
 * Timestamp type for ISO 8601 formatted date strings
 * @example "2024-01-15T10:30:00.000Z"
 */
export type ISODateString = string;

// PDF Audit Status Types
export type PdfAuditStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Matterhorn Checkpoint Status Types
export type MatterhornCheckpointStatus = 'passed' | 'failed' | 'not-applicable';

// Constants for runtime use
export const PDF_AUDIT_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export const MATTERHORN_CHECKPOINT_STATUSES = ['passed', 'failed', 'not-applicable'] as const;

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
  severity: IssueSeverity;
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
 * API error structure
 */
export interface ApiError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Additional error details or validation errors */
  details?: unknown[];
}

/**
 * API response wrapper for single PDF audit result (discriminated union)
 */
export type PdfAuditResponse =
  | {
      /** Request succeeded */
      success: true;
      /** The PDF audit result data */
      data: PdfAuditResult;
    }
  | {
      /** Request failed */
      success: false;
      /** Error information */
      error: ApiError;
    };

/**
 * API response wrapper for paginated list of PDF audit results (discriminated union)
 */
export type PdfAuditListResponse =
  | {
      /** Request succeeded */
      success: true;
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
  | {
      /** Request failed */
      success: false;
      /** Error information */
      error: ApiError;
    };

/**
 * Filter options for querying PDF audit results and issues
 */
export interface PdfAuditFilters {
  /** Filter by audit status */
  status?: PdfAuditStatus;
  /** Filter by issue severity level */
  severity?: IssueSeverity;
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

// ============================================================================
// Runtime Type Guards
// ============================================================================

/**
 * Type guard to check if a value is a valid PdfAuditStatus
 */
export function isPdfAuditStatus(value: unknown): value is PdfAuditStatus {
  return typeof value === 'string' && PDF_AUDIT_STATUSES.includes(value as PdfAuditStatus);
}

/**
 * Type guard to check if a value is a valid MatterhornCheckpointStatus
 */
export function isMatterhornCheckpointStatus(value: unknown): value is MatterhornCheckpointStatus {
  return typeof value === 'string' && MATTERHORN_CHECKPOINT_STATUSES.includes(value as MatterhornCheckpointStatus);
}

/**
 * Type guard to validate PdfMetadata structure
 */
export function isPdfMetadata(value: unknown): value is PdfMetadata {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.pdfVersion === 'string' &&
    typeof obj.isTagged === 'boolean' &&
    typeof obj.hasStructureTree === 'boolean'
  );
}

/**
 * Type guard to validate PdfAuditIssue structure
 */
export function isPdfAuditIssue(value: unknown): value is PdfAuditIssue {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.ruleId === 'string' &&
    typeof obj.severity === 'string' &&
    typeof obj.message === 'string' &&
    typeof obj.description === 'string'
  );
}

/**
 * Type guard to validate PdfAuditResult structure
 */
export function isPdfAuditResult(value: unknown): value is PdfAuditResult {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    typeof obj.jobId === 'string' &&
    typeof obj.fileName === 'string' &&
    typeof obj.fileSize === 'number' &&
    typeof obj.pageCount === 'number' &&
    typeof obj.score === 'number' &&
    isPdfAuditStatus(obj.status) &&
    typeof obj.createdAt === 'string' &&
    Array.isArray(obj.issues) &&
    typeof obj.matterhornSummary === 'object' &&
    isPdfMetadata(obj.metadata)
  );
}

/**
 * Type guard to validate successful PdfAuditResponse
 */
export function isPdfAuditResponse(value: unknown): value is PdfAuditResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.success === true) {
    return isPdfAuditResult(obj.data);
  }

  if (obj.success === false) {
    return (
      typeof obj.error === 'object' &&
      obj.error !== null &&
      typeof (obj.error as Record<string, unknown>).code === 'string' &&
      typeof (obj.error as Record<string, unknown>).message === 'string'
    );
  }

  return false;
}

/**
 * Type guard to validate successful PdfAuditListResponse
 */
export function isPdfAuditListResponse(value: unknown): value is PdfAuditListResponse {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;

  if (obj.success === true) {
    return (
      Array.isArray(obj.data) &&
      typeof obj.pagination === 'object' &&
      obj.pagination !== null
    );
  }

  if (obj.success === false) {
    return (
      typeof obj.error === 'object' &&
      obj.error !== null &&
      typeof (obj.error as Record<string, unknown>).code === 'string' &&
      typeof (obj.error as Record<string, unknown>).message === 'string'
    );
  }

  return false;
}
