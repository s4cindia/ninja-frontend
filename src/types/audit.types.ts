/**
 * Shared types for audit functionality across EPUB and PDF modules
 */

/**
 * Summary data returned after uploading and auditing a document
 */
export interface AuditSummary {
  jobId: string;
  fileName?: string;
  fileType: 'epub' | 'pdf';
  epubVersion?: string;
  pdfVersion?: string;
  isValid: boolean;
  accessibilityScore: number;
  issuesSummary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
}
