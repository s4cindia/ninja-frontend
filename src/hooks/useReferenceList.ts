import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceListService } from '@/services/reference-list.service';
import type { GenerateReferenceListRequest, ReferenceEntry } from '@/types/reference-list.types';
import toast from 'react-hot-toast';

export function useGenerateReferenceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      request
    }: {
      documentId: string;
      request: GenerateReferenceListRequest;
    }) => referenceListService.generate(documentId, request),
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['reference-list', variables.documentId], data);
      toast.success(`Generated ${data.summary.totalEntries} reference entries`);
    },
    onError: () => {
      toast.error('Failed to generate reference list');
    }
  });
}

export function useReferenceList(documentId: string) {
  return useQuery({
    queryKey: ['reference-list', documentId],
    queryFn: () => referenceListService.generate(documentId, {
      styleCode: 'apa7',
      options: { enrichFromCrossRef: true }
    }),
    enabled: false
  });
}

export function useUpdateReferenceEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      entryId,
      updates
    }: {
      entryId: string;
      updates: Partial<ReferenceEntry>;
    }) => referenceListService.updateEntry(entryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-list'] });
      toast.success('Entry updated');
    }
  });
}

export function useFinalizeReferenceList() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      documentId,
      styleCode
    }: {
      documentId: string;
      styleCode: string;
    }) => referenceListService.finalize(documentId, styleCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reference-list'] });
      toast.success('Reference list finalized');
    }
  });
}
