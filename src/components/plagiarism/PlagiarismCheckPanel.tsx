/**
 * PlagiarismCheckPanel - panel for running plagiarism checks and viewing results.
 * Exports both standalone panel (PlagiarismCheckPanel) and embeddable content (PlagiarismCheckContent).
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { X, Play, Loader2, RefreshCw, Download } from 'lucide-react';
import {
  usePlagiarismCheck,
  usePlagiarismMatches,
  usePlagiarismSummary,
  useReviewPlagiarismMatch,
} from '@/hooks/usePlagiarismCheck';
import { plagiarismService } from '@/services/plagiarism.service';
import type { PlagiarismMatchFilters, MatchReviewStatus } from '@/types/plagiarism';
import { MATCH_TYPE_LABELS, CLASSIFICATION_LABELS } from '@/types/plagiarism';
import { formatDuration, csvSafeEscape } from '@/utils/format';
import { PlagiarismSummary } from './PlagiarismSummary';
import { PlagiarismFilterBar } from './PlagiarismFilterBar';
import { PlagiarismMatchCard } from './PlagiarismMatchCard';

interface ContentProps {
  documentId: string;
  onGoToLocation?: (text: string) => void;
  onApplyFix?: (originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => void;
}

/** Embeddable plagiarism content without outer wrapper/header (for use inside ValidatorPanel). */
export function PlagiarismCheckContent({ documentId, onGoToLocation, onApplyFix }: ContentProps) {
  const handleApplyFix = onApplyFix
    ? (originalText: string, fixText: string) => onApplyFix(originalText, fixText, 'plagiarism')
    : undefined;
  const [filters, setFilters] = useState<PlagiarismMatchFilters>({});
  const [downloading, setDownloading] = useState(false);
  const { startCheck, job, isRunning, isStarting, startError } = usePlagiarismCheck(documentId);
  const { data: summaryData } = usePlagiarismSummary(documentId);
  const { data: matchesData, isLoading: matchesLoading } = usePlagiarismMatches(documentId, filters);
  const reviewMatch = useReviewPlagiarismMatch(documentId);

  const handleReview = (matchId: string, status: Exclude<MatchReviewStatus, 'PENDING'>) => {
    reviewMatch.mutate({ matchId, status });
  };

  const handlePageChange = (page: number) => {
    setFilters((f) => ({ ...f, page }));
  };

  const handleDownloadReport = async () => {
    try {
      setDownloading(true);
      // Fetch all matches with pagination
      const PAGE_SIZE = 100;
      let allMatchesList: typeof firstPage.matches = [];
      const firstPage = await plagiarismService.getMatches(documentId, { limit: PAGE_SIZE, page: 1 });
      allMatchesList = firstPage.matches;
      const totalPages = Math.ceil((firstPage.total || firstPage.matches.length) / PAGE_SIZE);
      for (let p = 2; p <= totalPages; p++) {
        const page = await plagiarismService.getMatches(documentId, { limit: PAGE_SIZE, page: p });
        allMatchesList = allMatchesList.concat(page.matches);
      }

      // Build CSV with BOM for Excel compatibility
      const headers = ['#', 'Match Type', 'Classification', 'Similarity %', 'Confidence %', 'Status', 'Source Text', 'Matched Text', 'AI Reasoning'];
      const rows = allMatchesList.map((match, i) => {
        const typeLabel = MATCH_TYPE_LABELS[match.matchType]?.label || match.matchType;
        const clsLabel = CLASSIFICATION_LABELS[match.classification]?.label || match.classification;
        return [
          String(i + 1),
          csvSafeEscape(typeLabel),
          csvSafeEscape(clsLabel),
          String((match.similarityScore * 100).toFixed(0)),
          String(match.confidence),
          csvSafeEscape(match.status),
          csvSafeEscape(match.sourceText),
          csvSafeEscape(match.matchedText),
          csvSafeEscape(match.aiReasoning || ''),
        ].join(',');
      });

      const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `plagiarism-report-${new Date().toISOString().slice(0, 10)}.csv`;
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-600 text-white rounded hover:bg-amber-700 disabled:opacity-50"
            onClick={startCheck}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Run Plagiarism Check
              </>
            )}
          </button>
          {!isRunning && matchesData && (
            <button type="button"
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700"
              onClick={startCheck}
              title="Re-run check"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          )}
          {!isRunning && summaryData && summaryData.total > 0 && (
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
              {job.matchesFound > 0 && <span>{job.matchesFound} matches</span>}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div className="bg-amber-500 h-1.5 rounded-full transition-all" style={{ width: `${job.progress}%` }} />
            </div>
          </div>
        )}

        {!isRunning && job && job.status === 'COMPLETED' && (
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-green-600">
              Completed in {formatDuration(job.startedAt, job.completedAt) || '—'}
            </span>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{job.matchesFound} matches found</span>
          </div>
        )}

        {startError && (
          <div className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
            Failed to start check: {startError.message || 'Unknown error'}
          </div>
        )}
      </div>

      {summaryData && summaryData.total > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <PlagiarismSummary summary={summaryData} />
        </div>
      )}

      {summaryData && summaryData.total > 0 && (
        <div className="px-4 py-2 border-b border-gray-100">
          <PlagiarismFilterBar filters={filters} onFilterChange={setFilters} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
        {matchesLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        )}

        {!matchesLoading && (!matchesData || matchesData.matches.length === 0) && !isRunning && (
          <div className="text-center py-8 text-sm text-gray-400">
            {summaryData && summaryData.total > 0
              ? 'No matches match the current filter.'
              : 'Run a plagiarism check to detect similarities.'}
          </div>
        )}

        {matchesData?.matches.map((match) => (
          <PlagiarismMatchCard
            key={match.id}
            match={match}
            onReview={handleReview}
            onGoToLocation={onGoToLocation}
            onApplyFix={handleApplyFix}
            isReviewing={reviewMatch.isPending}
          />
        ))}
      </div>

      {matchesData && matchesData.totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
          <span>
            Page {matchesData.page} of {matchesData.totalPages} ({matchesData.total} matches)
          </span>
          <div className="flex gap-1">
            <button type="button"
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              onClick={() => handlePageChange(matchesData.page - 1)}
              disabled={matchesData.page <= 1}
            >
              Prev
            </button>
            <button type="button"
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40"
              onClick={() => handlePageChange(matchesData.page + 1)}
              disabled={matchesData.page >= matchesData.totalPages}
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
  onApplyFix?: (originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => void;
}

/** Standalone PlagiarismCheckPanel (kept for backward compatibility). */
export function PlagiarismCheckPanel({ documentId, onClose, onGoToLocation, onApplyFix }: Props) {
  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-amber-50">
        <h3 className="font-semibold text-sm text-amber-900">Plagiarism Check</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close panel">
          <X className="w-4 h-4" />
        </button>
      </div>
      <PlagiarismCheckContent documentId={documentId} onGoToLocation={onGoToLocation} onApplyFix={onApplyFix} />
    </div>
  );
}
