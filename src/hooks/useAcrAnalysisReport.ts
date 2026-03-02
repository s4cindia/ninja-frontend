import { useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import type { ACRAnalysisReport } from '@/types/acr-analysis-report.types';

export function useAcrAnalysisReport(
  jobId: string,
  shareToken?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<ACRAnalysisReport>({
    queryKey: ['acr-analysis-report', jobId, shareToken ?? null],
    queryFn: async () => {
      if (shareToken) {
        // Public shared endpoint — no auth required
        const res = await api.get<{ data: ACRAnalysisReport }>(`/acr/reports/shared/${shareToken}`);
        return res.data.data;
      }
      const res = await api.get<{ data: ACRAnalysisReport }>(`/acr/reports/${jobId}/analysis`);
      return res.data.data;
    },
    enabled: (options?.enabled ?? true) && !!jobId,
    staleTime: 60 * 60 * 1000, // 1h — matches server cache TTL
    retry: 1,
  });
}
