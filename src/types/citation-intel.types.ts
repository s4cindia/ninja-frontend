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
  changes: string[] | null;
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

export interface CitationIssue {
  id: string;
  jobId: string;
  type: CitationIssueType;
  severity: IssueSeverity;
  description: string;
  location: any;
  resolved: boolean;
  createdAt: string;
}

export interface AnalysisResult {
  jobId: string;
  processingTime: number;
  totalIssues: number;
  breakdown: {
    missingDois: number;
    duplicates: number;
    uncited: number;
    mismatches: number;
    formattingIssues: number;
    numberingMismatches: number;
  };
  stats: {
    totalReferences: number;
    totalCitations: number;
    detectedStyle: string;
    confidence: number;
  };
}

export interface UploadResponse {
  jobId: string;
  status: CitationJobStatus;
  message: string;
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
