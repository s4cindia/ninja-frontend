/**
 * Citation Intelligence Tool - React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationIntelService } from '@/services/citation-intel.service';
import toast from 'react-hot-toast';

export function useUploadManuscript() {
  return useMutation({
    mutationFn: (file: File) => citationIntelService.upload(file),
    onSuccess: () => {
      toast.success('Manuscript uploaded successfully');
    },
    onError: (error: unknown) => {
      // Handle both plain Error objects and Axios error responses
      let message = 'Upload failed';

      if (error instanceof Error) {
        // Plain Error thrown by service (e.g., S3 config errors)
        message = error.message;
      } else {
        // Axios error response
        const axiosError = error as { response?: { data?: { error?: { message?: string } } } };
        message = axiosError?.response?.data?.error?.message || 'Upload failed';
      }

      toast.error(message);
    },
  });
}

export function useJobProgress(jobId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['citation-job-progress', jobId],
    queryFn: () => citationIntelService.getProgress(jobId!),
    enabled: !!jobId && enabled,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (job not found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      const error = query.state.error as any;

      // Stop polling if job not found
      if (error?.response?.status === 404) {
        return false;
      }

      if (data?.status === 'COMPLETED' || data?.status === 'FAILED') {
        return false;
      }
      return 2000;
    },
  });
}

export function useAnalysisResults(jobId: string | undefined) {
  return useQuery({
    queryKey: ['citation-analysis', jobId],
    queryFn: () => citationIntelService.getAnalysis(jobId!),
    enabled: !!jobId,
    retry: (failureCount, error: any) => {
      // Don't retry on 404 (job not found)
      if (error?.response?.status === 404) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    staleTime: Infinity, // Cache forever - results don't change after job completes
    refetchInterval: (query) => {
      const data = query.state.data;
      const error = query.state.error as any;

      // Stop polling if job not found
      if (error?.response?.status === 404) {
        return false;
      }

      // Stop refetching once we have results (document data loaded)
      if (data?.document) {
        return false;
      }
      // Keep polling if no data yet
      return 2000;
    },
    refetchOnMount: false, // Don't refetch when component remounts
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
}

export function useReferences(jobId: string | undefined) {
  return useQuery({
    queryKey: ['citation-references', jobId],
    queryFn: () => citationIntelService.getReferences(jobId!),
    enabled: !!jobId,
  });
}

export function useVerifyDOI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceId: string) => citationIntelService.verifyDOI(referenceId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['citation-references'] });

      if (data.status === 'VERIFIED') {
        toast.success('DOI verified successfully');
      } else if (data.status === 'AI_SUGGESTED') {
        toast.success('Potential DOI match found');
      } else {
        toast.error('DOI not found');
      }
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.error?.message || 'Verification failed';
      toast.error(message);
    },
  });
}

export function useIssues(jobId: string | undefined) {
  return useQuery({
    queryKey: ['citation-issues', jobId],
    queryFn: () => citationIntelService.getIssues(jobId!),
    enabled: !!jobId,
  });
}

export function useManuscript(jobId: string | undefined) {
  return useQuery({
    queryKey: ['citation-manuscript', jobId],
    queryFn: () => citationIntelService.getManuscript(jobId!),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useUpdateReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      referenceId,
      correctedText,
      changeNote,
    }: {
      referenceId: string;
      correctedText: string;
      changeNote?: string;
    }) => citationIntelService.updateReference(referenceId, correctedText, changeNote),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-references'] });
      toast.success('Reference updated successfully');
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.error?.message || 'Update failed';
      toast.error(message);
    },
  });
}

export function useReferenceHistory(referenceId: string | undefined) {
  return useQuery({
    queryKey: ['citation-reference-history', referenceId],
    queryFn: () => citationIntelService.getReferenceHistory(referenceId!),
    enabled: !!referenceId,
  });
}

export function useFlagReferenceForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceId: string) => citationIntelService.flagReferenceForReview(referenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-references'] });
      toast.success('Reference flagged for review');
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.error?.message || 'Failed to flag reference';
      toast.error(message);
    },
  });
}

export function useRevertReference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (referenceId: string) => citationIntelService.revertReference(referenceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['citation-references'] });
      toast.success('Reference reverted to original');
    },
    onError: (error) => {
      const message = (error as any)?.response?.data?.error?.message || 'Failed to revert reference';
      toast.error(message);
    },
  });
}
