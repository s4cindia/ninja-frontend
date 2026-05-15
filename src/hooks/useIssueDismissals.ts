import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { issueDismissalService, type CreateDismissalPayload } from '@/services/issue-dismissal.service';

function queryKey(jobId: string) {
  return ['issue-dismissals', jobId] as const;
}

/** Load all dismissals for a job. */
export function useIssueDismissals(jobId: string | undefined) {
  return useQuery({
    queryKey: queryKey(jobId ?? ''),
    queryFn: () => issueDismissalService.list(jobId!),
    enabled: !!jobId,
    staleTime: 30_000,
  });
}

/** Dismiss one issue instance. */
export function useCreateDismissal(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDismissalPayload) =>
      issueDismissalService.create(jobId, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKey(jobId) });
    },
  });
}

/** Remove a dismissal. */
export function useDeleteDismissal(jobId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dismissalId: string) => issueDismissalService.remove(jobId, dismissalId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKey(jobId) });
    },
  });
}
