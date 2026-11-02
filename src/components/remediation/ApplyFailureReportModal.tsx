/**
 * Apply Failure Report
 *
 * On-demand view of a job's permanently-failed AI suggestions (status:
 * 'failed', MAX_APPLY_ATTEMPTS exhausted), grouped by (suggestionType,
 * reason) and classified into an operator-facing category + plain-English
 * explanation. Closes the "27 failures invisible anywhere in the Issues
 * panel" gap found during the stuck-apply-fixes investigation this was
 * built for -- opened from PdfAuditResultsPage's "Apply Failure Report"
 * button, next to its "Failed (N)" filter chip.
 */
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { ApplyFailureCategory, ApplyFailureGroup, ApplyFailureReport } from '@/types/pdf-remediation.types';

const CATEGORY_ICON: Record<ApplyFailureCategory, React.ReactNode> = {
  needs_investigation: <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />,
  likely_resolved: <HelpCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />,
  correctly_skipped: <CheckCircle2 className="h-4 w-4 text-gray-400 flex-shrink-0" />,
};

const CATEGORY_STYLES: Record<ApplyFailureCategory, string> = {
  needs_investigation: 'bg-red-50 border-red-200',
  likely_resolved: 'bg-amber-50 border-amber-200',
  correctly_skipped: 'bg-gray-50 border-gray-200',
};

function FailureGroupRow({ group }: { group: ApplyFailureGroup }) {
  // Opens by default only for the category most worth an operator's
  // attention -- the other two are either stale (re-running AI Analysis is
  // the real fix, not reading this) or working as intended.
  const [expanded, setExpanded] = useState(group.category === 'needs_investigation');

  return (
    <div className={`border rounded-md overflow-hidden ${CATEGORY_STYLES[group.category]}`}>
      <button
        type="button"
        className="w-full flex items-start gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
        onClick={() => setExpanded((v) => !v)}
      >
        {CATEGORY_ICON[group.category]}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-gray-700">{group.suggestionType}</span>
            <span className="text-xs font-mono text-gray-400">×{group.count}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{group.categoryLabel}</p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-current border-opacity-10 px-3 py-2 space-y-2 bg-white bg-opacity-60 text-xs">
          <p className="text-gray-600 leading-relaxed">{group.explanation}</p>
          <p className="font-mono text-gray-500 break-all">{group.reason}</p>
          <p className="text-gray-400">
            Affected issue{group.issueIds.length === 1 ? '' : 's'}: {group.issueIds.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}

interface ApplyFailureReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
}

export function ApplyFailureReportModal({ isOpen, onClose, jobId }: ApplyFailureReportModalProps) {
  const [report, setReport] = useState<ApplyFailureReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !jobId) return;
    // Guards against a stale response (close/reopen or jobId change)
    // overwriting current state once an earlier request resolves late --
    // same pattern as PacReportModal's own report-fetch effect.
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    pdfRemediationService.getApplyFailureReport(jobId)
      .then((r) => { if (!cancelled) setReport(r); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load the apply failure report.');
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, jobId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Apply Failure Report</DialogTitle>
          <DialogDescription>
            {report
              ? `${report.totalFailed} suggestion${report.totalFailed === 1 ? '' : 's'} permanently failed to apply, in ${report.groups.length} group${report.groups.length === 1 ? '' : 's'}`
              : 'Why some AI fixes could not be applied'
            }
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
            <div className="py-8 text-center text-red-600 text-sm">{error}</div>
          )}

          {report && !isLoading && !error && (
            report.groups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nothing has permanently failed on this job.</p>
            ) : (
              <div className="space-y-1.5">
                {report.groups.map((group) => (
                  <FailureGroupRow key={`${group.suggestionType}:${group.reason}`} group={group} />
                ))}
              </div>
            )
          )}
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
