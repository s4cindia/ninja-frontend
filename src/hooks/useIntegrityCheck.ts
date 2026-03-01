/**
 * Integrity Check React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { integrityService } from '@/services/integrity.service';
import type {
  IntegrityIssueFilters,
  StartIntegrityCheckInput,
  IntegrityCheckJob,
} from '@/types/integrity';
import { useState, useEffect, useCallback } from 'react';

const KEYS = {
  job: (jobId: string) => ['integrity', 'job', jobId] as const,
  issues: (documentId: string, filters?: IntegrityIssueFilters) =>
    ['integrity', 'issues', documentId, filters] as const,
  summary: (documentId: string) => ['integrity', 'summary', documentId] as const,
};

/**
 * Hook to start an integrity check and poll for completion.
 */
export function useIntegrityCheck(documentId: string) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Poll job status while in progress
  const jobQuery = useQuery({
    queryKey: KEYS.job(jobId || ''),
    queryFn: () => integrityService.getJobStatus(jobId!),
    enabled: !!jobId && polling,
    refetchInterval: polling ? 1500 : false,
  });

  // Stop polling when job completes
  useEffect(() => {
    const status = jobQuery.data?.status;
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      setPolling(false);
      // Invalidate issues and summary so they reload
      queryClient.invalidateQueries({ queryKey: ['integrity', 'issues', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    }
  }, [jobQuery.data?.status, queryClient, documentId]);

  const startMutation = useMutation({
    mutationFn: (input: StartIntegrityCheckInput) => integrityService.startCheck(input),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setPolling(true);
      if (data.created === false) {
        toast('Check already in progress', { icon: 'ℹ️' });
      }
    },
  });

  const startCheck = useCallback(
    (checkTypes?: string[]) => {
      startMutation.mutate({
        documentId,
        checkTypes: checkTypes as StartIntegrityCheckInput['checkTypes'],
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [documentId]
  );

  const job: IntegrityCheckJob | null = jobQuery.data ?? null;
  const isRunning = polling || startMutation.isPending;

  return {
    startCheck,
    job,
    isRunning,
    isStarting: startMutation.isPending,
    startError: startMutation.error,
  };
}

/**
 * Hook to fetch integrity issues for a document.
 */
export function useIntegrityIssues(documentId: string, filters?: IntegrityIssueFilters) {
  return useQuery({
    queryKey: KEYS.issues(documentId, filters),
    queryFn: () => integrityService.getIssues(documentId, filters),
    enabled: !!documentId,
  });
}

/**
 * Hook to fetch integrity summary for a document.
 */
export function useIntegritySummary(documentId: string) {
  return useQuery({
    queryKey: KEYS.summary(documentId),
    queryFn: () => integrityService.getSummary(documentId),
    enabled: !!documentId,
  });
}

/**
 * Hook to apply a fix to an integrity issue.
 */
export function useApplyIntegrityFix(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueId: string) => integrityService.applyFix(issueId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrity', 'issues', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    },
  });
}

/**
 * Hook to ignore an integrity issue.
 */
export function useIgnoreIntegrityIssue(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId, reason }: { issueId: string; reason?: string }) =>
      integrityService.ignoreIssue(issueId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrity', 'issues', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    },
  });
}

/**
 * Hook for bulk actions on integrity issues.
 */
export function useBulkIntegrityAction(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ issueIds, action }: { issueIds: string[]; action: 'fix' | 'ignore' }) =>
      integrityService.bulkAction(issueIds, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['integrity', 'issues', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    },
  });
}
