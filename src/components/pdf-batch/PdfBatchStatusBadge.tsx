import { Badge } from '@/components/ui/Badge';
import type { PdfBatchStatus } from '@/types/pdfBatch.types';

function getVariant(status: PdfBatchStatus): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'DRAFT':
      return 'info';
    case 'QUEUED':
      return 'info';
    case 'PROCESSING':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'CANCELLED':
      return 'info';
    default:
      return 'info';
  }
}

export function PdfBatchStatusBadge({ status }: { status: PdfBatchStatus }) {
  return <Badge variant={getVariant(status)}>{status}</Badge>;
}
