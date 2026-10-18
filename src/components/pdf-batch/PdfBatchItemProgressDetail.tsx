import { useEffect } from 'react';
import { useJobPolling } from '@/hooks/useJobPolling';
import { useAutoModeStatus, useAutoModeRoundHistory, useStopAutoMode } from '@/hooks/useAutoMode';
import { PdfJobProgressPanel } from '@/components/pdf/PdfJobProgressPanel';
import { AutoModeStatusCard } from '@/components/pdf/AutoModeStatusCard';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

interface PdfBatchItemProgressDetailProps {
  item: PdfBatchItem;
}

/**
 * Expanded per-item progress detail for a PDF batch item, reusing the exact
 * same job-scoped components/hooks the single-file PDF audit page uses --
 * see delegated-prancing-candy.md's plan for the full research behind this.
 *
 * Audit phase: polls GET /jobs/:auditJobId (useJobPolling, the same hook
 * the single-file upload flow uses) and renders it through
 * PdfJobProgressPanel unmodified -- that component already accepts
 * `showUploadRow` for exactly this "job started server-side, not through
 * this UI" case.
 *
 * Remediation phase: the batch orchestrator drives this item's remediation
 * through the exact same PdfAutoRemediationRun row (keyed by this same
 * auditJobId) the single-file Auto Mode flow uses, so useAutoModeStatus/
 * useAutoModeRoundHistory/useStopAutoMode and AutoModeStatusCard all work
 * completely unmodified -- including the Stop button, which cooperatively
 * stops just this one item's remediation via the same autoStopRequested
 * mechanism the loop already checks every round.
 *
 * Only mounted while its row is expanded (see PdfBatchItemList) -- every
 * hook here polls on its own interval while active, so an unmounted/
 * collapsed row stops polling entirely rather than accumulating N
 * simultaneous background queries across a large batch.
 */
export function PdfBatchItemProgressDetail({ item }: PdfBatchItemProgressDetailProps) {
  const jobId = item.auditJobId ?? undefined;

  const { data: jobData, startPolling, stopPolling } = useJobPolling();
  useEffect(() => {
    if (!jobId) return undefined;
    startPolling(jobId);
    return () => stopPolling();
    // startPolling/stopPolling are stable (useCallback) -- only re-run this
    // when the job we're actually polling changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  const autoModeStatusQuery = useAutoModeStatus(jobId);
  const autoStatus = autoModeStatusQuery.data;
  const hasRemediationRun = !!autoStatus && autoStatus.autoStatus !== null;
  const roundHistoryQuery = useAutoModeRoundHistory(jobId, {
    enabled: hasRemediationRun,
    isRunning: autoStatus?.autoStatus === 'running',
    completedRounds: autoStatus?.autoRoundsCompleted ?? 0,
  });
  const stopMutation = useStopAutoMode(jobId);

  if (!jobId) {
    return (
      <p className="text-xs text-gray-400 italic px-4 py-3">
        No progress detail available for this item yet.
      </p>
    );
  }

  return (
    <div className="px-4 py-3 bg-gray-50 border-t space-y-4">
      {jobData && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Audit</h4>
          <PdfJobProgressPanel jobData={jobData} progress={jobData.progress ?? 0} showUploadRow={false} />
        </div>
      )}

      {hasRemediationRun && autoStatus && (
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Remediation</h4>
          <AutoModeStatusCard
            status={autoStatus}
            onStop={() => stopMutation.mutate()}
            isStopping={stopMutation.isPending}
            stopError={stopMutation.error}
            stopSucceeded={stopMutation.isSuccess}
            rounds={roundHistoryQuery.data ?? []}
          />
        </div>
      )}

      {!jobData && !hasRemediationRun && (
        <p className="text-xs text-gray-400 italic">Loading progress…</p>
      )}
    </div>
  );
}
