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
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  formatted?: string;
  formattedEntry?: string;
  formattedApa?: string;
  formattedMla?: string;
  formattedChicago?: string;
  isEdited?: boolean;
  enrichmentSource?: 'crossref' | 'pubmed' | 'manual' | 'ai';
  crossrefEnriched?: boolean;
  enrichmentConfidence?: number;
  confidence?: number;
  needsReview?: boolean;
  reviewReason?: string;
}

export interface ReferenceListStats {
  total: number;
  enrichedWithDoi?: number;
  enrichedFromCrossRef?: number;
  enrichedFromPubMed?: number;
  manualEntries?: number;
  needsReview: number;
}

export interface ReferenceListResult {
  documentId?: string;
  styleCode?: string;
  status?: 'draft' | 'finalized';
  stats: ReferenceListStats;
  entries: ReferenceEntry[];
}

export interface GenerateReferenceListRequest {
  styleCode: string;
  options?: {
    enrichFromCrossRef?: boolean;
    enrichFromPubMed?: boolean;
  };
}
