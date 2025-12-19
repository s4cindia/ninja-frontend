export type AltTextFlag = 
  | 'FACE_DETECTED'
  | 'TEXT_IN_IMAGE'
  | 'LOW_CONFIDENCE'
  | 'SENSITIVE_CONTENT'
  | 'COMPLEX_SCENE'
  | 'NEEDS_MANUAL_REVIEW'
  | 'REGENERATED'
  | 'PARSE_ERROR'
  | 'DATA_VISUALIZATION'
  | 'DATA_EXTRACTED'
  | 'COMPLEX_IMAGE';

export type AltTextStatus = 'pending' | 'needs_review' | 'approved' | 'edited' | 'rejected';

export type ImageType = 
  | 'BAR_CHART'
  | 'LINE_CHART'
  | 'PIE_CHART'
  | 'SCATTER_PLOT'
  | 'FLOWCHART'
  | 'ORG_CHART'
  | 'DIAGRAM'
  | 'TABLE_IMAGE'
  | 'MAP'
  | 'INFOGRAPHIC'
  | 'PHOTO'
  | 'UNKNOWN';

export interface AltTextGenerationResult {
  id?: string;
  imageId: string;
  shortAlt: string;
  extendedAlt: string;
  confidence: number;
  flags: AltTextFlag[];
  aiModel: string;
  generatedAt: string;
  needsReview?: boolean;
}

export interface GeneratedAltText {
  id: string;
  imageId: string;
  jobId: string;
  shortAlt: string;
  extendedAlt?: string;
  confidence: number;
  flags: AltTextFlag[];
  aiModel: string;
  status: AltTextStatus;
  approvedAlt?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string;
}

export interface DocumentContext {
  textBefore: string;
  textAfter: string;
  nearestHeading: string;
  caption?: string;
  documentTitle: string;
  chapterTitle?: string;
  pageNumber?: number;
}
