import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationService, CitationServiceError } from '@/services/citation.service';
import type { StylesheetDetectionResult } from '@/types/stylesheet-detection.types';
import toast from 'react-hot-toast';

export const stylesheetKeys = {
  all: ['stylesheet-detection'] as const,
  byDocument: (documentId: string) => [...stylesheetKeys.all, documentId] as const,
};

export function useStylesheetDetection(documentId: string) {
  return useQuery<StylesheetDetectionResult, CitationServiceError>({
    queryKey: stylesheetKeys.byDocument(documentId),
    queryFn: () => citationService.getStylesheetDetection(documentId),
    enabled: !!documentId,
    staleTime: 30_000,
  });
}

export function useConvertStyle() {
  const queryClient = useQueryClient();

  return useMutation<
    StylesheetDetectionResult,
    CitationServiceError,
    { documentId: string; targetStyle: string }
  >({
    mutationFn: ({ documentId, targetStyle }) =>
      citationService.convertStyle(documentId, targetStyle),
    onSuccess: (data, variables) => {
      const docId = data?.documentId ?? variables.documentId;
      if (data) {
        queryClient.setQueryData(stylesheetKeys.byDocument(docId), data);
      } else {
        queryClient.invalidateQueries({ queryKey: stylesheetKeys.byDocument(docId) });
      }
      toast.success(`Converted to ${data?.detectedStyle?.styleName ?? 'new style'}`);
    },
    onError: (error) => {
      toast.error(error.message || 'Style conversion failed');
    },
  });
}
