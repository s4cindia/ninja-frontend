/**
 * Plagiarism Check Types
 */

export type PlagiarismMatchType =
  | 'INTERNAL'
  | 'SELF_PLAGIARISM'
  | 'EXTERNAL_WEB'
  | 'EXTERNAL_ACADEMIC'
  | 'EXTERNAL_PUBLISHER';

export type PlagiarismClassification =
  | 'VERBATIM_COPY'
  | 'PARAPHRASED'
  | 'COMMON_PHRASE'
  | 'PROPERLY_CITED'
  | 'COINCIDENTAL'
  | 'NEEDS_REVIEW';

export type MatchReviewStatus =
  | 'PENDING'
  | 'CONFIRMED_PLAGIARISM'
  | 'FALSE_POSITIVE'
  | 'PROPERLY_ATTRIBUTED'
  | 'DISMISSED';

export type PlagiarismJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface PlagiarismCheckJob {
  id: string;
  documentId: string;
  status: PlagiarismJobStatus;
  progress: number;
  totalChunks: number;
  matchesFound: number;
  startedAt: string | null;
  completedAt: string | null;
  metadata: Record<string, unknown> | null;
  disclaimer?: string;
}

export interface PlagiarismMatch {
  id: string;
  documentId: string;
  sourceChunkId: string;
  matchedChunkId: string | null;
  externalSource: string | null;
  externalUrl: string | null;
  externalTitle: string | null;
  matchType: PlagiarismMatchType;
  similarityScore: number;
  classification: PlagiarismClassification;
  confidence: number;
  aiReasoning: string | null;
  sourceText: string;
  matchedText: string;
  status: MatchReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
}

export interface PlagiarismSummary {
  total: number;
  averageSimilarity: number;
  byType: Record<string, number>;
  byClassification: Record<string, number>;
  byStatus: Record<string, number>;
  disclaimer?: string;
}

export interface PlagiarismMatchFilters {
  matchType?: PlagiarismMatchType;
  classification?: PlagiarismClassification;
  status?: MatchReviewStatus;
  page?: number;
  limit?: number;
}

export interface PlagiarismMatchesResponse {
  matches: PlagiarismMatch[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const MATCH_TYPE_LABELS: Record<PlagiarismMatchType, { label: string; description: string }> = {
  INTERNAL: { label: 'Internal', description: 'Similar content within the same document' },
  SELF_PLAGIARISM: { label: 'Self-Plagiarism', description: 'Content reused from other documents' },
  EXTERNAL_WEB: { label: 'External Web', description: 'Content matching web sources' },
  EXTERNAL_ACADEMIC: { label: 'External Academic', description: 'Content matching academic publications' },
  EXTERNAL_PUBLISHER: { label: 'External Publisher', description: 'Content matching published works' },
};

export const CLASSIFICATION_LABELS: Record<PlagiarismClassification, { label: string; description: string }> = {
  VERBATIM_COPY: { label: 'Verbatim Copy', description: 'Word-for-word or near-identical copy' },
  PARAPHRASED: { label: 'Paraphrased', description: 'Same ideas rewritten in different words' },
  COMMON_PHRASE: { label: 'Common Phrase', description: 'Standard terminology or common expression' },
  PROPERLY_CITED: { label: 'Properly Cited', description: 'Quoted text with proper attribution' },
  COINCIDENTAL: { label: 'Coincidental', description: 'Similar wording that appears coincidental' },
  NEEDS_REVIEW: { label: 'Needs Review', description: 'Requires manual review' },
};

export const REVIEW_STATUS_LABELS: Record<MatchReviewStatus, { label: string; description: string }> = {
  PENDING: { label: 'Pending', description: 'Awaiting review' },
  CONFIRMED_PLAGIARISM: { label: 'Confirmed', description: 'Confirmed as plagiarism' },
  FALSE_POSITIVE: { label: 'False Positive', description: 'Not actually plagiarism' },
  PROPERLY_ATTRIBUTED: { label: 'Attributed', description: 'Properly cited/attributed' },
  DISMISSED: { label: 'Dismissed', description: 'Dismissed by reviewer' },
};
