import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationService } from '@/services/verification.service';
import type { 
  VerificationQueueData, 
  VerificationSubmission, 
  BulkVerificationSubmission,
  VerificationFilters 
} from '@/types/verification.types';

export function useVerificationQueue(jobId: string, filters?: VerificationFilters) {
  return useQuery<VerificationQueueData>({
    queryKey: ['verification-queue', jobId, filters],
    queryFn: () => verificationService.getQueue(jobId, filters),
    enabled: !!jobId,
  });
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: VerificationSubmission) => verificationService.submitVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
    },
  });
}

export function useBulkVerification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: BulkVerificationSubmission) => verificationService.submitBulkVerification(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-queue'] });
    },
  });
}
