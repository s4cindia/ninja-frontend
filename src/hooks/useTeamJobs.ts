import { useQuery } from '@tanstack/react-query';
import { teamService, TeamJobFilters } from '@/services/team.service';

// retry: false -- a 403 NOT_TEAM_LEADER_OR_VIEWER is an expected, stable
// outcome for most users (not everyone is on a team), so the query default
// of 3 retries would just delay MyTeamPage's empty state for no benefit.
export function useTeamJobs(filters?: TeamJobFilters) {
  return useQuery({
    queryKey: ['team-jobs', filters],
    queryFn: () => teamService.listTeamJobs(filters),
    retry: false,
  });
}
