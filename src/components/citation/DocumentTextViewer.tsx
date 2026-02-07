import { useMemo, useRef, useEffect, useState } from 'react';
import { Loader2, FileText, Upload } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/Button';
import type { CrossReference } from '@/types/stylesheet-detection.types';

interface DocumentTextViewerProps {
  fullHtml?: string | null;
  fullText?: string;
  isLoading: boolean;
  crossReference?: CrossReference | null;
  highlightedCitation?: number | null;
  onRegenerateHtml?: () => void;
  isRegenerating?: boolean;
}

const CITATION_PATTERN = /\[(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+)*)\]/g;

const ALLOWED_TAGS = [
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'p', 'br', 'hr',
  'strong', 'b', 'em', 'i', 'u', 's', 'del', 'ins', 'sup', 'sub', 'span',
  'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
  'blockquote', 'pre', 'code',
  'a', 'img',
  'figure', 'figcaption',
];

const ALLOWED_ATTR = [
  'href', 'src', 'alt', 'title', 'class', 'id',
  'colspan', 'rowspan', 'scope',
  'width', 'height', 'style',
];

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

function highlightCitationsInHtml(htmlString: string, orphanedSet: Set<number>): string {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return htmlString;
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  const walker = document.createTreeWalker(
    doc.body,
    NodeFilter.SHOW_TEXT,
    null
  );

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach((node) => {
    const text = node.textContent || '';
    if (!/\[\d{1,4}\]/.test(text)) return;

    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const regex = /\[(\d{1,4}(?:\s*[-–]\s*\d{1,4})?(?:\s*,\s*\d{1,4})*)\]/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        fragment.appendChild(
          document.createTextNode(text.slice(lastIndex, match.index))
        );
      }

      const nums = parseCitationNumbers(match[0]);
      const anyOrphaned = nums.some((n) => orphanedSet.has(n));
      const span = document.createElement('span');
      span.className = anyOrphaned ? 'citation-issue' : 'citation-matched';
      span.dataset.citation = String(nums[0] ?? 0);
      span.textContent = match[0];
      fragment.appendChild(span);

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    node.parentNode?.replaceChild(fragment, node);
  });

  return doc.body.innerHTML;
}

interface PlainTextSegment {
  text: string;
  isHighlight: boolean;
  citationNumber: number | null;
  isOrphaned: boolean;
}

function highlightPlainTextLine(line: string, orphanedSet: Set<number>): PlainTextSegment[] {
  const segments: PlainTextSegment[] = [];
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

function escapeText(str: string): string {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

export function DocumentTextViewer({
  fullHtml,
  fullText,
  isLoading,
  crossReference,
  highlightedCitation,
  onRegenerateHtml,
  isRegenerating,
}: DocumentTextViewerProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [useHtmlMode] = useState(true);

  const orphanedSet = useMemo(() => getOrphanedNumbers(crossReference), [crossReference]);

  const sanitizedHtml = useMemo(() => {
    if (!fullHtml) return null;
    return DOMPurify.sanitize(fullHtml, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: true,
    });
  }, [fullHtml]);

  const highlightedHtml = useMemo(() => {
    if (!sanitizedHtml) return null;
    return highlightCitationsInHtml(sanitizedHtml, orphanedSet);
  }, [sanitizedHtml, orphanedSet]);

  const plainTextLines = useMemo(() => {
    if (!fullText) return [];
    return fullText.split('\n');
  }, [fullText]);

  useEffect(() => {
    if (highlightedCitation == null || !scrollRef.current) return;
    const el = scrollRef.current.querySelector(
      `[data-citation="${highlightedCitation}"]`
    );
    if (el) {
      scrollRef.current.querySelectorAll('.citation-active').forEach((e) =>
        e.classList.remove('citation-active')
      );
      el.classList.add('citation-active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-400" role="status">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!fullHtml && !fullText) {
    return (
      <div className="flex items-center justify-center h-full bg-white text-gray-400">
        <div className="text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
          <p className="text-sm font-medium text-gray-600 mb-1">Document text not available</p>
          <p className="text-xs text-gray-400">The document content could not be loaded.</p>
        </div>
      </div>
    );
  }

  if (fullHtml && useHtmlMode && highlightedHtml) {
    return (
      <div
        ref={scrollRef}
        className="h-full overflow-auto bg-white"
        role="document"
        aria-label="Document source with highlighted citations"
      >
        <div
          className="document-panel px-10 py-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      </div>
    );
  }

  if (!fullHtml && fullText && onRegenerateHtml) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3">
          <Upload className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-amber-700 flex-1">
            This document was uploaded before styled HTML support. Re-upload the DOCX file to see formatted text.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={onRegenerateHtml}
            disabled={isRegenerating}
          >
            {isRegenerating ? 'Processing...' : 'Re-upload DOCX'}
          </Button>
        </div>
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <PlainTextView
            lines={plainTextLines}
            orphanedSet={orphanedSet}
            highlightedCitation={highlightedCitation}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-auto bg-white">
      <PlainTextView
        lines={plainTextLines}
        orphanedSet={orphanedSet}
        highlightedCitation={highlightedCitation}
      />
    </div>
  );
}

interface PlainTextViewProps {
  lines: string[];
  orphanedSet: Set<number>;
  highlightedCitation?: number | null;
}

function PlainTextView({ lines, orphanedSet, highlightedCitation }: PlainTextViewProps): JSX.Element {
  return (
    <div className="font-mono text-sm bg-gray-900 min-h-full">
      {lines.map((line, idx) => {
        const lineNum = idx + 1;
        const segments = highlightPlainTextLine(line, orphanedSet);

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
                  return <span key={si}>{escapeText(seg.text)}</span>;
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
                    {escapeText(seg.text)}
                  </span>
                );
              })}
            </pre>
          </div>
        );
      })}
    </div>
  );
}
