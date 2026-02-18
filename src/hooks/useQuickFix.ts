import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { pdfRemediationService } from '../services/pdf-remediation.service';
import toast from 'react-hot-toast';

export function useQuickFix() {
  const queryClient = useQueryClient();
  const [preview, setPreview] = useState<{ before: string; after: string } | null>(null);

  // Preview mutation
  const previewMutation = useMutation({
    mutationFn: ({ jobId, issueId, field, value }: {
      jobId: string;
      issueId: string;
      field: string;
      value: string;
    }) => pdfRemediationService.previewFix(jobId, issueId, field, value),
    onSuccess: (data) => {
      setPreview({
        before: data.data.before || '',
        after: data.data.after,
      });
    },
    onError: () => {
      toast.error('Failed to load preview');
      setPreview(null);
    },
  });

  // Apply quick fix mutation
  const applyMutation = useMutation({
    mutationFn: ({ jobId, issueId, field, value }: {
      jobId: string;
      issueId: string;
      field: string;
      value: string;
    }) => pdfRemediationService.applyQuickFix(jobId, issueId, field, value),
    onSuccess: (_data, { jobId }) => {
      toast.success('Quick fix applied successfully');
      // Invalidate remediation plan
      queryClient.invalidateQueries({ queryKey: ['pdf-remediation-plan', jobId] });
    },
    onError: () => {
      toast.error('Failed to apply quick fix');
    },
  });

  return {
    previewFix: (jobId: string, issueId: string, field: string, value: string) =>
      previewMutation.mutateAsync({ jobId, issueId, field, value }),
    applyQuickFix: (jobId: string, issueId: string, field: string, value: string) =>
      applyMutation.mutateAsync({ jobId, issueId, field, value }),
    preview,
    isLoadingPreview: previewMutation.isPending,
    isApplying: applyMutation.isPending,
    resetPreview: () => setPreview(null),
  };
}
