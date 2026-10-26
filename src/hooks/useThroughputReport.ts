import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type { ThroughputReportFilters } from '@/types/reports.types';

export function useThroughputReport(filters: ThroughputReportFilters) {
  return useQuery({
    queryKey: ['admin-reports-throughput', filters],
    queryFn: () => reportsService.getThroughputReport(filters),
  });
}
