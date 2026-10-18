/**
 * PdfBatchResultsList
 *
 * Per-item final results table for a completed (or partially-completed)
 * PDF batch. Download reuses the existing single-job DownloadRemediatedButton
 * (which proxies through the authenticated `GET /pdf/:jobId/remediation/download`
 * endpoint rather than using a raw href) via each item's `auditJobId`
 * (ninja-backend#678) — pdf-batch has no download route of its own, but
 * each item corresponds 1:1 with a real Job the existing endpoint already
 * serves. Falls back to a "pending" indicator for items processed before
 * #678 shipped, where `auditJobId` isn't present yet.
 */

import { Fragment, useState } from 'react';
import { Download, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { PdfBatchItemStatusBadge } from '@/components/pdf-batch/PdfBatchItemStatusBadge';
import { DownloadRemediatedButton } from '@/components/pdf/DownloadRemediatedButton';
import { PdfBatchResultsItemDetail } from '@/components/pdf-batch/PdfBatchResultsItemDetail';
import { getScoreColorConfig } from '@/types/job-output.types';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

interface PdfBatchResultsListProps {
  items: PdfBatchItem[];
}

const RESULTS_TABLE_COLUMN_COUNT = 7;

export function PdfBatchResultsList({ items }: PdfBatchResultsListProps) {
  // Expanded rows only -- PdfBatchResultsItemDetail's useJob/
  // RemediationHistoryCard each do a one-time fetch when mounted, not a
  // continuous poll, but there's still no reason to fetch N items' worth of
  // detail up front when a results table can hold many rows.
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
          <h2 className="text-lg font-semibold text-gray-900">Results ({items.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issues</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auto-Fixed</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guidance Only</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Download</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => {
                const canExpand = !!item.auditJobId;
                const isExpanded = canExpand && expandedItemIds.has(item.itemId);

                return (
                  <Fragment key={item.itemId}>
                    <tr>
                      <td className="px-6 py-4">
                        {canExpand ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(item.itemId)}
                            className="flex items-start gap-1.5 text-left"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Hide' : 'Show'} detail for ${item.originalName}`}
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400 shrink-0 mt-0.5" aria-hidden="true" />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.originalName}</div>
                              {item.pageCount != null && (
                                <div className="text-xs text-gray-500">{item.pageCount} page{item.pageCount !== 1 ? 's' : ''}</div>
                              )}
                              {item.error && <div className="text-xs text-red-600 mt-1">{item.error}</div>}
                            </div>
                          </button>
                        ) : (
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.originalName}</div>
                            {item.pageCount != null && (
                              <div className="text-xs text-gray-500">{item.pageCount} page{item.pageCount !== 1 ? 's' : ''}</div>
                            )}
                            {item.error && <div className="text-xs text-red-600 mt-1">{item.error}</div>}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <PdfBatchItemStatusBadge status={item.status} />
                      </td>
                      <td
                        className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          item.auditScore != null ? getScoreColorConfig(item.auditScore).text : 'text-gray-600'
                        }`}
                      >
                        {item.auditScore != null ? `${item.auditScore}%` : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {item.issuesFound ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                        {item.issuesAutoFixed ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600">
                        {item.issuesGuidanceOnly ?? '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        {item.remediatedFilePath && item.auditJobId ? (
                          <DownloadRemediatedButton
                            jobId={item.auditJobId}
                            fileName={item.originalName}
                            remediatedFileUrl={item.remediatedFilePath}
                          />
                        ) : item.remediatedFilePath ? (
                          <span
                            className="inline-flex items-center gap-1 text-gray-400"
                            title="Remediated file is ready — this batch item predates download support"
                          >
                            <Clock className="h-4 w-4" aria-hidden="true" />
                            Pending
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-gray-300">
                            <Download className="h-4 w-4" aria-hidden="true" />
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={RESULTS_TABLE_COLUMN_COUNT} className="p-0 border-t-0">
                          <PdfBatchResultsItemDetail item={item} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
