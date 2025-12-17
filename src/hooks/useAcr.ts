import { useQuery } from '@tanstack/react-query';
import { acrService } from '@/services/acr.service';
import type { AcrEdition } from '@/types/acr.types';

export function useEditions() {
  return useQuery({
    queryKey: ['acr', 'editions'],
    queryFn: async (): Promise<AcrEdition[]> => {
      const response = await acrService.getEditions();
      if (Array.isArray(response)) {
        return response;
      }
      const wrapped = response as unknown as { editions?: AcrEdition[]; data?: AcrEdition[] };
      return wrapped.editions || wrapped.data || [];
    },
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
