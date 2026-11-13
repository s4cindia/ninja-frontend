import { useQuery } from '@tanstack/react-query';
import { teamService } from '@/services/team.service';

// Only fetched when `enabled` (the caller leads at least one team) -- for
// everyone else this roster is moot, so there's nothing to retry either.
export function useTeamExecutives(enabled: boolean) {
  return useQuery({
    queryKey: ['team-executives'],
    queryFn: () => teamService.listTeamExecutives(),
    enabled,
    retry: false,
  });
}
