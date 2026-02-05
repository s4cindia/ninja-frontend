import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationValidationService } from '@/services/citation-validation.service';
import type { ValidateDocumentRequest } from '@/types/citation-validation.types';
import toast from 'react-hot-toast';

export function useCitationStyles() {
  return useQuery({
    queryKey: ['citation-styles'],
    queryFn: () => citationValidationService.getStyles(),
    staleTime: Infinity
  });
}

export function useValidateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      request
    }: {
      documentId: string;
      request: ValidateDocumentRequest;
    }) => citationValidationService.validateDocument(documentId, request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['citation-validations', variables.documentId]
      });
      toast.success(`Validation complete: ${data.summary.errorCount} errors, ${data.summary.warningCount} warnings`);
    },
    onError: (error) => {
      toast.error('Validation failed');
      console.error(error);
    }
  });
}

export function useValidations(documentId: string, filters?: {
  status?: string;
  severity?: string;
  violationType?: string;
}) {
  return useQuery({
    queryKey: ['citation-validations', documentId, filters],
    queryFn: () => citationValidationService.getValidations(documentId, filters),
    enabled: !!documentId
  });
}

export function useAcceptValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (validationId: string) =>
      citationValidationService.acceptValidation(validationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Correction applied');
    },
    onError: () => {
      toast.error('Failed to apply correction');
    }
  });
}

export function useRejectValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ validationId, reason }: { validationId: string; reason?: string }) =>
      citationValidationService.rejectValidation(validationId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Marked as intentional');
    }
  });
}

export function useEditValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ validationId, correctedText }: { validationId: string; correctedText: string }) =>
      citationValidationService.editValidation(validationId, correctedText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success('Edit saved');
    }
  });
}

export function useBatchCorrect() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, validationIds }: { documentId: string; validationIds: string[] }) =>
      citationValidationService.batchCorrect(documentId, validationIds),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['citation-validations'] });
      toast.success(`Applied ${data.correctedCount} corrections`);
    },
    onError: () => {
      toast.error('Batch correction failed');
    }
  });
}
