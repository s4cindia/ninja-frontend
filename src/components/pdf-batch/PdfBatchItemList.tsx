import { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { PdfBatchItemStatusBadge } from '@/components/pdf-batch/PdfBatchItemStatusBadge';
import { PdfBatchItemElapsed } from '@/components/pdf-batch/PdfBatchItemElapsed';
import { PdfBatchItemProgressDetail } from '@/components/pdf-batch/PdfBatchItemProgressDetail';
import type { PdfBatchItem, PdfBatchItemStatus } from '@/types/pdfBatch.types';

interface PdfBatchItemListProps {
  items: PdfBatchItem[];
  /** Items are only removable while the batch is still DRAFT. */
  removable?: boolean;
  onRemove?: (itemId: string) => void;
  removingItemId?: string;
}

// Only these statuses have a real underlying Job to show progress for --
// UPLOADED/QUEUED_FOR_BUDGET haven't started one yet, and REMEDIATED/
// FAILED/SKIPPED get their own (terminal, round-history) treatment on the
// Results page instead.
const EXPANDABLE_STATUSES: readonly PdfBatchItemStatus[] = ['AUDITING', 'AUDITED', 'HELD_FOR_BUDGET', 'REMEDIATING'];

export function PdfBatchItemList({ items, removable = false, onRemove, removingItemId }: PdfBatchItemListProps) {
  // Expanded rows only -- each PdfBatchItemProgressDetail polls on its own
  // interval while mounted, so collapsing a row actually stops its extra
  // network traffic instead of just hiding it.
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Files ({items.length})</h2>
        </div>

        <ul className="divide-y" role="list" aria-label="Batch items">
          {items.map((item) => {
            const canExpand = !!item.auditJobId && EXPANDABLE_STATUSES.includes(item.status);
            const isExpanded = canExpand && expandedItemIds.has(item.itemId);

            return (
              <li key={item.itemId}>
                <div className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between gap-4">
                    {canExpand ? (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(item.itemId)}
                        className="flex-1 min-w-0 text-left flex items-center gap-2"
                        aria-expanded={isExpanded}
                        aria-label={`${isExpanded ? 'Hide' : 'Show'} progress detail for ${item.originalName}`}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400 shrink-0" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{item.originalName}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <PdfBatchItemStatusBadge status={item.status} showDescription />
                            <PdfBatchItemElapsed item={item} />
                          </div>
                          {item.error && <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>}
                        </div>
                      </button>
                    ) : (
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.originalName}</p>
                        <div className="mt-1 flex items-center gap-2">
                          <PdfBatchItemStatusBadge status={item.status} showDescription />
                          <PdfBatchItemElapsed item={item} />
                        </div>
                        {item.error && <p className="text-xs text-red-600 mt-1">Error: {item.error}</p>}
                      </div>
                    )}

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
                </div>

                {isExpanded && <PdfBatchItemProgressDetail item={item} />}
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
