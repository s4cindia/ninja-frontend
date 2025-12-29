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
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

export function useResetRemediationConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: resetRemediationConfig,
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}
