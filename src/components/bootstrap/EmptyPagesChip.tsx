import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { formatPageRanges } from '@/lib/page-ranges';

interface EmptyPagesChipProps {
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
  const next = sorted.find((p) => p > currentPage);

  const handleJump = (page: number) => {
    onJumpToPage(page);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium rounded border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
        title={`${sorted.length} of ${pageCount} pages have no detected zones (${pct}%). Click for the list.`}
        aria-label={`${sorted.length} empty pages — click for list`}
        aria-expanded={open}
      >
        <AlertTriangle className="h-3 w-3" />
        {sorted.length} empty
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
              return (
                <span key={`${chunk.start}-${chunk.end}`}>
                  <button
                    type="button"
                    onClick={() => handleJump(chunk.start)}
                    className={`px-1 py-0.5 rounded font-mono hover:underline ${
                      isCurrent
                        ? 'font-bold text-amber-900 bg-amber-100'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                    title={`Jump to page ${chunk.start}`}
                  >
                    {chunk.display}
                  </button>
                  {i < rangeChunks.length - 1 ? ', ' : ''}
                </span>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => next && handleJump(next)}
            disabled={!next}
            className="w-full text-xs px-2 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {next ? `Next empty page → ${next}` : 'No more empty pages after this'}
          </button>
        </div>
      )}
    </div>
  );
}
