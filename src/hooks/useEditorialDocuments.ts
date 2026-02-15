import { useQuery } from '@tanstack/react-query';
import { editorialDocumentService } from '@/services/editorial-document.service';

export function useEditorialDocuments(params?: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['editorial-documents', params],
    queryFn: () => editorialDocumentService.list(params),
    staleTime: 30 * 1000,
  });
}

export function useEditorialDocumentOverview(documentId: string | undefined) {
  return useQuery({
    queryKey: ['editorial-document-overview', documentId],
    queryFn: () => editorialDocumentService.getOverview(documentId!),
    enabled: !!documentId,
    staleTime: 30 * 1000,
  });
}
