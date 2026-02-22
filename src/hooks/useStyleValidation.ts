/**
 * Style Validation Hooks
 *
 * React Query hooks for style validation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { styleService } from '@/services/style.service';
import type {
  ViolationFilters,
  StartValidationInput,
  CreateHouseRuleInput,
  UpdateHouseRuleInput,
  CreateRuleSetInput,
  UpdateRuleSetInput,
  HouseStyleRule,
} from '@/types/style';

// Query keys
export const styleQueryKeys = {
  all: ['style'] as const,
  violations: (documentId: string, filters?: ViolationFilters) =>
    [...styleQueryKeys.all, 'violations', documentId, filters] as const,
  summary: (documentId: string) =>
    [...styleQueryKeys.all, 'summary', documentId] as const,
  jobStatus: (jobId: string) =>
    [...styleQueryKeys.all, 'job', jobId] as const,
  ruleSets: () => [...styleQueryKeys.all, 'ruleSets'] as const,
  ruleSetDetail: (ruleSetId: string) =>
    [...styleQueryKeys.all, 'ruleSet', ruleSetId] as const,
  customRuleSets: (options?: { includeRules?: boolean; activeOnly?: boolean }) =>
    [...styleQueryKeys.all, 'customRuleSets', options] as const,
  customRuleSet: (ruleSetId: string) =>
    [...styleQueryKeys.all, 'customRuleSet', ruleSetId] as const,
  houseRules: (filters?: Record<string, unknown>) =>
    [...styleQueryKeys.all, 'houseRules', filters] as const,
  houseRule: (ruleId: string) =>
    [...styleQueryKeys.all, 'houseRule', ruleId] as const,
};

// ============================================
// VALIDATION HOOKS
// ============================================

/**
 * Fetch violations for a document
 */
export function useViolations(documentId: string, filters?: ViolationFilters) {
  return useQuery({
    queryKey: styleQueryKeys.violations(documentId, filters),
    queryFn: () => styleService.getViolations(documentId, filters),
    enabled: !!documentId,
  });
}

/**
 * Fetch validation summary for a document
 */
export function useValidationSummary(documentId: string) {
  return useQuery({
    queryKey: styleQueryKeys.summary(documentId),
    queryFn: () => styleService.getValidationSummary(documentId),
    enabled: !!documentId,
  });
}

/**
 * Fetch validation job status
 */
export function useJobStatus(jobId: string | null, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: styleQueryKeys.jobStatus(jobId || ''),
    queryFn: () => styleService.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: options?.refetchInterval,
  });
}

/**
 * Start a validation job
 */
export function useStartValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartValidationInput) => styleService.startValidation(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.violations(variables.documentId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.summary(variables.documentId),
      });
    },
  });
}

/**
 * Apply fix to a violation
 */
export function useApplyFix(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ violationId, fixOption }: { violationId: string; fixOption: string }) =>
      styleService.applyFix(violationId, fixOption),
    onSuccess: () => {
      console.log('[useApplyFix] Fix applied successfully, refreshing data...');
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.violations(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.summary(documentId),
      });
    },
    onError: (error) => {
      console.error('[useApplyFix] Error applying fix:', error);
    },
  });
}

/**
 * Ignore a violation
 */
export function useIgnoreViolation(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ violationId, reason }: { violationId: string; reason?: string }) =>
      styleService.ignoreViolation(violationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.violations(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.summary(documentId),
      });
    },
  });
}

/**
 * Bulk action on violations
 */
export function useBulkAction(documentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      violationIds,
      action,
      reason,
    }: {
      violationIds: string[];
      action: 'fix' | 'ignore' | 'wont_fix';
      reason?: string;
    }) => styleService.bulkAction(violationIds, action, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.violations(documentId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.summary(documentId),
      });
    },
  });
}

// ============================================
// RULE SET HOOKS
// ============================================

/**
 * Fetch available rule sets
 */
export function useRuleSets() {
  return useQuery({
    queryKey: styleQueryKeys.ruleSets(),
    queryFn: () => styleService.getRuleSets(),
  });
}

/**
 * Fetch rule set detail
 */
export function useRuleSetDetail(ruleSetId: string) {
  return useQuery({
    queryKey: styleQueryKeys.ruleSetDetail(ruleSetId),
    queryFn: () => styleService.getRuleSetDetail(ruleSetId),
    enabled: !!ruleSetId,
  });
}

// ============================================
// CUSTOM RULE SETS HOOKS
// ============================================

/**
 * Fetch custom rule sets for the tenant
 */
export function useCustomRuleSets(options?: { includeRules?: boolean; activeOnly?: boolean }) {
  return useQuery({
    queryKey: styleQueryKeys.customRuleSets(options),
    queryFn: () => styleService.getCustomRuleSets(options),
  });
}

/**
 * Fetch a single custom rule set with its rules
 */
export function useCustomRuleSet(ruleSetId: string) {
  return useQuery({
    queryKey: styleQueryKeys.customRuleSet(ruleSetId),
    queryFn: () => styleService.getRuleSetWithRules(ruleSetId),
    enabled: !!ruleSetId,
  });
}

/**
 * Create a new custom rule set
 */
export function useCreateRuleSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRuleSetInput) => styleService.createRuleSet(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.ruleSets(),
      });
    },
  });
}

/**
 * Update a custom rule set
 */
export function useUpdateRuleSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleSetId, input }: { ruleSetId: string; input: UpdateRuleSetInput }) =>
      styleService.updateRuleSet(ruleSetId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.ruleSets(),
      });
    },
  });
}

/**
 * Delete a custom rule set
 */
export function useDeleteRuleSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleSetId: string) => styleService.deleteRuleSet(ruleSetId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.ruleSets(),
      });
    },
  });
}

/**
 * Add a rule to a rule set
 */
export function useAddRuleToSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleSetId, input }: { ruleSetId: string; input: CreateHouseRuleInput }) =>
      styleService.addRuleToSet(ruleSetId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
    },
  });
}

/**
 * Import rules to a rule set
 */
export function useImportRulesToSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      ruleSetId,
      data,
    }: {
      ruleSetId: string;
      data: {
        version: string;
        rules: Array<Omit<HouseStyleRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'createdBy'>>;
      };
    }) => styleService.importRulesToSet(ruleSetId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSet(variables.ruleSetId),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
    },
  });
}

// ============================================
// HOUSE RULES HOOKS
// ============================================

/**
 * Fetch house rules
 */
export function useHouseRules(filters?: {
  category?: string;
  ruleType?: string;
  isActive?: boolean;
  baseStyleGuide?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: styleQueryKeys.houseRules(filters),
    queryFn: () => styleService.getHouseRules(filters),
  });
}

/**
 * Fetch a single house rule
 */
export function useHouseRule(ruleId: string) {
  return useQuery({
    queryKey: styleQueryKeys.houseRule(ruleId),
    queryFn: () => styleService.getHouseRule(ruleId),
    enabled: !!ruleId,
  });
}

/**
 * Create a house rule
 */
export function useCreateHouseRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateHouseRuleInput) => styleService.createHouseRule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
    },
  });
}

/**
 * Update a house rule
 */
export function useUpdateHouseRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ ruleId, input }: { ruleId: string; input: UpdateHouseRuleInput }) =>
      styleService.updateHouseRule(ruleId, input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRule(variables.ruleId),
      });
    },
  });
}

/**
 * Delete a house rule
 */
export function useDeleteHouseRule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleId: string) => styleService.deleteHouseRule(ruleId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
    },
  });
}

/**
 * Test a house rule
 */
export function useTestHouseRule() {
  return useMutation({
    mutationFn: ({ rule, sampleText }: { rule: CreateHouseRuleInput; sampleText: string }) =>
      styleService.testHouseRule(rule, sampleText),
  });
}

/**
 * Export house rules
 */
export function useExportHouseRules() {
  return useMutation({
    mutationFn: () => styleService.exportHouseRules(),
  });
}

/**
 * Import house rules
 */
export function useImportHouseRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Parameters<typeof styleService.importHouseRules>[0]) =>
      styleService.importHouseRules(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
    },
  });
}

// ============================================
// STYLE GUIDE UPLOAD HOOKS
// ============================================

/**
 * Upload a style guide document and extract rules
 */
export function useUploadStyleGuide() {
  return useMutation({
    mutationFn: (file: File) => styleService.uploadStyleGuide(file),
  });
}

/**
 * Save extracted rules as a new rule set
 */
export function useSaveExtractedRules() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      rules,
      sourceDocumentName,
      ruleSetName,
      ruleSetDescription,
      baseStyleGuide,
    }: {
      rules: Parameters<typeof styleService.saveExtractedRules>[0];
      sourceDocumentName?: string;
      ruleSetName?: string;
      ruleSetDescription?: string;
      baseStyleGuide?: string;
    }) => styleService.saveExtractedRules(rules, sourceDocumentName, ruleSetName, ruleSetDescription, baseStyleGuide),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.customRuleSets(),
      });
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.ruleSets(),
      });
    },
  });
}

/**
 * Fetch editorial best practices
 */
export function useBestPractices() {
  return useQuery({
    queryKey: [...styleQueryKeys.all, 'bestPractices'] as const,
    queryFn: () => styleService.getBestPractices(),
  });
}

/**
 * Import best practices as house rules
 */
export function useImportBestPractices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (ruleNames?: string[]) => styleService.importBestPractices(ruleNames),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: styleQueryKeys.houseRules(),
      });
    },
  });
}
