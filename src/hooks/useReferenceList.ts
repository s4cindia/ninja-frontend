import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { referenceListService } from '@/services/reference-list.service';
import type { GenerateReferenceListRequest, ReferenceEntry } from '@/types/reference-list.types';
import toast from 'react-hot-toast';

export function useFetchReferenceList(documentId: string, styleCode: string = 'apa7') {
  return useQuery({
    queryKey: ['reference-list', documentId, styleCode],
    queryFn: () => referenceListService.fetch(documentId, styleCode),
    enabled: !!documentId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

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
      queryClient.setQueryData(
        ['reference-list', variables.documentId, variables.request.styleCode],
        data
      );
      toast.success(`Generated ${data.stats?.total || data.entries?.length || 0} reference entries`);
    },
    onError: (error: Error & { response?: { data?: { error?: { message?: string } } } }) => {
      const message = error.response?.data?.error?.message || error.message || 'Failed to generate reference list';
      toast.error(message);
      console.error('Reference list generation error:', error);
    }
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
