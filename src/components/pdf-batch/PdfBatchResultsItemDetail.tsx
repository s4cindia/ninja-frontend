/**
 * PdfBatchResultsItemDetail
 *
 * Expanded per-item rich detail for a TERMINAL (REMEDIATED/FAILED/SKIPPED)
 * batch item on the Results page — the single-file PDF page's own audit
 * timing breakdown and full remediation round history, reused here exactly
 * as-is, mirroring PdfBatchItemProgressDetail's reuse treatment for
 * in-progress items on the Detail page (see that component's own doc
 * comment).
 *
 * Deliberately does NOT reuse PdfBatchItemProgressDetail's live hooks
 * (useJobPolling/useAutoModeStatus/useAutoModeRoundHistory) — those poll on
 * an interval, which makes no sense for an item that's already finished.
 * Instead:
 *   - Audit timing: useJob(item.auditJobId), which already degrades into a
 *     single one-time fetch for a terminal job (its own refetchInterval
 *     returns false once status leaves QUEUED/PROCESSING) — no separate
 *     "terminal" variant needed.
 *   - Remediation history: RemediationHistoryCard, the single-file page's
 *     own generic round-by-round view (GET /pdf/:jobId/remediation/history)
 *     — fetches once on mount and is safe to pass a constant
 *     remediationCycleInProgress=false, since there's no in-progress cycle
 *     to transition out of for an item that's already done. Renders
 *     nothing if there's no history (e.g. FMHE never reached remediation).
 *
 * "View Full Results" navigates to /pdf/audit/:jobId -- the existing
 * single-file PdfAuditResultsPage, completely unmodified. That page is
 * driven purely by jobId (useParams), with no batch-specific coupling
 * anywhere in it (MatterhornSummary and the page-by-page viewer aren't
 * gated by trial/upload-flow origin), and every batch item's auditJobId is
 * a real Job row identical in shape to one created by the single-upload
 * flow -- so this gets the Matterhorn Protocol compliance panel and the
 * full page viewer for free, with zero new UI work, instead of trying to
 * cram that page's full layout into this inline expandable row.
 */
import { useNavigate } from 'react-router-dom';
import { Maximize2 } from 'lucide-react';
import { useJob } from '@/hooks/useJobs';
import type { JobData } from '@/hooks/useJobPolling';
import { PdfJobProgressPanel } from '@/components/pdf/PdfJobProgressPanel';
import { RemediationHistoryCard } from '@/components/pdf/RemediationHistoryCard';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

interface PdfBatchResultsItemDetailProps {
  item: PdfBatchItem;
}

export function PdfBatchResultsItemDetail({ item }: PdfBatchResultsItemDetailProps) {
  const jobId = item.auditJobId ?? null;
  const { data: job, isLoading } = useJob(jobId);
  const navigate = useNavigate();

  if (!jobId) {
    return (
      <p className="text-xs text-gray-400 italic px-4 py-3">
        No detail available for this item.
      </p>
    );
  }

  return (
    <div className="px-4 py-3 bg-gray-50 space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => navigate(`/pdf/audit/${jobId}`)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
        >
          <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
          View Full Results
        </button>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Audit</h4>
        {job ? (
          // Job/JobData are structurally compatible for every field this
          // panel actually reads (input/output/started/completed/created/
          // progress) -- Job's own status union just includes 'CANCELLED',
          // which this panel never inspects.
          <PdfJobProgressPanel jobData={job as unknown as JobData} progress={job.progress} showUploadRow={false} />
        ) : (
          <p className="text-xs text-gray-400 italic">{isLoading ? 'Loading…' : 'No audit data available.'}</p>
        )}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Remediation</h4>
        <RemediationHistoryCard jobId={jobId} remediationCycleInProgress={false} />
      </div>
    </div>
  );
}
