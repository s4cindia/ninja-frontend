/**
 * Style Validation Service
 *
 * API client for style validation endpoints
 */

import { api } from './api';
import type {
  StyleViolation,
  ValidationSummary,
  ValidationProgress,
  HouseStyleRule,
  HouseRuleSet,
  RuleSet,
  RuleSetDetail,
  ViolationFilters,
  BulkActionResult,
  RuleTestResult,
  CreateHouseRuleInput,
  UpdateHouseRuleInput,
  CreateRuleSetInput,
  UpdateRuleSetInput,
  StartValidationInput,
} from '@/types/style';

export const styleService = {
  // ============================================
  // VALIDATION
  // ============================================

  /**
   * Start a style validation job
   */
  async startValidation(input: StartValidationInput): Promise<{ jobId: string; status: string; message: string }> {
    const response = await api.post<{ success: boolean; data: { jobId: string; status: string; message: string } }>(
      '/style/validate',
      input
    );
    return response.data.data;
  },

  /**
   * Get validation job status
   */
  async getJobStatus(jobId: string): Promise<ValidationProgress> {
    const response = await api.get<{ success: boolean; data: ValidationProgress }>(
      `/style/job/${jobId}`
    );
    return response.data.data;
  },

  /**
   * Get violations for a document
   */
  async getViolations(
    documentId: string,
    filters?: ViolationFilters
  ): Promise<{ violations: StyleViolation[]; total: number; pagination: { skip: number; take: number } }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ruleId) params.append('ruleId', filters.ruleId);
    if (filters?.styleGuide) params.append('styleGuide', filters.styleGuide);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.skip !== undefined) params.append('skip', String(filters.skip));
    if (filters?.take !== undefined) params.append('take', String(filters.take));

    const queryString = params.toString();
    const url = `/style/document/${documentId}${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{
      success: boolean;
      data: { violations: StyleViolation[]; total: number; pagination: { skip: number; take: number } };
    }>(url);
    return response.data.data;
  },

  /**
   * Get validation summary for a document
   */
  async getValidationSummary(documentId: string): Promise<ValidationSummary> {
    const response = await api.get<{ success: boolean; data: ValidationSummary }>(
      `/style/document/${documentId}/summary`
    );
    return response.data.data;
  },

  /**
   * Apply a fix to a violation
   */
  async applyFix(violationId: string, fixOption: string): Promise<StyleViolation> {
    const response = await api.post<{ success: boolean; data: StyleViolation }>(
      `/style/violation/${violationId}/fix`,
      { fixOption }
    );
    return response.data.data;
  },

  /**
   * Ignore a violation
   */
  async ignoreViolation(violationId: string, reason?: string): Promise<StyleViolation> {
    const response = await api.post<{ success: boolean; data: StyleViolation }>(
      `/style/violation/${violationId}/ignore`,
      { reason }
    );
    return response.data.data;
  },

  /**
   * Bulk action on violations
   */
  async bulkAction(
    violationIds: string[],
    action: 'fix' | 'ignore' | 'wont_fix',
    reason?: string
  ): Promise<BulkActionResult> {
    const response = await api.post<{ success: boolean; data: BulkActionResult }>(
      '/style/violations/bulk',
      { violationIds, action, reason }
    );
    return response.data.data;
  },

  /**
   * Get available rule sets
   */
  async getRuleSets(): Promise<{ ruleSets: RuleSet[] }> {
    const response = await api.get<{ success: boolean; data: { ruleSets: RuleSet[] } }>(
      '/style/rule-sets'
    );
    return response.data.data;
  },

  /**
   * Get rules in a rule set
   */
  async getRuleSetDetail(ruleSetId: string): Promise<RuleSetDetail> {
    const response = await api.get<{ success: boolean; data: RuleSetDetail }>(
      `/style/rule-sets/${ruleSetId}`
    );
    return response.data.data;
  },

  // ============================================
  // CUSTOM RULE SETS (Named Collections)
  // ============================================

  /**
   * Create a new custom rule set
   */
  async createRuleSet(input: CreateRuleSetInput): Promise<HouseRuleSet> {
    const response = await api.post<{ success: boolean; data: HouseRuleSet }>(
      '/style/rule-sets',
      input
    );
    return response.data.data;
  },

  /**
   * Get all custom rule sets for the tenant
   */
  async getCustomRuleSets(options?: {
    includeRules?: boolean;
    activeOnly?: boolean;
  }): Promise<{ ruleSets: HouseRuleSet[]; total: number }> {
    const params = new URLSearchParams();
    if (options?.includeRules) params.append('includeRules', 'true');
    if (options?.activeOnly) params.append('activeOnly', 'true');

    const queryString = params.toString();
    const url = `/style/rule-sets${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{
      success: boolean;
      data: { ruleSets: HouseRuleSet[]; total: number };
    }>(url);
    return response.data.data;
  },

  /**
   * Get a single rule set with its rules
   */
  async getRuleSetWithRules(ruleSetId: string): Promise<HouseRuleSet> {
    const response = await api.get<{ success: boolean; data: HouseRuleSet }>(
      `/style/rule-sets/${ruleSetId}`
    );
    return response.data.data;
  },

  /**
   * Update a rule set
   */
  async updateRuleSet(ruleSetId: string, input: UpdateRuleSetInput): Promise<HouseRuleSet> {
    const response = await api.put<{ success: boolean; data: HouseRuleSet }>(
      `/style/rule-sets/${ruleSetId}`,
      input
    );
    return response.data.data;
  },

  /**
   * Delete a rule set
   */
  async deleteRuleSet(ruleSetId: string): Promise<void> {
    await api.delete(`/style/rule-sets/${ruleSetId}`);
  },

  /**
   * Add a rule to a rule set
   */
  async addRuleToSet(ruleSetId: string, input: CreateHouseRuleInput): Promise<HouseStyleRule> {
    const response = await api.post<{ success: boolean; data: HouseStyleRule }>(
      `/style/rule-sets/${ruleSetId}/rules`,
      input
    );
    return response.data.data;
  },

  /**
   * Import rules to a rule set
   */
  async importRulesToSet(
    ruleSetId: string,
    data: {
      version: string;
      rules: Array<Omit<HouseStyleRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>>;
    }
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const response = await api.post<{
      success: boolean;
      data: { imported: number; skipped: number; errors: string[] };
    }>(`/style/rule-sets/${ruleSetId}/import`, data);
    return response.data.data;
  },

  // ============================================
  // HOUSE RULES
  // ============================================

  /**
   * Create a house rule
   */
  async createHouseRule(input: CreateHouseRuleInput): Promise<HouseStyleRule> {
    const response = await api.post<{ success: boolean; data: HouseStyleRule }>(
      '/style/house-rules',
      input
    );
    return response.data.data;
  },

  /**
   * Get house rules
   */
  async getHouseRules(filters?: {
    category?: string;
    ruleType?: string;
    isActive?: boolean;
    baseStyleGuide?: string;
    search?: string;
  }): Promise<{ rules: HouseStyleRule[]; total: number }> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.ruleType) params.append('ruleType', filters.ruleType);
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.baseStyleGuide) params.append('baseStyleGuide', filters.baseStyleGuide);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = `/style/house-rules${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ success: boolean; data: { rules: HouseStyleRule[]; total: number } }>(url);
    return response.data.data;
  },

  /**
   * Get a single house rule
   */
  async getHouseRule(ruleId: string): Promise<HouseStyleRule> {
    const response = await api.get<{ success: boolean; data: HouseStyleRule }>(
      `/style/house-rules/${ruleId}`
    );
    return response.data.data;
  },

  /**
   * Update a house rule
   */
  async updateHouseRule(ruleId: string, input: UpdateHouseRuleInput): Promise<HouseStyleRule> {
    const response = await api.put<{ success: boolean; data: HouseStyleRule }>(
      `/style/house-rules/${ruleId}`,
      input
    );
    return response.data.data;
  },

  /**
   * Delete a house rule
   */
  async deleteHouseRule(ruleId: string): Promise<void> {
    await api.delete(`/style/house-rules/${ruleId}`);
  },

  /**
   * Export house rules
   */
  async exportHouseRules(): Promise<{
    version: string;
    exportedAt: string;
    tenantId: string;
    rules: Array<Omit<HouseStyleRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>>;
  }> {
    const response = await api.get<{
      success: boolean;
      data: {
        version: string;
        exportedAt: string;
        tenantId: string;
        rules: Array<Omit<HouseStyleRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>>;
      };
    }>('/style/house-rules/export');
    return response.data.data;
  },

  /**
   * Import house rules
   */
  async importHouseRules(data: {
    version: string;
    rules: Array<Omit<HouseStyleRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>>;
  }): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const response = await api.post<{
      success: boolean;
      data: { imported: number; skipped: number; errors: string[] };
    }>('/style/house-rules/import', data);
    return response.data.data;
  },

  /**
   * Test a house rule
   */
  async testHouseRule(
    rule: CreateHouseRuleInput,
    sampleText: string
  ): Promise<RuleTestResult> {
    const response = await api.post<{ success: boolean; data: RuleTestResult }>(
      '/style/house-rules/test',
      { rule, sampleText }
    );
    return response.data.data;
  },

  /**
   * Upload a style guide document and extract rules
   */
  async uploadStyleGuide(file: File): Promise<{
    documentTitle?: string;
    totalRulesExtracted: number;
    rules: Array<{
      name: string;
      description: string;
      category: string;
      ruleType: string;
      pattern?: string;
      preferredTerm?: string;
      avoidTerms: string[];
      severity: string;
      sourceSection?: string;
      examples?: Array<{ incorrect: string; correct: string }>;
    }>;
    categories: Record<string, number>;
    processingTimeMs: number;
    warnings: string[];
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{
      success: boolean;
      data: {
        documentTitle?: string;
        totalRulesExtracted: number;
        rules: Array<{
          name: string;
          description: string;
          category: string;
          ruleType: string;
          pattern?: string;
          preferredTerm?: string;
          avoidTerms: string[];
          severity: string;
          sourceSection?: string;
          examples?: Array<{ incorrect: string; correct: string }>;
        }>;
        categories: Record<string, number>;
        processingTimeMs: number;
        warnings: string[];
      };
    }>('/style/upload-guide', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data;
  },

  /**
   * Save extracted rules as a new rule set
   */
  async saveExtractedRules(
    rules: Array<{
      name: string;
      description: string;
      category: string;
      ruleType: string;
      pattern?: string;
      preferredTerm?: string;
      avoidTerms: string[];
      severity: string;
    }>,
    sourceDocumentName?: string,
    ruleSetName?: string,
    ruleSetDescription?: string,
    baseStyleGuide?: string
  ): Promise<{
    ruleSet: { id: string; name: string; description: string };
    savedCount: number;
    errorCount: number;
    errors: Array<{ ruleName: string; error: string }>;
  }> {
    const response = await api.post<{
      success: boolean;
      data: {
        ruleSet: { id: string; name: string; description: string };
        savedCount: number;
        errorCount: number;
        errors: Array<{ ruleName: string; error: string }>;
      };
    }>('/style/save-extracted-rules', {
      rules,
      sourceDocumentName,
      ruleSetName,
      ruleSetDescription,
      baseStyleGuide,
    });
    return response.data.data;
  },

  /**
   * Get editorial best practices
   */
  async getBestPractices(): Promise<{
    rules: Array<{
      name: string;
      description: string;
      category: string;
      ruleType: string;
      pattern?: string;
      preferredTerm?: string;
      avoidTerms: string[];
      severity: string;
      examples?: Array<{ incorrect: string; correct: string }>;
    }>;
    totalRules: number;
    categories: Record<string, number>;
  }> {
    const response = await api.get<{
      success: boolean;
      data: {
        rules: Array<{
          name: string;
          description: string;
          category: string;
          ruleType: string;
          pattern?: string;
          preferredTerm?: string;
          avoidTerms: string[];
          severity: string;
          examples?: Array<{ incorrect: string; correct: string }>;
        }>;
        totalRules: number;
        categories: Record<string, number>;
      };
    }>('/style/best-practices');
    return response.data.data;
  },

  /**
   * Import best practices as house rules
   */
  async importBestPractices(ruleNames?: string[]): Promise<{
    importedCount: number;
    errorCount: number;
    errors: Array<{ ruleName: string; error: string }>;
  }> {
    const response = await api.post<{
      success: boolean;
      data: {
        importedCount: number;
        errorCount: number;
        errors: Array<{ ruleName: string; error: string }>;
      };
    }>('/style/import-best-practices', { ruleNames });
    return response.data.data;
  },
};

export default styleService;
