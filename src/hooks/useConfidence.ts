import { useQuery } from '@tanstack/react-query';
import { confidenceService } from '@/services/confidence.service';
import { ConfidenceWithIssuesResponse } from '@/types/confidence.types';

export function useConfidenceWithIssues(
  jobId: string,
  edition?: string,
  options?: { enabled?: boolean }
) {
  return useQuery<ConfidenceWithIssuesResponse>({
    queryKey: ['confidence-with-issues', jobId, edition],
    queryFn: () => confidenceService.getConfidenceWithIssues(jobId, edition),
    staleTime: 5 * 60 * 1000,
    enabled: options?.enabled ?? !!jobId,
  });
}
