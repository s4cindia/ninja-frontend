import { useQuery } from '@tanstack/react-query';
import { acrService } from '@/services/acr.service';

export function useEditions() {
  return useQuery({
    queryKey: ['acr', 'editions'],
    queryFn: () => acrService.getEditions(),
    staleTime: 10 * 60 * 1000,
  });
}

export function useEditionDetails(edition: string | null) {
  return useQuery({
    queryKey: ['acr', 'editions', edition],
    queryFn: () => acrService.getEditionDetails(edition!),
    enabled: !!edition,
    staleTime: 10 * 60 * 1000,
  });
}
