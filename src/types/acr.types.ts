export type AcrEditionCode = 'VPAT2.5-508' | 'VPAT2.5-WCAG' | 'VPAT2.5-EU' | 'VPAT2.5-INT';

export interface AcrEdition {
  id: string;
  code: AcrEditionCode;
  name: string;
  description: string;
  criteriaCount?: number;
  criteria?: AcrCriterion[];
  isRecommended?: boolean;
  standards?: string[];
}

export interface EditionDetails extends AcrEdition {
  sections: EditionSection[];
  applicableStandards: string[];
}

export interface EditionSection {
  id: string;
  name: string;
  criteriaCount: number;
}

export type ConformanceLevel = 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable';

export type AttributionTag = 'AUTOMATED' | 'AI-SUGGESTED' | 'HUMAN-VERIFIED';

export interface AcrCriterion {
  id: string;

  criterionId: string;
  criterionName: string;
  wcagLevel: 'A' | 'AA' | 'AAA';

  name?: string;
  level?: 'A' | 'AA' | 'AAA';
  attributionTag?: AttributionTag;

  conformanceLevel: ConformanceLevel;
  remarks: string;
  attribution: AttributionTag;
  isSuspicious: boolean;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

export interface AcrDocument {
  id: string;
  jobId: string;
  productName: string;
  editionId: string;
  editionName: string;
  criteria: AcrCriterion[];
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'review' | 'final';
}

export interface CredibilityValidation {
  isCredible: boolean;
  supportsPercentage: number;
  warnings: string[];
  suspiciousCriteria: string[];
}

export interface FinalizationStatus {
  canFinalize: boolean;
  blockers: string[];
  pendingCount: number;
  missingRemarksCount: number;
}

export interface RemarksValidation {
  isValid: boolean;
  warnings: string[];
  characterCount: number;
  minLength: number;
  requiredKeywords: string[];
  missingKeywords: string[];
}

export interface GenerateRemarksRequest {
  criterionId: string;
  conformanceLevel: ConformanceLevel;
  context?: string;
}

export interface GenerateRemarksResponse {
  remarks: string;
  confidence: number;
}

export interface UpdateCriterionRequest {
  conformanceLevel?: ConformanceLevel;
  remarks?: string;
  attribution?: AttributionTag;
}

export type ExportFormat = 'docx' | 'pdf' | 'html';

export interface ExportOptions {
  format: ExportFormat;
  includeMethodology: boolean;
  
  includeAttributionTags: boolean;
  includeLegalDisclaimer: boolean;
  branding?: {
    companyName?: string;
    primaryColor?: string;
    footerText?: string;
  };
}

export interface ExportResult {
  downloadUrl: string;
  filename: string;
  format: ExportFormat;
  size: number;
  content: string;
  expiresAt?: string;
}