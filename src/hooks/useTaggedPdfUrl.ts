import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';

export function useTaggedPdfUrl(documentId: string | undefined) {
  return useQuery({
    queryKey: ['tagged-pdf-url', documentId],
    queryFn: async () => {
      const res = await api.get(
        `/admin/corpus/documents/${documentId}/download-url`,
        { params: { type: 'tagged' } },
      );
      return res.data?.data?.downloadUrl as string;
    },
    enabled: !!documentId,
    staleTime: 10 * 60 * 1000, // 10 min (URL expires in 15)
    refetchInterval: 10 * 60 * 1000,
  });
}
