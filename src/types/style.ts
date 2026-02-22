/**
 * Style Validation Types
 */

export type StyleGuideType =
  | 'CHICAGO'
  | 'APA'
  | 'MLA'
  | 'AP'
  | 'VANCOUVER'
  | 'IEEE'
  | 'NATURE'
  | 'ELSEVIER'
  | 'CUSTOM';

export type StyleCategory =
  | 'PUNCTUATION'
  | 'CAPITALIZATION'
  | 'NUMBERS'
  | 'ABBREVIATIONS'
  | 'HYPHENATION'
  | 'SPELLING'
  | 'GRAMMAR'
  | 'TERMINOLOGY'
  | 'FORMATTING'
  | 'CITATIONS'
  | 'OTHER';

export type StyleSeverity = 'ERROR' | 'WARNING' | 'SUGGESTION';

export type ViolationStatus = 'PENDING' | 'FIXED' | 'IGNORED' | 'WONT_FIX' | 'AUTO_FIXED';

export type HouseRuleType = 'TERMINOLOGY' | 'PATTERN' | 'CAPITALIZATION' | 'PUNCTUATION';

export interface StyleViolation {
  id: string;
  documentId: string;
  jobId?: string;
  styleGuide: StyleGuideType;
  ruleId?: string;
  ruleReference?: string;
  category: StyleCategory;
  severity: StyleSeverity;
  title: string;
  description: string;
  pageNumber?: number;
  paragraphIndex?: number;
  startOffset: number;
  endOffset: number;
  originalText: string;
  suggestedText?: string;
  status: ViolationStatus;
  appliedFix?: string;
  fixedAt?: string;
  fixedBy?: string;
  ignoredReason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface StyleValidationJob {
  id: string;
  tenantId: string;
  documentId: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  ruleSetIds: string[];
  progress: number;
  totalRules: number;
  violationsFound: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  createdAt: string;
  createdBy: string;
}

export interface ValidationSummary {
  jobId: string;
  documentId: string;
  status: string;
  progress: number;
  totalViolations: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  byStatus: Record<string, number>;
  topRules: Array<{ ruleId: string; ruleName: string; count: number }>;
  startedAt?: string;
  completedAt?: string;
}

export interface ValidationProgress {
  jobId: string;
  status: string;
  progress: number;
  violationsFound: number;
  currentPhase?: string;
}

export interface HouseStyleRule {
  id: string;
  tenantId: string;
  ruleSetId?: string;
  name: string;
  description?: string;
  category: StyleCategory;
  ruleType: HouseRuleType;
  pattern?: string;
  preferredTerm?: string;
  avoidTerms: string[];
  severity: StyleSeverity;
  isActive: boolean;
  baseStyleGuide?: StyleGuideType;
  overridesRule?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Custom Rule Set - A named collection of rules
export interface HouseRuleSet {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  baseStyleGuide?: StyleGuideType;
  source: string; // 'manual', 'uploaded', 'imported'
  sourceFile?: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  rules?: HouseStyleRule[];
  _count?: { rules: number };
}

export interface CreateRuleSetInput {
  name: string;
  description?: string;
  baseStyleGuide?: StyleGuideType;
  isDefault?: boolean;
}

export interface UpdateRuleSetInput {
  name?: string;
  description?: string;
  baseStyleGuide?: StyleGuideType;
  isActive?: boolean;
  isDefault?: boolean;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  styleGuide?: StyleGuideType;
  ruleCount: number;
  isBuiltIn?: boolean;
}

export interface RuleSetDetail extends RuleSet {
  rules: Array<{
    id: string;
    name: string;
    description: string;
    category: StyleCategory;
    severity: StyleSeverity;
    examples?: Array<{ incorrect: string; correct: string }>;
  }>;
}

export interface ViolationFilters {
  category?: StyleCategory;
  severity?: StyleSeverity;
  status?: ViolationStatus;
  ruleId?: string;
  styleGuide?: StyleGuideType;
  search?: string;
  skip?: number;
  take?: number;
}

export interface BulkActionResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ violationId: string; error: string }>;
}

export interface RuleTestResult {
  matches: Array<{
    startOffset: number;
    endOffset: number;
    matchedText: string;
    suggestedFix: string;
    ruleId: string;
    ruleName: string;
    description: string;
  }>;
  executionTimeMs: number;
  patternValid: boolean;
  error?: string;
}

export interface CreateHouseRuleInput {
  name: string;
  description?: string;
  category: StyleCategory;
  ruleType: HouseRuleType;
  pattern?: string;
  preferredTerm?: string;
  avoidTerms?: string[];
  severity?: StyleSeverity;
  isActive?: boolean;
  baseStyleGuide?: StyleGuideType;
  overridesRule?: string;
}

export interface UpdateHouseRuleInput {
  name?: string;
  description?: string | null;
  category?: StyleCategory;
  ruleType?: HouseRuleType;
  pattern?: string | null;
  preferredTerm?: string | null;
  avoidTerms?: string[];
  severity?: StyleSeverity;
  isActive?: boolean;
  baseStyleGuide?: StyleGuideType | null;
  overridesRule?: string | null;
}

export interface StartValidationInput {
  documentId: string;
  ruleSetIds?: string[];
  styleGuide?: StyleGuideType;
  includeHouseRules?: boolean;
  useAiValidation?: boolean;
}
