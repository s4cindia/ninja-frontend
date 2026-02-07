import { useMemo, useRef, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
import type { CrossReference } from '@/types/stylesheet-detection.types';

interface DocumentTextViewerProps {
  text: string | undefined;
  isLoading: boolean;
  crossReference?: CrossReference | null;
  highlightedCitation?: number | null;
}

interface HighlightedSegment {
  text: string;
  isHighlight: boolean;
  citationNumber: number | null;
  isOrphaned: boolean;
}

const CITATION_PATTERN = /\[(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+)*)\]/g;

function getOrphanedNumbers(crossReference?: CrossReference | null): Set<number> {
  if (!crossReference?.citationsWithoutReference) return new Set();
  return new Set(crossReference.citationsWithoutReference.map((c) => c.number));
}

function parseCitationNumbers(match: string): number[] {
  const inner = match.slice(1, -1);
  const nums: number[] = [];
  for (const part of inner.split(',')) {
    const trimmed = part.trim();
    const rangeParts = trimmed.split(/[-–]/);
    if (rangeParts.length === 2) {
      const start = parseInt(rangeParts[0].trim(), 10);
      const end = parseInt(rangeParts[1].trim(), 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) nums.push(i);
      }
    } else {
      const n = parseInt(trimmed, 10);
      if (!isNaN(n)) nums.push(n);
    }
  }
  return nums;
}

function highlightLine(line: string, orphanedSet: Set<number>): HighlightedSegment[] {
  const segments: HighlightedSegment[] = [];
  let lastIndex = 0;

  const regex = new RegExp(CITATION_PATTERN.source, 'g');
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        text: line.slice(lastIndex, match.index),
        isHighlight: false,
        citationNumber: null,
        isOrphaned: false,
      });
    }

    const nums = parseCitationNumbers(match[0]);
    const anyOrphaned = nums.some((n) => orphanedSet.has(n));

    segments.push({
      text: match[0],
      isHighlight: true,
      citationNumber: nums[0] ?? null,
      isOrphaned: anyOrphaned,
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({
      text: line.slice(lastIndex),
      isHighlight: false,
      citationNumber: null,
      isOrphaned: false,
    });
  }

  return segments;
}

function escapeHtml(str: string): string {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function DocumentTextViewer({
  text,
  isLoading,
  crossReference,
  highlightedCitation,
}: DocumentTextViewerProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const orphanedSet = useMemo(() => getOrphanedNumbers(crossReference), [crossReference]);

  const lines = useMemo(() => {
    if (!text) return [];
    return text.split('\n');
  }, [text]);

  useEffect(() => {
    if (highlightedCitation == null || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-citation="${highlightedCitation}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400" role="status">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading document text...</p>
        </div>
      </div>
    );
  }

  if (!text) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-900 text-gray-400">
        <div className="text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="text-sm">Document text not available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="h-full overflow-auto bg-gray-900 font-mono text-sm"
      role="document"
      aria-label="Document source text with highlighted citations"
    >
      <div className="min-w-0">
        {lines.map((line, idx) => {
          const lineNum = idx + 1;
          const segments = highlightLine(line, orphanedSet);

          return (
            <div key={idx} className="flex hover:bg-gray-800/50 group">
              <span
                className="flex-shrink-0 w-12 text-right pr-3 py-0.5 text-gray-600 select-none border-r border-gray-700 text-xs leading-5"
                aria-hidden="true"
              >
                {lineNum}
              </span>
              <pre className="flex-1 pl-4 py-0.5 text-gray-300 whitespace-pre-wrap break-words leading-5 text-xs">
                {segments.map((seg, si) => {
                  if (!seg.isHighlight) {
                    return <span key={si}>{escapeHtml(seg.text)}</span>;
                  }

                  const isActive = highlightedCitation != null && seg.citationNumber === highlightedCitation;

                  return (
                    <span
                      key={si}
                      data-citation={seg.citationNumber}
                      className={`
                        rounded px-0.5 font-semibold cursor-default
                        ${seg.isOrphaned
                          ? 'bg-red-500/30 text-red-300 border border-red-500/50'
                          : 'bg-green-500/30 text-green-300 border border-green-500/50'
                        }
                        ${isActive ? 'ring-2 ring-yellow-400' : ''}
                      `}
                      title={
                        seg.isOrphaned
                          ? `Orphaned citation ${seg.text} — no matching reference`
                          : `Matched citation ${seg.text}`
                      }
                    >
                      {escapeHtml(seg.text)}
                    </span>
                  );
                })}
              </pre>
            </div>
          );
        })}
      </div>
    </div>
  );
}
