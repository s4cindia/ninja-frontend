/**
 * PDF Remediation React Query Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type {
  RemediationPlan,
  UpdateTaskStatusRequest,
} from '@/types/pdf-remediation.types';

/**
 * Create a new remediation plan
 */
export function useCreateRemediationPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => pdfRemediationService.createRemediationPlan(jobId),
    onSuccess: (data: RemediationPlan) => {
      // Invalidate and refetch the plan query
      queryClient.setQueryData(['pdf-remediation-plan', data.jobId], data);
      queryClient.invalidateQueries({ queryKey: ['pdf-remediation-plan', data.jobId] });
    },
  });
}

/**
 * Get existing remediation plan
 */
export function useRemediationPlan(jobId: string | undefined) {
  return useQuery({
    queryKey: ['pdf-remediation-plan', jobId],
    queryFn: () => pdfRemediationService.getRemediationPlan(jobId!),
    enabled: !!jobId,
  });
}

/**
 * Update task status
 */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      jobId,
      taskId,
      request,
    }: {
      jobId: string;
      taskId: string;
      request: UpdateTaskStatusRequest;
    }) => pdfRemediationService.updateTaskStatus(jobId, taskId, request),
    onSuccess: (_data, variables) => {
      // Invalidate the plan query to refetch updated data
      queryClient.invalidateQueries({ queryKey: ['pdf-remediation-plan', variables.jobId] });
    },
  });
}

/**
 * Execute auto-remediation for all auto-fixable issues
 */
export function usePdfAutoRemediation() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (jobId: string) => pdfRemediationService.executeAutoRemediation(jobId),
    onSuccess: (_data, jobId) => {
      // Invalidate remediation plan to refresh task statuses
      queryClient.invalidateQueries({ queryKey: ['pdf-remediation-plan', jobId] });
    },
  });

  return {
    executeAutoFix: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Re-audit a remediated PDF
 */
export function usePdfReaudit() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ jobId, file }: { jobId: string; file: File }) =>
      pdfRemediationService.reauditPdf(jobId, file),
    onSuccess: (_data, { jobId }) => {
      // Invalidate remediation plan to show re-audit results
      queryClient.invalidateQueries({ queryKey: ['pdf-remediation-plan', jobId] });
    },
  });

  return {
    reauditPdf: (jobId: string, file: File) => mutation.mutateAsync({ jobId, file }),
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
