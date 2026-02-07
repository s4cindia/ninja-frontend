import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as remediationService from '@/services/remediation.service';

export function useRemediationResults(jobId: string) {
  return useQuery({
    queryKey: ['remediation-results', jobId],
    queryFn: () => remediationService.getRemediationResults(jobId),
    enabled: !!jobId,
    staleTime: 30000,
  });
}

export function useRunRemediationAgain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => remediationService.runRemediationAgain(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['remediation-results', jobId] });
    },
  });
}

export function useTriggerReAudit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => remediationService.triggerReAudit(jobId),
    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({ queryKey: ['remediation-results', jobId] });
    },
  });
}
