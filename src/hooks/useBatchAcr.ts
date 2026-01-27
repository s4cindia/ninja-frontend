import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acrService } from '@/services/acr.service';
import { toast } from 'react-hot-toast';
import type {
  BatchAcrGenerationRequest,
  BatchAcrGenerationResult,
  BatchAcrDocument,
  BatchAcrHistory,
  BatchAcrExportResult,
} from '@/types/batch-acr.types';

export function useGenerateBatchAcr() {
  const queryClient = useQueryClient();

  return useMutation<BatchAcrGenerationResult, Error, BatchAcrGenerationRequest>({
    mutationFn: (request) => acrService.generateBatchAcr(request),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['batch', variables.batchId] });
      queryClient.invalidateQueries({ queryKey: ['batchAcrHistory', variables.batchId] });

      if (data.mode === 'individual') {
        toast.success(`Created ${data.totalAcrs} ACR workflows`);
      } else {
        toast.success(`Created aggregate ACR for ${data.totalDocuments} EPUBs`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to generate ACR');
    },
  });
}

export function useBatchAcr(batchAcrId: string | null) {
  return useQuery<BatchAcrDocument, Error>({
    queryKey: ['batchAcr', batchAcrId],
    queryFn: () => acrService.getBatchAcr(batchAcrId!),
    enabled: !!batchAcrId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useExportBatchAcr() {
  return useMutation<
    BatchAcrExportResult,
    Error,
    { batchAcrId: string; format: 'pdf' | 'docx' | 'html'; includeMethodology?: boolean }
  >({
    mutationFn: ({ batchAcrId, format, includeMethodology = true }) =>
      acrService.exportBatchAcr(batchAcrId, format, includeMethodology),
    onSuccess: (data) => {
      const newWindow = window.open(data.downloadUrl, '_blank', 'noopener,noreferrer');
      if (newWindow) {
        newWindow.opener = null;
      }
      toast.success(`Exporting ACR as ${data.format.toUpperCase()}...`);
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to export ACR');
    },
  });
}

export function useBatchAcrHistory(batchId: string | null) {
  return useQuery<BatchAcrHistory, Error>({
    queryKey: ['batchAcrHistory', batchId],
    queryFn: () => acrService.getBatchAcrHistory(batchId!),
    enabled: !!batchId,
    staleTime: 1 * 60 * 1000,
  });
}
