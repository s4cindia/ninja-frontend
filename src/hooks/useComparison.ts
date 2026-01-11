import { useQuery } from '@tanstack/react-query';
import { getComparison, getChangeById, getChangesByFilter } from '@/services/comparison.service';
import type { ComparisonFilters } from '@/types/comparison';

export function useComparison(jobId: string, options?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['comparison', jobId, options?.page, options?.limit],
    queryFn: () => getComparison(jobId, options),
    enabled: !!jobId,
  });
}

export function useComparisonChange(jobId: string, changeId: string | null) {
  return useQuery({
    queryKey: ['comparison', jobId, 'change', changeId],
    queryFn: () => getChangeById(jobId, changeId!),
    enabled: !!jobId && !!changeId,
  });
}

export function useFilteredComparison(jobId: string, filters: ComparisonFilters) {
  return useQuery({
    queryKey: ['comparison', jobId, 'filtered', filters],
    queryFn: () => getChangesByFilter(jobId, filters),
    enabled: !!jobId,
  });
}
