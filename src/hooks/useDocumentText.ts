import { useQuery } from '@tanstack/react-query';
import { citationService, CitationServiceError } from '@/services/citation.service';
import type { DocumentTextResponse } from '@/types/stylesheet-detection.types';

export const documentTextKeys = {
  all: ['document-text'] as const,
  byDocument: (documentId: string) => [...documentTextKeys.all, documentId] as const,
};

export function useDocumentText(documentId: string) {
  return useQuery<DocumentTextResponse, CitationServiceError>({
    queryKey: documentTextKeys.byDocument(documentId),
    queryFn: ({ signal }) => citationService.getDocumentText(documentId, signal),
    enabled: !!documentId,
    staleTime: 5 * 60_000,
  });
}
