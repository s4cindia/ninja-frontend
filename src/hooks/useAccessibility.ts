import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accessibilityService, IssueStatus } from '@/services/accessibility.service';

export function useValidation(fileId: string) {
  return useQuery({
    queryKey: ['validation', fileId],
    queryFn: () => accessibilityService.getValidation(fileId),
    enabled: !!fileId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.status === 'processing' || data?.status === 'pending') {
        return 5000;
      }
      return false;
    },
  });
}

export function useValidations(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['validations', params],
    queryFn: () => accessibilityService.listValidations(params),
  });
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ 
      fileId, 
      issueId, 
      status 
    }: { 
      fileId: string; 
      issueId: string; 
      status: IssueStatus;
    }) => accessibilityService.updateIssueStatus(fileId, issueId, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['validation', variables.fileId] });
    },
  });
}

export function useRetryValidation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => accessibilityService.retryValidation(fileId),
    onSuccess: (_, fileId) => {
      queryClient.invalidateQueries({ queryKey: ['validation', fileId] });
      queryClient.invalidateQueries({ queryKey: ['validations'] });
    },
  });
}
