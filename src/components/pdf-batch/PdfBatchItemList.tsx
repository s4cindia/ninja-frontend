import { X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { PdfBatchItemStatusBadge } from '@/components/pdf-batch/PdfBatchItemStatusBadge';
import { PdfBatchItemElapsed } from '@/components/pdf-batch/PdfBatchItemElapsed';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

interface PdfBatchItemListProps {
  items: PdfBatchItem[];
  /** Items are only removable while the batch is still DRAFT. */
  removable?: boolean;
  onRemove?: (itemId: string) => void;
  removingItemId?: string;
}

export function PdfBatchItemList({ items, removable = false, onRemove, removingItemId }: PdfBatchItemListProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Files ({items.length})</h2>
        </div>

        <ul className="divide-y" role="list" aria-label="Batch items">
          {items.map((item) => (
            <li key={item.itemId} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.originalName}</p>
                  <div className="mt-1 flex items-center gap-2">
                    <PdfBatchItemStatusBadge status={item.status} showDescription />
                    <PdfBatchItemElapsed item={item} />
                  </div>
                  {item.error && <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>}
                </div>

                {removable && onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(item.itemId)}
                    disabled={removingItemId === item.itemId}
                    className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 shrink-0"
                    aria-label={`Remove ${item.originalName}`}
                  >
                    <X className="h-5 w-5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
