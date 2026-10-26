import { useQuery } from '@tanstack/react-query';
import { reportsService, TeamActivityScope } from '@/services/reports.service';
import type { TeamActivityReportFilters } from '@/types/reports.types';

// retry: false -- the 'self' scope can 403 NOT_TEAM_LEADER_OR_VIEWER, a
// stable outcome React Query's default retries would just delay surfacing.
// 'admin' can't hit that specific 403 (it's ADMIN-gated instead), but a
// consistent no-retry default is fine for a reporting dashboard either way.
export function useTeamActivityReport(scope: TeamActivityScope, filters?: TeamActivityReportFilters) {
  return useQuery({
    queryKey: ['team-activity-report', scope, filters],
    queryFn: () => reportsService.getTeamActivityReport(scope, filters),
    retry: false,
  });
}
