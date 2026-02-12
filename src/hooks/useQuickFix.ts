/**
 * useQuickFix Hook
 *
 * React Query hooks for quick-fix operations
 */

import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/services/api';
import { toast } from 'react-hot-toast';

interface PreviewFixParams {
  jobId: string;
  issueId: string;
  field: 'language' | 'title' | 'metadata' | 'creator';
  value?: string;
}

interface ApplyFixParams {
  jobId: string;
  issueId: string;
  field: 'language' | 'title' | 'metadata' | 'creator';
  value?: string;
}

interface PreviewResult {
  issueId: string;
  field: string;
  currentValue: string | null;
  proposedValue: string;
  message: string;
}

interface FixResult {
  issueId: string;
  field: string;
  modification: {
    success: boolean;
    field: string;
    oldValue: string | null;
    newValue: string;
    message: string;
  };
  remediatedFileUrl: string;
  message: string;
}

/**
 * Preview what will change before applying a fix
 */
export function usePreviewFix(params: PreviewFixParams) {
  return useQuery({
    queryKey: ['preview-fix', params],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: PreviewResult }>(
        `/pdf/${params.jobId}/remediation/preview/${params.issueId}`,
        {
          params: {
            field: params.field,
            value: params.value,
          },
        }
      );
      return response.data.data;
    },
    enabled: !!params.jobId && !!params.issueId && !!params.field,
  });
}

/**
 * Apply a quick fix to an issue
 */
export function useApplyQuickFix() {
  return useMutation({
    mutationFn: async (params: ApplyFixParams) => {
      const response = await api.post<{ success: boolean; data: FixResult }>(
        `/pdf/${params.jobId}/remediation/quick-fix/${params.issueId}`,
        {
          field: params.field,
          value: params.value,
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Fix applied successfully!');
    },
    onError: (error: unknown) => {
      const apiError = error as { response?: { data?: { error?: { message?: string } } } };
      const message = apiError.response?.data?.error?.message || 'Failed to apply fix';
      toast.error(message);
    },
  });
}
