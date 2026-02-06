export interface DetectedStyle {
  styleCode: string;
  styleName: string;
  confidence: number;
  citationFormat: string;
  evidence: string[];
}

export interface SequenceGap {
  from: number;
  to: number;
}

export interface SequenceAnalysis {
  isSequential: boolean;
  expectedRange: { start: number; end: number };
  missingNumbers: number[];
  duplicates: number[];
  outOfOrder: number[];
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
}

export interface StylesheetDetectionResult {
  documentId: string;
  jobId: string;
  filename: string;
  processingTimeMs: number;
  detectedStyle: DetectedStyle;
  sequenceAnalysis: SequenceAnalysis;
  crossReference: CrossReference;
  referenceList: ReferenceListData;
  citations: CitationCounts;
  conversionOptions: string[];
}
