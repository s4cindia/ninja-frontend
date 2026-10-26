import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';

// enabled: jobId != null -- this hook backs the drill-down dialog, which
// mounts (or at least holds a query result) even before a row is clicked.
export function useCostRoundTrend(jobId: string | null) {
  return useQuery({
    queryKey: ['admin-reports-cost-rounds', jobId],
    queryFn: () => reportsService.getCostRoundTrend(jobId as string),
    enabled: jobId != null,
  });
}
