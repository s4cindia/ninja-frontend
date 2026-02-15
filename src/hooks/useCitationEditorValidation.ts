import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { citationService, CitationServiceError } from '@/services/citation.service';
import type { ValidationResult, ReferenceLookupResponse } from '@/types/stylesheet-detection.types';

export const editorValidationKeys = {
  all: ['editor-citation-validation'] as const,
  byDocument: (documentId: string) => [...editorValidationKeys.all, documentId] as const,
};

export const referenceLookupKeys = {
  all: ['reference-lookup'] as const,
  byDocument: (documentId: string) => [...referenceLookupKeys.all, documentId] as const,
};

export function useEditorValidation(documentId: string, enabled = false) {
  const queryClient = useQueryClient();

  const query = useQuery<ValidationResult, CitationServiceError>({
    queryKey: editorValidationKeys.byDocument(documentId),
    queryFn: ({ signal }) => citationService.validateCitations(documentId, signal),
    enabled: !!documentId && enabled,
    staleTime: 2 * 60_000,
  });

  const runValidation = useCallback(async () => {
    return queryClient.fetchQuery<ValidationResult, CitationServiceError>({
      queryKey: editorValidationKeys.byDocument(documentId),
      queryFn: ({ signal }) => citationService.validateCitations(documentId, signal),
    });
  }, [documentId, queryClient]);

  return { ...query, runValidation };
}

export function useReferenceLookup(documentId: string, enabled = true) {
  return useQuery<ReferenceLookupResponse, CitationServiceError>({
    queryKey: referenceLookupKeys.byDocument(documentId),
    queryFn: ({ signal }) => citationService.getReferenceLookup(documentId, signal),
    enabled: !!documentId && enabled,
    staleTime: 5 * 60_000,
  });
}
