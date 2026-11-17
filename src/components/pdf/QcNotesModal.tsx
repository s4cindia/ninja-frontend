/**
 * QC Notes
 *
 * On-demand view of the notes/flags an operator filed while doing the Full
 * QC page-by-page structure-tag review (StructureTagPanel's "Flag" action)
 * -- reuses the existing Feedback feature (type: FULL_QC_REVIEW) rather than
 * a second mechanism. Opened from PdfAuditResultsPage's "QC Notes" button,
 * next to the "Review structure tags" toggle. Visible to anyone who can
 * already open this job's audit page -- unlike the global /feedback
 * dashboard, this is not gated to ADMIN/TEAM_LEADER.
 */
import { useEffect, useState } from 'react';
import type ExcelJS from 'exceljs';
import { AlertCircle, Download, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { api } from '@/services/api';
import type { FeedbackItem } from '@/types/feedback.types';

interface QcNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-600',
};

function contextValue(item: FeedbackItem, key: string): string {
  const value = item.context?.[key];
  return value === undefined || value === null ? '' : String(value);
}

export function QcNotesModal({ isOpen, onClose, jobId }: QcNotesModalProps) {
  const [items, setItems] = useState<FeedbackItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (!isOpen || !jobId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    api.get('/feedback', { params: { jobId, type: 'FULL_QC_REVIEW', limit: 100 } })
      .then((response) => {
        if (cancelled) return;
        setItems(response.data?.data?.items ?? []);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : 'Failed to load QC notes.';
        setError(message);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, jobId]);

  const handleDownloadExcel = async () => {
    if (!items || items.length === 0) return;
    setIsExporting(true);
    try {
      const ExcelJSMod: { default: typeof ExcelJS } = await import('exceljs');
      const wb = new ExcelJSMod.default.Workbook();
      const ws = wb.addWorksheet('Full QC Notes');
      const headers = ['Page', 'Element', 'Severity', 'Comment', 'Status', 'Submitted By', 'Date'];
      ws.addRow(headers);
      ws.getRow(1).font = { bold: true };

      for (const item of items) {
        ws.addRow([
          contextValue(item, 'pageNumber'),
          contextValue(item, 'elementPath'),
          item.severity ?? '',
          item.comment,
          item.status,
          item.userEmail ?? '',
          new Date(item.createdAt).toLocaleString(),
        ]);
      }

      ws.columns.forEach((column) => {
        let maxLength = 10;
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const length = cell.value ? String(cell.value).length : 0;
          if (length > maxLength) maxLength = length;
        });
        column.width = Math.min(maxLength + 2, 60);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `QC_Notes_${jobId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>QC Notes</DialogTitle>
          <DialogDescription>
            {items ? `${items.length} note${items.length === 1 ? '' : 's'} flagged during the structure tag review` : 'Notes flagged during the Full QC review'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {isLoading && (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading…
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 py-8 justify-center text-red-600 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {items && !isLoading && !error && (
            items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No QC notes have been flagged on this job yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-md px-3 py-2 text-xs">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-700">
                        Page {contextValue(item, 'pageNumber') || '—'}
                      </span>
                      {contextValue(item, 'elementPath') && (
                        <span className="font-mono text-gray-500">{contextValue(item, 'elementPath')}</span>
                      )}
                      {item.severity && (
                        <span className={`px-1.5 py-0.5 rounded font-medium ${SEVERITY_STYLES[item.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                          {item.severity}
                        </span>
                      )}
                      <span className="text-gray-400">{item.status}</span>
                    </div>
                    <p className="text-gray-700 leading-relaxed">{item.comment}</p>
                    <p className="text-gray-400 mt-1">
                      {item.userEmail ?? 'Unknown'} · {new Date(item.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex justify-between pt-3 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadExcel}
            disabled={!items || items.length === 0 || isExporting}
          >
            {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
            Download as Excel
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
