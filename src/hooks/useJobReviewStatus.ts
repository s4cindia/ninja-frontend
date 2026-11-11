import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';

// enabled: jobId != null -- backs the job drill-down dialog alongside
// useCostRoundTrend/useScoreTrend, which mount before a row/sample job is
// clicked.
export function useJobReviewStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['admin-reports-job-review-status', jobId],
    queryFn: () => reportsService.getJobReviewStatus(jobId as string),
    enabled: jobId != null,
  });
}
