/**
 * PdfBatchStatusSummary
 *
 * A batch-level progress summary that deliberately avoids a single
 * fill-to-100% progress bar — there's no reliable way to estimate an ETA
 * (each item is a full multi-round Auto Mode remediation that can take
 * 30-90+ minutes), so implying near-term completion would be misleading.
 * Instead: a live elapsed-time counter (anchored on the one reliable
 * timestamp, `startedAt`) plus a breakdown of how many items are in each
 * status, including the budget-wait states.
 */

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { formatDuration } from '@/utils/duration';
import { getPdfBatchItemStatusMeta } from '@/utils/pdfBatchItemStatus';
import type { PdfBatchDetail, PdfBatchItemStatus } from '@/types/pdfBatch.types';

interface PdfBatchStatusSummaryProps {
  batch: PdfBatchDetail;
}

const STATUS_DISPLAY_ORDER: PdfBatchItemStatus[] = [
  'UPLOADED',
  'QUEUED_FOR_BUDGET',
  'AUDITING',
  'AUDITED',
  'HELD_FOR_BUDGET',
  'REMEDIATING',
  'REMEDIATED',
  'FAILED',
  'SKIPPED',
];

export function PdfBatchStatusSummary({ batch }: PdfBatchStatusSummaryProps) {
  const isActive = batch.status === 'QUEUED' || batch.status === 'PROCESSING';
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!isActive || !batch.startedAt) return;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [isActive, batch.startedAt]);

  const elapsedMs = isActive && batch.startedAt ? now - new Date(batch.startedAt).getTime() : undefined;

  const counts = STATUS_DISPLAY_ORDER
    .map((status) => ({ status, count: batch.statusCounts[status] ?? 0 }))
    .filter((entry) => entry.count > 0);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Processing Progress</h2>
        {elapsedMs != null && elapsedMs >= 0 && (
          <div className="flex items-center gap-1.5 text-sm text-gray-600" data-testid="pdf-batch-elapsed">
            <Clock className="h-4 w-4" aria-hidden="true" />
            Running for {formatDuration(elapsedMs)}
          </div>
        )}
      </div>

      {isActive && (
        <p className="text-sm text-gray-600 mb-4">
          Each file goes through a full multi-round AI remediation pass (up to 10 rounds).
          A batch of several real-world PDFs can legitimately take hours — items waiting
          for capacity are queued, not stuck.
        </p>
      )}

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {counts.map(({ status, count }) => {
          const meta = getPdfBatchItemStatusMeta(status);
          return (
            <div key={status}>
              <dt className="text-sm text-gray-600">{meta.label}</dt>
              <dd className="text-2xl font-bold text-gray-900">{count}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
