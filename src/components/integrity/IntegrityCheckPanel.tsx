/**
 * IntegrityCheckPanel - main panel for running integrity checks and viewing results.
 * Exports both standalone panel (IntegrityCheckPanel) and embeddable content (IntegrityCheckContent).
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Play, Loader2, RefreshCw, Download } from 'lucide-react';
import {
  useIntegrityCheck,
  useIntegrityIssues,
  useIntegritySummary,
  useApplyIntegrityFix,
  useIgnoreIntegrityIssue,
} from '@/hooks/useIntegrityCheck';
import { integrityService } from '@/services/integrity.service';
import type { IntegrityCheckType, IntegrityIssue, IntegrityIssueFilters } from '@/types/integrity';
import { getCheckTypeLabel } from '@/types/integrity';
import { formatDuration, csvSafeEscape } from '@/utils/format';
import { IntegrityIssueSummary } from './IntegrityIssueSummary';
import { IntegrityCheckTypeFilter } from './IntegrityCheckTypeFilter';
import { IntegrityIssueCard } from './IntegrityIssueCard';

interface ContentProps {
  documentId: string;
  onGoToLocation?: (text: string) => void;
  onApplyFix?: (originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => void;
}

/** Embeddable integrity content without outer wrapper/header (for use inside ValidatorPanel). */
export function IntegrityCheckContent({ documentId, onGoToLocation, onApplyFix: onApplyFixToEditor }: ContentProps) {
  const [filters, setFilters] = useState<IntegrityIssueFilters>({});
  const [downloading, setDownloading] = useState(false);
  const { startCheck, job, isRunning, isStarting, startError } = useIntegrityCheck(documentId);
  const { data: summaryData } = useIntegritySummary(documentId);
  const { data: issuesData, isLoading: issuesLoading } = useIntegrityIssues(documentId, filters);
  const applyFix = useApplyIntegrityFix(documentId);
  const ignoreIssue = useIgnoreIntegrityIssue(documentId);

  const handleCheckTypeChange = (type: IntegrityCheckType | undefined) => {
    setFilters((f) => ({ ...f, checkType: type, page: 1 }));
  };

  const handleGoToLocation = (issue: IntegrityIssue) => {
    if (!onGoToLocation) return;

    // Try originalText first (cleaned), then fall back to context
    const cleanOriginal = issue.originalText?.replace(/[\n\r]+/g, ' ').trim();

    // Use originalText if it's meaningful (>4 chars, not just a number)
    if (cleanOriginal && cleanOriginal.length > 4 && !/^\d+$/.test(cleanOriginal)) {
      onGoToLocation(cleanOriginal);
      return;
    }

    // Fall back to context field — extract a meaningful search snippet
    if (issue.context) {
      const cleanContext = issue.context.replace(/[\n\r]+/g, ' ').trim();
      // Use middle portion of context (skip truncated edges)
      if (cleanContext.length > 20) {
        const start = Math.min(10, Math.floor(cleanContext.length * 0.1));
        const end = Math.min(cleanContext.length, start + 60);
        const snippet = cleanContext.substring(start, end).trim();
        if (snippet.length > 10) {
          onGoToLocation(snippet);
          return;
        }
      }
      if (cleanContext.length > 4) {
        onGoToLocation(cleanContext);
        return;
      }
    }

    // Last resort: use cleaned originalText even if short
    if (cleanOriginal && cleanOriginal.length > 0) {
      onGoToLocation(cleanOriginal);
    }
  };

  const handlePageChange = (page: number) => {
    setFilters((f) => ({ ...f, page }));
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      // Fetch all issues with pagination
      const PAGE_SIZE = 500;
      let allIssuesList: typeof firstPage.issues = [];
      const firstPage = await integrityService.getIssues(documentId, { limit: PAGE_SIZE, page: 1 });
      allIssuesList = firstPage.issues;
      const totalPages = Math.ceil((firstPage.total || firstPage.issues.length) / PAGE_SIZE);
      for (let p = 2; p <= totalPages; p++) {
        const page = await integrityService.getIssues(documentId, { limit: PAGE_SIZE, page: p });
        allIssuesList = allIssuesList.concat(page.issues);
      }

      // Build CSV with BOM for Excel compatibility
      const headers = ['#', 'Title', 'Type', 'Severity', 'Status', 'Description', 'Original Text', 'Suggested Fix'];
      const rows = allIssuesList.map((issue, i) => {
        const typeLabel = getCheckTypeLabel(issue.checkType);
        return [
          String(i + 1),
          csvSafeEscape(issue.title),
          csvSafeEscape(typeLabel),
          csvSafeEscape(issue.severity),
          csvSafeEscape(issue.status),
          csvSafeEscape(issue.description),
          csvSafeEscape(issue.originalText || ''),
          csvSafeEscape(issue.suggestedFix || ''),
        ].join(',');
      });

      const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `integrity-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      {/* Run check button + progress */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-teal-600 text-white rounded hover:bg-teal-700 disabled:opacity-50"
            onClick={() => startCheck()}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Run Integrity Check
              </>
            )}
          </button>
          {!isRunning && issuesData && (
            <button type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              onClick={() => startCheck()}
              title="Re-run check"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {!isRunning && summaryData && Object.keys(summaryData).length > 0 && (
            <button type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 ml-auto"
              onClick={handleDownloadReport}
              disabled={downloading}
              title="Download report"
            >
              {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
              <span>Report</span>
            </button>
          )}
        </div>

        {isRunning && job && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
              <span>{isStarting ? 'Starting...' : `${job.progress}%`}</span>
              {job.issuesFound > 0 && <span>{job.issuesFound} issues found</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-teal-600 h-1.5 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
            </div>
          </div>
        )}

        {!isRunning && job && job.status === 'COMPLETED' && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-green-600">
              Completed in {formatDuration(job.startedAt, job.completedAt) || '—'}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{job.issuesFound} issues found</span>
          </div>
        )}

        {startError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Failed to start check: {startError.message || 'Unknown error'}
          </div>
        )}
      </div>

      {summaryData && Object.keys(summaryData).length > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <IntegrityIssueSummary summary={summaryData} />
        </div>
      )}

      {summaryData && Object.keys(summaryData).length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <IntegrityCheckTypeFilter
            selected={filters.checkType}
            onSelect={handleCheckTypeChange}
            summary={summaryData}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {issuesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {!issuesLoading && (!issuesData || issuesData.issues.length === 0) && !isRunning && (
          <div className="text-center py-8 text-sm text-gray-400">
            {summaryData && Object.keys(summaryData).length > 0
              ? 'No issues match the current filter.'
              : 'Run an integrity check to find issues.'}
          </div>
        )}

        {issuesData?.issues.map((issue) => (
          <IntegrityIssueCard
            key={issue.id}
            issue={issue}
            onApplyFix={(id) => {
              applyFix.mutate(id, {
                onSuccess: () => toast.success('Issue marked as resolved'),
                onError: () => toast.error('Failed to apply fix'),
              });
            }}
            onApplyFixToEditor={onApplyFixToEditor
              ? (original, fix) => onApplyFixToEditor(original, fix, 'integrity')
              : undefined}
            onIgnore={(id) => ignoreIssue.mutate({ issueId: id })}
            onGoToLocation={handleGoToLocation}
            isFixing={applyFix.isPending}
            isIgnoring={ignoreIssue.isPending}
          />
        ))}
      </div>

      {issuesData && issuesData.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
          <span>
            Page {issuesData.page} of {issuesData.totalPages} ({issuesData.total} issues)
          </span>
          <div className="flex gap-1">
            <button type="button"
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              onClick={() => handlePageChange(issuesData.page - 1)}
              disabled={issuesData.page <= 1}
            >
              Prev
            </button>
            <button type="button"
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              onClick={() => handlePageChange(issuesData.page + 1)}
              disabled={issuesData.page >= issuesData.totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

interface Props {
  documentId: string;
  onClose: () => void;
  onGoToLocation?: (text: string) => void;
}

/** Standalone IntegrityCheckPanel (kept for backward compatibility). */
export function IntegrityCheckPanel({ documentId, onClose, onGoToLocation }: Props) {
  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-sm">Integrity Check</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close panel">
          <X className="w-4 h-4" />
        </button>
      </div>
      <IntegrityCheckContent documentId={documentId} onGoToLocation={onGoToLocation} />
    </div>
  );
}
