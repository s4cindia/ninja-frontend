export interface CitationStyle {
  code: string;
  name: string;
  version: string;
}

export interface ValidationViolation {
  id: string;
  citationId: string;
  citationText: string;
  violationType: 'punctuation' | 'capitalization' | 'author_format' | 'date_format' | 'italics' | 'order';
  ruleReference: string;
  ruleName: string;
  explanation: string;
  originalText: string;
  suggestedFix: string;
  correctedCitation: string;
  severity: 'error' | 'warning' | 'info';
  status: 'pending' | 'accepted' | 'rejected' | 'edited';
}

export interface ValidationSummary {
  totalCitations: number;
  validCitations: number;
  citationsWithErrors: number;
  citationsWithWarnings: number;
  errorCount: number;
  warningCount: number;
}

export interface ValidationResult {
  documentId: string;
  styleCode: string;
  styleName: string;
  summary: ValidationSummary;
  violations: ValidationViolation[];
}

export interface ValidateDocumentRequest {
  styleCode: string;
  options?: {
    checkPunctuation?: boolean;
    checkCapitalization?: boolean;
    checkAuthorFormat?: boolean;
    checkDateFormat?: boolean;
    checkItalics?: boolean;
    checkOrder?: boolean;
  };
}
