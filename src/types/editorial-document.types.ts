export interface EditorialDocument {
  id: string;
  jobId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  wordCount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  referenceListStatus: string | null;
  counts: {
    citations: number;
    validations: number;
    referenceEntries: number;
  };
  links: {
    overview: string;
    job: string;
  };
}

export interface EditorialDocumentListResult {
  documents: EditorialDocument[];
  total: number;
  limit: number;
  offset: number;
}

export interface EditorialDocumentOverview {
  document: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
    wordCount: number;
    pageCount: number | null;
    title: string | null;
    authors: string[];
    language: string | null;
    status: string;
    parsedAt: string | null;
    createdAt: string;
    updatedAt: string;
    referenceListStatus: string | null;
    referenceListStyle: string | null;
    referenceListGeneratedAt: string | null;
  };
  counts: {
    citations: number;
    validations: number;
    corrections: number;
    referenceEntries: number;
  };
  lastValidation: {
    styleCode: string;
    validatedAt: string;
  } | null;
  jobs: Array<{
    jobId: string;
    type: string;
    status: string;
    createdAt: string;
    completedAt: string | null;
    error: string | null;
    url: string;
  }>;
  links: Record<string, string>;
}

export interface DetectionWithValidation {
  documentId: string;
  jobId: string;
  filename: string;
  citations: unknown[];
  totalCount: number;
  byType: Record<string, number>;
  byStyle: Record<string, number>;
  processingTimeMs: number;
  validation?: {
    styleCode: string;
    styleName: string;
    totalCitations: number;
    validCitations: number;
    citationsWithErrors: number;
    citationsWithWarnings: number;
    errorCount: number;
    warningCount: number;
    violations: Array<{
      citationId: string;
      citationText: string;
      violationType: string;
      ruleReference: string;
      ruleName: string;
      explanation: string;
      originalText: string;
      suggestedFix: string;
      correctedCitation: string;
      severity: 'error' | 'warning' | 'info';
    }>;
  };
}
