import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { acrService } from '@/services/acr.service';
import type { 
  AcrDocument, 
  CredibilityValidation, 
  FinalizationStatus,
  GenerateRemarksRequest,
  UpdateCriterionRequest,
  ConformanceLevel,
} from '@/types/acr.types';

export function useAcrDocument(jobId: string) {
  return useQuery<AcrDocument>({
    queryKey: ['acr-document', jobId],
    queryFn: () => acrService.getDocument(jobId),
    enabled: !!jobId,
  });
}

export function useUpdateCriterion(jobId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ criterionId, data }: { criterionId: string; data: UpdateCriterionRequest }) =>
      acrService.updateCriterion(jobId, criterionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acr-document', jobId] });
      queryClient.invalidateQueries({ queryKey: ['credibility', jobId] });
      queryClient.invalidateQueries({ queryKey: ['finalization', jobId] });
    },
  });
}

export function useGenerateRemarks() {
  return useMutation({
    mutationFn: (data: GenerateRemarksRequest) => acrService.generateRemarks(data),
  });
}

export function useCredibilityValidation(jobId: string) {
  return useQuery<CredibilityValidation>({
    queryKey: ['credibility', jobId],
    queryFn: () => acrService.validateCredibility(jobId),
    enabled: !!jobId,
  });
}

export function useCanFinalize(jobId: string) {
  return useQuery<FinalizationStatus>({
    queryKey: ['finalization', jobId],
    queryFn: () => acrService.getFinalizationStatus(jobId),
    enabled: !!jobId,
  });
}

export function useFinalizeDocument(jobId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => acrService.finalizeDocument(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['acr-document', jobId] });
    },
  });
}

export function validateRemarks(
  remarks: string | null | undefined, 
  conformanceLevel: ConformanceLevel
): { isValid: boolean; warnings: string[]; characterCount: number } {
  const warnings: string[] = [];
  const safeRemarks = remarks ?? '';
  const characterCount = safeRemarks.length;
  const minLength = conformanceLevel === 'does_not_support' ? 50 : 20;
  
  if (characterCount < minLength) {
    warnings.push(`Remarks should be at least ${minLength} characters (currently ${characterCount})`);
  }
  
  if (conformanceLevel === 'does_not_support' && !safeRemarks.toLowerCase().includes('issue')) {
    warnings.push('Consider describing the specific accessibility issue');
  }
  
  if (conformanceLevel === 'partially_supports' && !safeRemarks.toLowerCase().includes('except')) {
    warnings.push('Consider using "except" to clarify partial support limitations');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    characterCount,
  };
}
