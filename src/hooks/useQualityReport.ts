import { useQuery } from '@tanstack/react-query';
import { reportsService } from '@/services/reports.service';
import type { QualityReportFilters } from '@/types/reports.types';

export function useQualityReport(filters: QualityReportFilters) {
  return useQuery({
    queryKey: ['admin-reports-quality', filters],
    queryFn: () => reportsService.getQualityReport(filters),
  });
}
