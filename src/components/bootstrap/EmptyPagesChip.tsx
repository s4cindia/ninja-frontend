import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, CheckCircle2, Loader2, Wand2, X } from 'lucide-react';
import { formatPageRanges } from '@/lib/page-ranges';
import { trackEvent } from '@/lib/telemetry';
import {
  EMPTY_PAGE_REVIEW_KEYS,
  useEmptyPageReviews,
} from '@/hooks/useEmptyPageReviews';
import {
  LEGIT_EMPTY_PAGE_TYPES,
  saveEmptyPageReview,
  type EmptyPageType,
} from '@/services/empty-page-review.service';

interface EmptyPagesChipProps {
  runId: string;
  filename?: string;
  emptyPages: number[] | undefined;
  pageCount: number;
  currentPage: number;
  onJumpToPage: (page: number) => void;
}

interface RangeChunk {
  display: string;
  start: number;
  end: number;
}

function parseRangeChunks(formatted: string): RangeChunk[] {
  if (!formatted) return [];
  return formatted.split(', ').map((chunk) => {
    const parts = chunk.split('–');
    const start = parseInt(parts[0], 10);
    const end = parts.length === 2 ? parseInt(parts[1], 10) : start;
    return { display: chunk, start, end };
  });
}

export function EmptyPagesChip({
  runId,
  filename,
  emptyPages,
  pageCount,
  currentPage,
  onJumpToPage,
}: EmptyPagesChipProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize once: dedupe, drop non-positive integers, sort ascending.
  // Everything downstream (count, ranges, next-empty button) reads from here so
  // the chip's number always matches the popover's range list.
  const sorted = useMemo(
    () =>
      Array.from(new Set(emptyPages ?? []))
        .filter((p) => Number.isInteger(p) && p > 0)
        .sort((a, b) => a - b),
    [emptyPages],
  );

  // Reviewed pages — used to show progress and skip to next unreviewed.
  const { data: reviewsData } = useEmptyPageReviews(runId);
  const reviewedSet = useMemo(
    () => new Set((reviewsData?.reviews ?? []).map((r) => r.pageNumber)),
    [reviewsData],
  );

  const queryClient = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPageType, setBulkPageType] = useState<EmptyPageType>('blank');
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    failed: number;
  } | null>(null);

  const rangeChunks = useMemo(
    () => parseRangeChunks(formatPageRanges(sorted)),
    [sorted],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Hide entirely when undefined or zero — no clutter for healthy or unbackfilled docs.
  if (sorted.length === 0) return null;

  const pct =
    pageCount > 0 ? ((sorted.length / pageCount) * 100).toFixed(1) : '0';
  const reviewedCount = sorted.filter((p) => reviewedSet.has(p)).length;
  const unreviewedPages = sorted.filter((p) => !reviewedSet.has(p));
  const unreviewedCount = unreviewedPages.length;
  const allReviewed = unreviewedCount === 0;
  // Skip already-reviewed pages — operator wants "next thing to do."
  const nextUnreviewed = sorted.find(
    (p) => p > currentPage && !reviewedSet.has(p),
  );
  // Fall back to first unreviewed in the document if nothing follows current page.
  const firstUnreviewed = unreviewedPages[0];
  const nextTarget = nextUnreviewed ?? firstUnreviewed;

  const handleBulkApply = async () => {
    const total = unreviewedPages.length;
    if (total === 0) return;
    setBulkProgress({ current: 0, total, failed: 0 });
    trackEvent('empty-page-review.bulk-start', {
      runId,
      total,
      pageType: bulkPageType,
    });
    let failed = 0;
    // Sequential to avoid hammering the backend. ~74 pages × ~150ms each ≈ 11s
    // for the worst case in staging today; acceptable for an operator-initiated
    // action. Calls the service directly (bypassing useSaveEmptyPageReview)
    // so we don't re-invalidate the list on every iteration — invalidation
    // happens once at the end.
    for (let i = 0; i < unreviewedPages.length; i++) {
      const page = unreviewedPages[i];
      try {
        await saveEmptyPageReview(runId, page, {
          category: 'LEGIT_EMPTY',
          pageType: bulkPageType,
        });
      } catch {
        failed += 1;
      }
      setBulkProgress({ current: i + 1, total, failed });
    }
    // Refresh the list and any per-page caches in one shot post-loop.
    queryClient.invalidateQueries({
      queryKey: EMPTY_PAGE_REVIEW_KEYS.list(runId),
    });
    trackEvent('empty-page-review.bulk-complete', {
      runId,
      total,
      failed,
      pageType: bulkPageType,
    });
    // Leave the progress visible for a moment so the operator sees the result,
    // then collapse the bulk panel.
    setTimeout(() => {
      setBulkProgress(null);
      setBulkOpen(false);
    }, 1500);
  };

  const bulkBusy = bulkProgress !== null;

  const isChunkReviewed = (chunk: RangeChunk) => {
    for (let p = chunk.start; p <= chunk.end; p++) {
      if (!reviewedSet.has(p)) return false;
    }
    return true;
  };

  const handleJump = (page: number) => {
    onJumpToPage(page);
    setOpen(false);
  };

  const chipClass = allReviewed
    ? 'inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-green-300 bg-green-50 text-green-800 hover:bg-green-100 transition-colors'
    : 'inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors';
  const chipTitle = allReviewed
    ? `All ${sorted.length} empty pages reviewed.`
    : `${sorted.length} of ${pageCount} pages have no detected zones (${pct}%). ${reviewedCount} of ${sorted.length} reviewed. Click for the list.`;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={chipClass}
        title={chipTitle}
        aria-label={chipTitle}
        aria-expanded={open}
      >
        {allReviewed ? (
          <CheckCircle2 className="h-3 w-3" />
        ) : (
          <AlertTriangle className="h-3 w-3" />
        )}
        {sorted.length} empty
        {!allReviewed && reviewedCount > 0 && (
          <span className="text-[10px] opacity-75 ml-0.5">
            · {reviewedCount}/{sorted.length}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Empty pages"
          className="absolute top-full right-0 mt-1 w-72 z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">
                Empty Pages
              </div>
              {filename && (
                <div
                  className="text-xs text-gray-500 truncate"
                  title={filename}
                >
                  {filename}
                </div>
              )}
              <div className="text-xs text-gray-500">
                {sorted.length} of {pageCount} have no detected zones ({pct}%)
              </div>
              <div className="text-xs text-gray-500">
                {allReviewed ? (
                  <span className="text-green-700 font-medium">
                    All {sorted.length} reviewed
                  </span>
                ) : (
                  <>
                    <span className="text-gray-700 font-medium">
                      {reviewedCount}
                    </span>{' '}
                    of {sorted.length} reviewed
                  </>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 -mr-1 -mt-1 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="text-xs leading-relaxed break-words mb-3">
            {rangeChunks.map((chunk, i) => {
              const isCurrent =
                currentPage >= chunk.start && currentPage <= chunk.end;
              const reviewed = isChunkReviewed(chunk);
              const baseClass = reviewed
                ? 'text-green-700 hover:bg-green-50'
                : 'text-amber-700 hover:bg-amber-50';
              const currentClass = reviewed
                ? 'font-bold text-green-900 bg-green-100'
                : 'font-bold text-amber-900 bg-amber-100';
              return (
                <span key={`${chunk.start}-${chunk.end}`}>
                  <button
                    type="button"
                    onClick={() => handleJump(chunk.start)}
                    className={`px-1 py-0.5 rounded font-mono hover:underline inline-flex items-center gap-0.5 ${
                      isCurrent ? currentClass : baseClass
                    }`}
                    title={
                      reviewed
                        ? `Page ${chunk.start} reviewed — click to revisit`
                        : `Jump to page ${chunk.start}`
                    }
                  >
                    {reviewed && <Check className="h-2.5 w-2.5" />}
                    {chunk.display}
                  </button>
                  {i < rangeChunks.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => nextTarget && handleJump(nextTarget)}
            disabled={!nextTarget || bulkBusy}
            className="w-full text-xs px-2 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {!nextTarget
              ? 'All empty pages reviewed'
              : nextUnreviewed
              ? `Next unreviewed empty page → ${nextUnreviewed}`
              : `Wrap to first unreviewed → ${firstUnreviewed}`}
          </button>

          {/* Bulk-mark — only when there's enough work to justify the affordance */}
          {!allReviewed && unreviewedCount > 1 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              {!bulkOpen && !bulkBusy && (
                <button
                  type="button"
                  onClick={() => setBulkOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1 text-xs px-2 py-1 rounded text-gray-600 hover:bg-gray-50 hover:text-gray-800 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  Bulk mark {unreviewedCount} unreviewed as legit empty…
                </button>
              )}

              {bulkOpen && !bulkBusy && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-medium text-gray-700">
                    Page type for all {unreviewedCount} unreviewed pages
                  </label>
                  <select
                    value={bulkPageType}
                    onChange={(e) =>
                      setBulkPageType(e.target.value as EmptyPageType)
                    }
                    className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400"
                  >
                    {LEGIT_EMPTY_PAGE_TYPES.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={handleBulkApply}
                      className="flex-1 text-xs px-2 py-1.5 rounded bg-[#006B6B] text-white hover:bg-[#005858] transition-colors"
                    >
                      Apply to {unreviewedCount} pages
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkOpen(false)}
                      className="text-xs px-2 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 leading-tight">
                    Skips pages already reviewed. Each row is recorded under your
                    user. Use the sidebar form to override individual pages
                    afterwards.
                  </p>
                </div>
              )}

              {bulkBusy && bulkProgress && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs text-gray-700">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {bulkProgress.current < bulkProgress.total
                      ? `Marking ${bulkProgress.current} of ${bulkProgress.total}…`
                      : `Done — ${bulkProgress.total - bulkProgress.failed} of ${bulkProgress.total} marked${
                          bulkProgress.failed > 0 ? `, ${bulkProgress.failed} failed` : ''
                        }`}
                  </div>
                  <div className="h-1 w-full bg-gray-200 rounded overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        bulkProgress.failed > 0 ? 'bg-amber-500' : 'bg-[#006B6B]'
                      }`}
                      style={{
                        width: `${
                          (bulkProgress.current / bulkProgress.total) * 100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
