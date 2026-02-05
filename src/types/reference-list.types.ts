export interface ReferenceAuthor {
  firstName?: string;
  lastName: string;
  suffix?: string;
}

export interface ReferenceEntry {
  id: string;
  citationIds?: string[];
  sourceType: 'journal' | 'book' | 'chapter' | 'conference' | 'website' | 'unknown';
  authors: ReferenceAuthor[];
  year?: string;
  title: string;
  journalName?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  formatted: string;
  formattedApa?: string;
  formattedMla?: string;
  isEdited?: boolean;
  enrichmentSource: 'crossref' | 'pubmed' | 'manual' | 'ai';
  enrichmentConfidence: number;
  needsReview: boolean;
  reviewReason?: string;
}

export interface ReferenceListSummary {
  totalEntries: number;
  enrichedFromCrossRef: number;
  enrichedFromPubMed: number;
  manualEntries: number;
  needsReview: number;
}

export interface ReferenceListResult {
  documentId: string;
  styleCode: string;
  status: 'draft' | 'finalized';
  summary: ReferenceListSummary;
  entries: ReferenceEntry[];
}

export interface GenerateReferenceListRequest {
  styleCode: string;
  options?: {
    enrichFromCrossRef?: boolean;
    enrichFromPubMed?: boolean;
  };
}
