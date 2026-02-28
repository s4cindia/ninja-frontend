/**
 * Plagiarism Check React Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plagiarismService } from '@/services/plagiarism.service';
import type {
  PlagiarismMatchFilters,
  PlagiarismCheckJob,
} from '@/types/plagiarism';
import { useState, useEffect, useCallback } from 'react';

const KEYS = {
  job: (jobId: string) => ['plagiarism', 'job', jobId] as const,
  matches: (documentId: string, filters?: PlagiarismMatchFilters) =>
    ['plagiarism', 'matches', documentId, filters] as const,
  summary: (documentId: string) => ['plagiarism', 'summary', documentId] as const,
};

/**
 * Hook to start a plagiarism check and poll for completion.
 */
export function usePlagiarismCheck(documentId: string) {
  const queryClient = useQueryClient();
  const [jobId, setJobId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  // Poll job status while in progress
  const jobQuery = useQuery({
    queryKey: KEYS.job(jobId || ''),
    queryFn: () => plagiarismService.getJobStatus(jobId!),
    enabled: !!jobId && polling,
    refetchInterval: polling ? 2000 : false,
  });

  // Stop polling when job completes
  useEffect(() => {
    const status = jobQuery.data?.status;
    if (status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED') {
      setPolling(false);
      queryClient.invalidateQueries({ queryKey: ['plagiarism', 'matches', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    }
  }, [jobQuery.data?.status, queryClient, documentId]);

  const startMutation = useMutation({
    mutationFn: () => plagiarismService.startCheck(documentId),
    onSuccess: (data) => {
      setJobId(data.jobId);
      setPolling(true);
    },
  });

  const startCheck = useCallback(() => {
    startMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const job: PlagiarismCheckJob | null = jobQuery.data ?? null;
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
 * Hook to fetch plagiarism matches for a document.
 */
export function usePlagiarismMatches(documentId: string, filters?: PlagiarismMatchFilters) {
  return useQuery({
    queryKey: KEYS.matches(documentId, filters),
    queryFn: () => plagiarismService.getMatches(documentId, filters),
    enabled: !!documentId,
  });
}

/**
 * Hook to fetch plagiarism summary for a document.
 */
export function usePlagiarismSummary(documentId: string) {
  return useQuery({
    queryKey: KEYS.summary(documentId),
    queryFn: () => plagiarismService.getSummary(documentId),
    enabled: !!documentId,
  });
}

/**
 * Hook to review a plagiarism match.
 */
export function useReviewPlagiarismMatch(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchId,
      status,
      reviewNotes,
    }: {
      matchId: string;
      status: 'CONFIRMED_PLAGIARISM' | 'FALSE_POSITIVE' | 'PROPERLY_ATTRIBUTED' | 'DISMISSED';
      reviewNotes?: string;
    }) => plagiarismService.reviewMatch(matchId, status, reviewNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism', 'matches', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    },
  });
}

/**
 * Hook for bulk review of plagiarism matches.
 */
export function useBulkReviewPlagiarism(documentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      matchIds,
      status,
    }: {
      matchIds: string[];
      status: 'CONFIRMED_PLAGIARISM' | 'FALSE_POSITIVE' | 'PROPERLY_ATTRIBUTED' | 'DISMISSED';
    }) => plagiarismService.bulkReview(matchIds, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plagiarism', 'matches', documentId] });
      queryClient.invalidateQueries({ queryKey: KEYS.summary(documentId) });
    },
  });
}
