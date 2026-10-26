import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type { CostReportFilters } from '@/types/reports.types';

export function useCostReport(filters: CostReportFilters) {
  return useQuery({
    queryKey: ['admin-reports-cost', filters],
    queryFn: () => reportsService.getCostReport(filters),
  });
}
