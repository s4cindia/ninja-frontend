import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';

// No date-range filter -- this is a current-state backlog, not a period
// report, so it has no params and therefore a fixed query key.
export function useStuckIssues() {
  return useQuery({
    queryKey: ['admin-reports-quality-stuck-issues'],
    queryFn: () => reportsService.getStuckIssues(),
  });
}
