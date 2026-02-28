/**
 * Integrity Check Types
 */

export type IntegrityCheckType =
  | 'FIGURE_REF'
  | 'TABLE_REF'
  | 'EQUATION_REF'
  | 'BOX_REF'
  | 'CITATION_REF'
  | 'SECTION_NUMBERING'
  | 'FIGURE_NUMBERING'
  | 'TABLE_NUMBERING'
  | 'EQUATION_NUMBERING'
  | 'UNIT_CONSISTENCY'
  | 'ABBREVIATION'
  | 'CROSS_REF'
  | 'DUPLICATE_CONTENT'
  | 'HEADING_HIERARCHY'
  | 'ALT_TEXT'
  | 'TABLE_STRUCTURE'
  | 'FOOTNOTE_REF'
  | 'TOC_CONSISTENCY'
  | 'ISBN_FORMAT'
  | 'DOI_FORMAT'
  | 'TERMINOLOGY'
  | 'ACCESSIBILITY'
  | 'NUMBERING_SEQUENCE'
  | 'FIGURE_TABLE_REF'
  | 'EQUATION_BOX_REF'
  | 'IDENTIFIER_FORMAT';

export type IntegritySeverity = 'ERROR' | 'WARNING' | 'SUGGESTION';
export type IntegrityIssueStatus = 'PENDING' | 'FIXED' | 'IGNORED' | 'WONT_FIX' | 'AUTO_FIXED';
export type IntegrityJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface IntegrityCheckJob {
  id: string;
  status: IntegrityJobStatus;
  progress: number;
  totalChecks: number;
  issuesFound: number;
  checkTypes: string[];
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
}

export interface IntegrityIssue {
  id: string;
  documentId: string;
  jobId: string;
  checkType: IntegrityCheckType;
  severity: IntegritySeverity;
  title: string;
  description: string;
  startOffset: number | null;
  endOffset: number | null;
  originalText: string | null;
  expectedValue: string | null;
  actualValue: string | null;
  suggestedFix: string | null;
  context: string | null;
  status: IntegrityIssueStatus;
  resolvedAt: string | null;
  resolvedBy: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface IntegrityIssueSummary {
  total: number;
  errors: number;
  warnings: number;
  suggestions: number;
  pending: number;
  fixed: number;
}

export type IntegritySummaryMap = Record<string, IntegrityIssueSummary>;

export interface IntegrityIssuesResponse {
  issues: IntegrityIssue[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface IntegrityIssueFilters {
  checkType?: IntegrityCheckType;
  severity?: IntegritySeverity;
  status?: IntegrityIssueStatus;
  page?: number;
  limit?: number;
}

export interface StartIntegrityCheckInput {
  documentId: string;
  checkTypes?: IntegrityCheckType[];
}

/** Convert SNAKE_CASE to Title Case as a fallback for unknown check types */
export function formatCheckTypeLabel(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Get the display label for any check type (known or unknown) */
export function getCheckTypeLabel(type: string): string {
  return INTEGRITY_CHECK_LABELS[type]?.label ?? formatCheckTypeLabel(type);
}

/** Labels and metadata for each check type */
export const INTEGRITY_CHECK_LABELS: Record<string, { label: string; description: string }> = {
  FIGURE_REF: { label: 'Figure References', description: 'Figure callouts vs captions' },
  TABLE_REF: { label: 'Table References', description: 'Table callouts vs captions' },
  EQUATION_REF: { label: 'Equation References', description: 'Equation callouts vs labels' },
  BOX_REF: { label: 'Box References', description: 'Box callouts vs labels' },
  CITATION_REF: { label: 'Citation References', description: 'Cited vs listed references' },
  SECTION_NUMBERING: { label: 'Section Numbering', description: 'Sequential section numbers' },
  FIGURE_NUMBERING: { label: 'Figure Numbering', description: 'Sequential figure numbers' },
  TABLE_NUMBERING: { label: 'Table Numbering', description: 'Sequential table numbers' },
  EQUATION_NUMBERING: { label: 'Equation Numbering', description: 'Sequential equation numbers' },
  UNIT_CONSISTENCY: { label: 'Unit Consistency', description: 'Consistent unit forms' },
  ABBREVIATION: { label: 'Abbreviations', description: 'Abbreviation definitions and usage' },
  CROSS_REF: { label: 'Cross-References', description: '"See Section X" validation' },
  DUPLICATE_CONTENT: { label: 'Duplicate Content', description: 'Similar paragraph detection' },
  HEADING_HIERARCHY: { label: 'Heading Hierarchy', description: 'Heading level structure and ordering' },
  ALT_TEXT: { label: 'Alt Text', description: 'Image alternative text validation' },
  TABLE_STRUCTURE: { label: 'Table Structure', description: 'Table header and accessibility structure' },
  FOOTNOTE_REF: { label: 'Footnote References', description: 'Footnote markers vs entries' },
  TOC_CONSISTENCY: { label: 'Table of Contents', description: 'TOC entries vs document headings' },
  ISBN_FORMAT: { label: 'ISBN Format', description: 'ISBN identifier validation' },
  DOI_FORMAT: { label: 'DOI Format', description: 'DOI identifier validation' },
  TERMINOLOGY: { label: 'Terminology', description: 'Consistent terminology usage' },
  ACCESSIBILITY: { label: 'Accessibility', description: 'General accessibility checks' },
  NUMBERING_SEQUENCE: { label: 'Numbering Sequence', description: 'Sequential numbering validation' },
  FIGURE_TABLE_REF: { label: 'Figure & Table Refs', description: 'Combined figure/table references' },
  EQUATION_BOX_REF: { label: 'Equation & Box Refs', description: 'Combined equation/box references' },
  IDENTIFIER_FORMAT: { label: 'Identifier Format', description: 'ISBN, DOI, and other identifiers' },
};
