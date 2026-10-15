/**
 * Live elapsed-time ticker for an actively-processing batch item, anchored
 * on auditStartedAt (AUDITING) or remediationStartedAt (REMEDIATING) —
 * ninja-backend#678. Renders nothing for any other status or if the
 * relevant anchor isn't present yet (e.g. items processed before #678).
 */
import { useEffect, useState } from 'react';
import { formatDuration } from '@/utils/duration';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

interface PdfBatchItemElapsedProps {
  item: PdfBatchItem;
}

export function PdfBatchItemElapsed({ item }: PdfBatchItemElapsedProps) {
  const startedAt = item.status === 'AUDITING'
    ? item.auditStartedAt
    : item.status === 'REMEDIATING'
      ? item.remediationStartedAt
      : null;

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [startedAt]);

  if (!startedAt) return null;

  const elapsedMs = now - new Date(startedAt).getTime();
  if (elapsedMs < 0) return null;

  return (
    <span className="text-xs text-gray-500" data-testid="pdf-batch-item-elapsed">
      {formatDuration(elapsedMs)}
    </span>
  );
}
