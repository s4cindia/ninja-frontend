import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';

// enabled: jobId != null -- backs the job drill-down dialog alongside
// useCostRoundTrend, which mounts before a row/sample job is clicked.
export function useScoreTrend(jobId: string | null) {
  return useQuery({
    queryKey: ['admin-reports-quality-score-trend', jobId],
    queryFn: () => reportsService.getScoreTrend(jobId as string),
    enabled: jobId != null,
  });
}
