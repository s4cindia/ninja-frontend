import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getRemediationConfig,
  updateRemediationConfig,
  resetRemediationConfig,
} from '@/services/config.service';
import type { RemediationConfig } from '@/types/remediation.types';

const QUERY_KEY = ['remediation-config'];

export function useRemediationConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: getRemediationConfig,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

export function useUpdateRemediationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates: Partial<RemediationConfig>) => updateRemediationConfig(updates),
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previousConfig = queryClient.getQueryData<RemediationConfig>(QUERY_KEY);
      queryClient.setQueryData<RemediationConfig>(QUERY_KEY, (old) => ({
        ...(old ?? { colorContrastAutoFix: true }),
        ...updates,
      }));
      return { previousConfig };
    },
    onError: (_err, _updates, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(QUERY_KEY, context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function useResetRemediationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetRemediationConfig,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEY });
      const previousConfig = queryClient.getQueryData<RemediationConfig>(QUERY_KEY);
      queryClient.setQueryData<RemediationConfig>(QUERY_KEY, { colorContrastAutoFix: true });
      return { previousConfig };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousConfig) {
        queryClient.setQueryData(QUERY_KEY, context.previousConfig);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}
