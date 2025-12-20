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

export interface DataTableRow {
  label: string;
  values: (string | number)[];
}

export interface ChartDescription {
  imageId: string;
  imageType: ImageType;
  shortAlt: string;
  longDescription: string;
  dataTable?: DataTableRow[];
  trends?: string[];
  keyFindings?: string[];
  confidence: number;
  flags: string[];
  aiModel: string;
  generatedAt: string;
  needsLongDescription?: boolean;
}

export interface LongDescription {
  id: string;
  imageId: string;
  jobId: string;
  altTextId?: string;
  trigger: string;
  content: {
    html: string;
    plainText: string;
    markdown: string;
  };
  wordCount: number;
  sections?: DescriptionSection[];
  status: 'pending' | 'approved' | 'edited';
  approvedBy?: string;
  approvedAt?: string;
  aiModel: string;
  createdAt: string;
  updatedAt: string;
}

export interface DescriptionSection {
  heading: string;
  content: string;
}

export interface AriaMarkup {
  imgTag: string;
  descriptionDiv: string;
}

export type LongDescriptionTrigger = 
  | 'COMPLEX_CHART'
  | 'MANY_COMPONENTS'
  | 'DENSE_INFORMATION'
  | 'DATA_TABLE'
  | 'FLOWCHART'
  | 'MANUAL_REQUEST';
