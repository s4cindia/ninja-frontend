/**
 * Citation Management Types
 * Frontend types for US-4.1 (Detection) and US-4.2 (Parsing)
 */

// Type aliases (must be declared before constants that reference them)
export type CitationType =
  | 'PARENTHETICAL'
  | 'NARRATIVE'
  | 'FOOTNOTE'
  | 'ENDNOTE'
  | 'NUMERIC'
  | 'UNKNOWN';

export type CitationStyle =
  | 'APA'
  | 'MLA'
  | 'CHICAGO'
  | 'VANCOUVER'
  | 'HARVARD'
  | 'IEEE'
  | 'UNKNOWN';

export type SourceType =
  | 'JOURNAL_ARTICLE'
  | 'BOOK'
  | 'BOOK_CHAPTER'
  | 'CONFERENCE_PAPER'
  | 'WEBSITE'
  | 'THESIS'
  | 'REPORT'
  | 'NEWSPAPER'
  | 'MAGAZINE'
  | 'PATENT'
  | 'LEGAL'
  | 'PERSONAL_COMMUNICATION'
  | 'UNKNOWN';

// Confidence thresholds for display
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

// Citation type options for filters
export const CITATION_TYPE_OPTIONS: CitationType[] = [
  'PARENTHETICAL',
  'NARRATIVE',
  'FOOTNOTE',
  'ENDNOTE',
  'NUMERIC',
  'UNKNOWN',
];

// Citation style options for filters
export const CITATION_STYLE_OPTIONS: CitationStyle[] = [
  'APA',
  'MLA',
  'CHICAGO',
  'VANCOUVER',
  'HARVARD',
  'IEEE',
  'UNKNOWN',
];

// Source type options
export const SOURCE_TYPE_OPTIONS: SourceType[] = [
  'JOURNAL_ARTICLE',
  'BOOK',
  'BOOK_CHAPTER',
  'CONFERENCE_PAPER',
  'WEBSITE',
  'THESIS',
  'REPORT',
  'NEWSPAPER',
  'MAGAZINE',
  'PATENT',
  'LEGAL',
  'PERSONAL_COMMUNICATION',
  'UNKNOWN',
];

/**
 * Citation from detection (US-4.1)
 * 
 * Confidence values:
 * - All confidence fields are stored as 0-100 integers (percentages)
 * - Backend may return 0-1 floats; use normalizeConfidence() from citation.utils.ts to convert
 * - Use CONFIDENCE_THRESHOLDS for display logic (HIGH: 80+, MEDIUM: 50+)
 */
export interface Citation {
  id: string;
  documentId: string;
  rawText: string;
  citationType: CitationType;
  detectedStyle: CitationStyle | null;
  pageNumber: number | null;
  paragraphIndex: number | null;
  startOffset: number;
  endOffset: number;
  /** Detection confidence as 0-100 percentage. Use normalizeConfidence() if backend returns 0-1. */
  confidence: number;
  createdAt: string;
  updatedAt: string;
  primaryComponentId: string | null;
  primaryComponent?: CitationComponent;
  /** AC-26: Aggregated review status from primary component */
  needsReview: boolean;
}

/**
 * Parsed citation component (US-4.2)
 * 
 * Confidence values:
 * - All confidence fields are stored as 0-100 integers (percentages)
 * - Backend may return 0-1 floats; use normalizeConfidence() from citation.utils.ts to convert
 * - Use CONFIDENCE_THRESHOLDS for display logic (HIGH: 80+, MEDIUM: 50+)
 */
export interface CitationComponent {
  id: string;
  citationId: string;
  /** Which style was used to parse (e.g., "APA", "MLA") */
  parseVariant: string | null;
  /** Overall parse confidence as 0-100 percentage. Use normalizeConfidence() if backend returns 0-1. */
  confidence: number;
  authors: string[];
  year: string | null;
  title: string | null;
  source: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  publisher: string | null;
  edition: string | null;
  accessDate: string | null;
  sourceType: SourceType | null;
  /** Field-level confidence as 0-100 percentages. Use normalizeConfidence() if backend returns 0-1. */
  fieldConfidence: Record<string, number>;
  doiVerified: boolean | null;
  urlValid: boolean | null;
  urlCheckedAt: string | null;
  /** AC-26: True if citation is ambiguous or incomplete and requires manual review */
  needsReview: boolean;
  /** Reasons why review is needed (see REVIEW_REASON_LABELS for display text) */
  reviewReasons: string[];
  createdAt: string;
}

// AC-26: Review reason labels for display
export const REVIEW_REASON_LABELS: Record<string, string> = {
  'Overall parse confidence below 70%': 'Low confidence',
  'One or more fields have confidence below 50%': 'Uncertain fields',
  'No authors could be extracted': 'Missing authors',
  'Publication year could not be determined': 'Missing year',
  'Title could not be extracted': 'Missing title',
  'Source type could not be determined': 'Unknown source type',
  'DOI format appears invalid': 'Invalid DOI',
  'URL format appears invalid': 'Invalid URL',
};

// Detection result summary
export interface DetectionResult {
  jobId: string;
  documentId: string;
  citations: Citation[];
  totalCount: number;
  byType: Record<CitationType, number>;
  byStyle: Record<CitationStyle, number>;
}

// Bulk parse result
export interface BulkParseResult {
  documentId: string;
  /** Backend-generated message describing the result (e.g., "All 11 citations parsed successfully") */
  message: string;
  parsed: number;
  skipped: number;
  failed: number;
  averageConfidence: number;
  stats: {
    total: number;
    parsed: number;
    unparsed: number;
  };
  results: Array<{
    citationId: string;
    componentId: string;
    success: boolean;
    error?: string;
  }>;
}

// Filter options for citation list
export interface CitationFilters {
  type?: CitationType;
  style?: CitationStyle;
  minConfidence?: number;
  maxConfidence?: number;        // For filtering low confidence items
  needsReview?: boolean;         // AC-26: Filter by review status
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedCitations {
  items: Citation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  documentId?: string;
  jobId?: string;
}

// Statistics for dashboard
export interface CitationStats {
  total: number;
  parsed: number;
  unparsed: number;
  needsReview: number;           // AC-26: Count of citations flagged for review
  byType: Record<CitationType, number>;
  byStyle: Record<CitationStyle, number>;
  averageConfidence: number;
}
