/**
 * Citation Intelligence Tool - TypeScript Types
 */

export type CitationJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type VerificationStatus = 'VERIFIED' | 'AI_SUGGESTED' | 'BROKEN' | 'PENDING';

export type CitationIssueType =
  | 'MISSING_DOI'
  | 'DUPLICATE_REFERENCE'
  | 'UNCITED_REFERENCE'
  | 'CITATION_MISMATCH'
  | 'FORMATTING_INCONSISTENCY'
  | 'NUMBERING_MISMATCH';

export type IssueSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'INFO';

export interface ReferenceChange {
  timestamp: string;
  note?: string;
  previousText: string;
  newText: string;
}

export interface CitationJob {
  id: string;
  tenantId: string;
  userId: string;
  originalFilename: string;
  fileUrl: string;
  status: CitationJobStatus;
  processingTime: number | null;
  totalReferences: number | null;
  totalCitations: number | null;
  totalIssues: number | null;
  detectedStyle: string | null;
  styleConfidence: number | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CitationReference {
  id: string;
  jobId: string;
  number: number;
  originalText: string;
  correctedText: string | null;
  doi: string | null;
  doiVerified: boolean;
  verificationStatus: VerificationStatus;
  confidence: number | null;
  metadata: ReferenceMetadata | null;
  changes: ReferenceChange[] | null;
  needsReview: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReferenceMetadata {
  doi: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  volume: string;
  issue: string;
  pages: string;
  publisher: string;
  type: string;
}

export interface InTextCitation {
  id: string;
  jobId: string;
  number: number;
  location: {
    paragraph: number;
    position: number;
  };
  context: string;
  matchedReferenceId: string | null;
  createdAt: string;
}

export interface IssueLocation {
  paragraphIndex?: number;
  citationIndex?: number;
  referenceIndex?: number;
  startOffset?: number;
  endOffset?: number;
}

export interface CitationIssue {
  id: string;
  jobId: string;
  type: CitationIssueType;
  severity: IssueSeverity;
  description: string;
  location: IssueLocation | null;
  resolved: boolean;
  createdAt: string;
}

export interface AnalysisResult {
  document: {
    id: string;
    filename: string;
    status: string;
    wordCount: number;
    pageCount?: number;
    fullText?: string;
    fullHtml?: string;
    statistics: {
      totalCitations: number;
      totalReferences: number;
    };
  };
  citations: InTextCitation[];
  references: CitationReference[];
  detectedStyle: string;
  validations?: CitationIssue[];
}

export interface UploadResponse {
  jobId?: string;
  documentId?: string;
  status: CitationJobStatus | 'COMPLETED';
  message?: string;
}

export interface DOIVerificationResult {
  status: VerificationStatus;
  doi: string | null;
  confidence: number;
  metadata: ReferenceMetadata | null;
  suggestedCorrections: string[];
}

export interface ManuscriptResponse {
  jobId: string;
  filename?: string;
  highlightedHtml: string;
  citations: InTextCitation[];
  references: CitationReference[];
}
