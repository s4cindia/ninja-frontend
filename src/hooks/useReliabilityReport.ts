import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type { ReliabilityReportFilters } from '@/types/reports.types';

export function useReliabilityReport(filters: ReliabilityReportFilters) {
  return useQuery({
    queryKey: ['admin-reports-reliability', filters],
    queryFn: () => reportsService.getReliabilityReport(filters),
  });
}
