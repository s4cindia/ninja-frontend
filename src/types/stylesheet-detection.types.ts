export interface DetectedStyle {
  styleCode: string;
  styleName: string;
  confidence: number;
  citationFormat: string;
  evidence: string[];
}

export interface SequenceGap {
  from?: number;
  to?: number;
  after?: number;
  before?: number;
}

export interface SequenceAnalysis {
  isSequential: boolean;
  totalNumbers?: number;
  expectedRange: { start: number; end: number } | null;
  missingNumbers: number[];
  duplicates?: number[];
  duplicateNumbers?: number[];
  outOfOrder?: number[];
  outOfOrderNumbers?: number[];
  gaps: SequenceGap[];
  summary: string;
}

export interface UncitedReference {
  number: number;
  text: string;
  entryIndex: number;
}

export interface OrphanedCitation {
  number: number;
  text: string;
}

export interface CrossReference {
  totalBodyCitations: number;
  totalReferenceEntries: number;
  matched: number;
  citationsWithoutReference: OrphanedCitation[];
  referencesWithoutCitation: UncitedReference[];
  summary: string;
}

export interface ReferenceEntry {
  index: number;
  number: number;
  text: string;
  matchedCitationIds: string[];
  hasMatch: boolean;
}

export interface ReferenceListData {
  totalEntries: number;
  entries: ReferenceEntry[];
}

export interface CitationCounts {
  totalCount: number;
  inBody: number;
  inReferences: number;
  items?: CitationItem[];
}

export interface StylesheetDetectionResult {
  documentId: string;
  jobId?: string;
  filename?: string;
  processingTimeMs?: number;
  detectedStyle?: DetectedStyle | null;
  sequenceAnalysis?: SequenceAnalysis | null;
  crossReference?: CrossReference | null;
  referenceList?: ReferenceListData | null;
  citations?: CitationCounts | null;
  conversionOptions?: string[];
}

export interface DocumentTextResponse {
  documentId: string;
  fullText: string;
  fullHtml?: string | null;
  filename?: string;
}

export interface CitationItem {
  id: string;
  rawText: string;
  citationType: string;
  detectedStyle: string;
  startOffset: number;
  endOffset: number;
  confidence: number;
  pageNumber: number | null;
  paragraphIndex: number | null;
  primaryComponentId: string | null;
  isParsed: boolean;
  parseConfidence: number | null;
}

export type IssueSeverity = 'error' | 'warning';
export type IssueStatus = 'pending' | 'accepted' | 'dismissed';
export type ValidationIssueType =
  | 'DUPLICATE_CITATION'
  | 'MISSING_CITATION_NUMBER'
  | 'CITATION_WITHOUT_REFERENCE'
  | 'REFERENCE_WITHOUT_CITATION'
  | 'OUT_OF_ORDER'
  | 'SEQUENCE_GAP';

export interface FixOption {
  id: string;
  label: string;
}

export interface CitationIssue {
  id: string;
  severity: IssueSeverity;
  category: 'sequence' | 'cross-reference' | 'conversion';
  title: string;
  description: string;
  fixOptions: FixOption[];
  selectedFix?: string;
  status: IssueStatus;
  citationNumbers?: number[];
}

export interface ValidationIssue {
  id: string;
  severity: IssueSeverity;
  type: ValidationIssueType;
  title: string;
  detail: string;
  citationNumbers: number[];
}

export interface ValidationSummary {
  totalBodyCitations: number;
  totalReferences: number;
  matched: number;
  duplicates: number;
  missingInSequence: number;
  orphanedCitations: number;
  uncitedReferences: number;
}

export interface ValidationResult {
  documentId: string;
  totalIssues: number;
  errors: number;
  warnings: number;
  issues: ValidationIssue[];
  referenceLookup: Record<string, string | null>;
  summary: ValidationSummary;
}

export interface ReferenceLookupResponse {
  documentId: string;
  totalReferences: number;
  lookupMap: Record<string, string | null>;
  crossReference?: CrossReference;
  sequenceAnalysis?: SequenceAnalysis;
}
