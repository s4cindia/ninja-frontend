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
