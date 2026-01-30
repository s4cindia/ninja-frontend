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

// Citation from detection (US-4.1)
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
  confidence: number;
  createdAt: string;
  updatedAt: string;
  // Primary component pattern (from schema)
  primaryComponentId: string | null;
  primaryComponent?: CitationComponent;
  // AC-26: Aggregated review status from primary component
  needsReview: boolean;
}

// Parsed citation component (US-4.2)
export interface CitationComponent {
  id: string;
  citationId: string;
  parseVariant: string | null;   // Which style was used to parse (e.g., "APA", "MLA")
  confidence: number;            // Overall parse confidence (0-100 percentage)
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
  fieldConfidence: Record<string, number>;  // Field-level confidence (0-100 percentages)
  // Validation fields
  doiVerified: boolean | null;
  urlValid: boolean | null;
  urlCheckedAt: string | null;
  // AC-26: Explicit flag for ambiguous/incomplete citations
  needsReview: boolean;          // True if citation is ambiguous or incomplete
  reviewReasons: string[];       // Reasons why review is needed
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
  documentId: string;
  citations: Citation[];
  totalCount: number;
  byType: Record<CitationType, number>;
  byStyle: Record<CitationStyle, number>;
}

// Bulk parse result
export interface BulkParseResult {
  documentId: string;
  parsed: number;
  failed: number;
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
