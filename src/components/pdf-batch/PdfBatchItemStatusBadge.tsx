import { Clock, Hourglass, Loader2, CheckCircle, XCircle, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { getPdfBatchItemStatusMeta, type PdfBatchItemStatusIconKind } from '@/utils/pdfBatchItemStatus';
import type { PdfBatchItemStatus } from '@/types/pdfBatch.types';

interface PdfBatchItemStatusBadgeProps {
  status: PdfBatchItemStatus;
  /** Show the explanatory description line below the badge — off by default for compact table rows. */
  showDescription?: boolean;
}

function StatusIcon({ icon }: { icon: PdfBatchItemStatusIconKind }) {
  switch (icon) {
    case 'waiting':
      return <Clock className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'budget-wait':
      // Distinct from the plain "waiting to start" clock — this item is
      // actively queued behind the tenant's concurrency budget, not just
      // sitting unstarted.
      return <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'active':
      return <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />;
    case 'done':
      return <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'failed':
      return <XCircle className="h-3.5 w-3.5" aria-hidden="true" />;
    case 'skipped':
      return <Ban className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}

export function PdfBatchItemStatusBadge({ status, showDescription = false }: PdfBatchItemStatusBadgeProps) {
  const meta = getPdfBatchItemStatusMeta(status);

  return (
    <div className="inline-flex flex-col gap-0.5">
      <Badge variant={meta.variant} size="sm" className="inline-flex items-center gap-1.5">
        <StatusIcon icon={meta.icon} />
        {meta.label}
      </Badge>
      {showDescription && (
        <span className="text-xs text-gray-500">{meta.description}</span>
      )}
    </div>
  );
}
