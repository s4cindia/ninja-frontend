/**
 * Comparison Study "Auto Mode" — job-scoped hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfAutoModeService } from '@/services/pdfAutoMode.service';

const STATUS_KEY = (jobId: string) => ['pdf-auto-mode-status', jobId] as const;

/**
 * Polls every 5s while autoStatus is 'running', and stops automatically
 * once the run concludes (or was never started) — same "don't poll once
 * there's nothing left to observe" principle as the remediation-cycle-lock
 * polling in PdfAuditResultsPage.
 */
export function useAutoModeStatus(jobId: string | undefined) {
  return useQuery({
    queryKey: STATUS_KEY(jobId ?? ''),
    queryFn: () => pdfAutoModeService.getAutoModeStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => (query.state.data?.autoStatus === 'running' ? 5000 : false),
  });
}

export function useStartAutoMode(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => pdfAutoModeService.startAutoMode(jobId!),
    onSuccess: () => {
      if (jobId) queryClient.invalidateQueries({ queryKey: STATUS_KEY(jobId) });
    },
  });
}

export function useStopAutoMode(jobId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => pdfAutoModeService.stopAutoMode(jobId!),
    onSuccess: () => {
      // Cooperative stop — honored after the current round, not
      // immediately, so the status query keeps polling (autoStatus is
      // still 'running' right after this resolves) until it actually
      // reflects 'stopped'. Invalidating just forces one immediate re-check
      // rather than waiting for the next 5s tick.
      if (jobId) queryClient.invalidateQueries({ queryKey: STATUS_KEY(jobId) });
    },
  });
}
