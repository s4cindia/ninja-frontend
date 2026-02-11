import { useMemo, useRef, useEffect, useCallback } from 'react';
import { FileText, Upload } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/Button';
import { SkeletonDocument } from '@/components/ui/Skeleton';

interface DocumentTextViewerProps {
  highlightedHtml?: string | null;
  fullHtml?: string | null;
  fullText?: string;
  isLoading: boolean;
  highlightedCitation?: number | null;
  onRegenerateHtml?: () => void;
  isRegenerating?: boolean;
  referenceLookup?: Record<string, string | null>;
  onCitationClick?: (citationNumber: number) => void;
}

const ALLOWED_TAGS = [
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'p',
  'br',
  'hr',
  'strong',
  'b',
  'em',
  'i',
  'u',
  's',
  'del',
  'ins',
  'sup',
  'sub',
  'span',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tfoot',
  'tr',
  'th',
  'td',
  'caption',
  'blockquote',
  'pre',
  'code',
  'a',
  'img',
  'figure',
  'figcaption',
  'style',
];

const ALLOWED_ATTR = [
  'href',
  'src',
  'alt',
  'title',
  'class',
  'id',
  'colspan',
  'rowspan',
  'scope',
  'width',
  'height',
  'style',
  'data-cit-nums',
  'data-ref-text',
  'data-citation',
];

const CITATION_PATTERN = /\[(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+)*)\]/g;

function showTooltip(anchorEl: Element, text: string) {
  if (typeof document === 'undefined') return;
  let tooltip = document.getElementById('citation-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'citation-tooltip';
    tooltip.className = 'citation-tooltip';
    document.body.appendChild(tooltip);
  }

  tooltip.textContent = text;
  const rect = anchorEl.getBoundingClientRect();

  // Smart positioning to avoid screen edges
  const tooltipWidth = 480; // Match CSS max-width
  const tooltipHeight = 60; // Approximate height
  const padding = 12;

  let left = rect.left;
  let top = rect.bottom + 8; // Space for arrow

  // Adjust horizontal position if tooltip would overflow
  if (left + tooltipWidth > window.innerWidth - padding) {
    left = window.innerWidth - tooltipWidth - padding;
  }
  if (left < padding) {
    left = padding;
  }

  // Flip tooltip above element if not enough space below
  if (top + tooltipHeight > window.innerHeight - padding) {
    top = rect.top - tooltipHeight - 8;
    tooltip.classList.add('tooltip-above');
  } else {
    tooltip.classList.remove('tooltip-above');
  }

  tooltip.style.left = `${left}px`;
  tooltip.style.top = `${top}px`;

  // Trigger display with slight delay for smooth animation
  requestAnimationFrame(() => {
    tooltip!.style.display = 'block';
  });
}

function hideTooltip() {
  if (typeof document === 'undefined') return;
  const tooltip = document.getElementById('citation-tooltip');
  if (tooltip) {
    // Allow fade-out transition before hiding
    tooltip.style.opacity = '0';
    setTimeout(() => {
      tooltip.style.display = 'none';
      tooltip.style.opacity = '';
    }, 200); // Match CSS transition duration
  }
}

function escapeText(str: string): string {
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

function decodeHtmlEntities(html: string): string {
  if (!html.includes('&lt;') && !html.includes('&gt;') && !html.includes('&amp;')) {
    return html;
  }
  const textarea = document.createElement('textarea');
  textarea.innerHTML = html;
  return textarea.value;
}

function findCitationElement(container: HTMLElement, citNum: number): Element | null {
  const legacy = container.querySelector(`[data-citation="${citNum}"]`);
  if (legacy) return legacy;
  const allCitEls = container.querySelectorAll('[data-cit-nums]');
  for (const el of allCitEls) {
    const nums = el.getAttribute('data-cit-nums');
    if (!nums) continue;
    const parsed = nums
      .split(/[\s,]+/)
      .map(s => s.trim())
      .filter(Boolean);
    if (parsed.includes(String(citNum))) return el;
  }
  return null;
}

export function DocumentTextViewer({
  highlightedHtml,
  fullHtml,
  fullText,
  isLoading,
  highlightedCitation,
  onRegenerateHtml,
  isRegenerating,
  referenceLookup,
  onCitationClick,
}: DocumentTextViewerProps): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);

  const sanitizedHtml = useMemo(() => {
    let rawHtml = highlightedHtml || fullHtml;
    if (!rawHtml && fullText && /<[a-z][\s\S]*?>/i.test(fullText)) {
      rawHtml = fullText;
    }
    if (!rawHtml) return null;
    const decoded = decodeHtmlEntities(rawHtml);
    return DOMPurify.sanitize(decoded, {
      ALLOWED_TAGS,
      ALLOWED_ATTR,
      ALLOW_DATA_ATTR: true,
    });
  }, [highlightedHtml, fullHtml, fullText]);

  const plainTextLines = useMemo(() => {
    if (!fullText) return [];
    return fullText.split('\n');
  }, [fullText]);

  useEffect(() => {
    if (highlightedCitation == null || !scrollRef.current) return;
    scrollRef.current
      .querySelectorAll('.citation-active')
      .forEach(e => e.classList.remove('citation-active'));
    const el = findCitationElement(scrollRef.current, highlightedCitation);
    if (el) {
      el.classList.add('citation-active');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedCitation]);

  const setupInteractions = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return;

      const handleMouseEnter = (e: Event) => {
        const target = e.target as HTMLElement;
        const refText = target.getAttribute('data-ref-text');
        if (refText) {
          showTooltip(target, refText);
          return;
        }
        const citNum = target.dataset?.citation;
        if (citNum && referenceLookup) {
          const ref = referenceLookup[citNum];
          showTooltip(target, ref || 'No matching reference found');
        }
      };

      const handleMouseLeave = () => {
        hideTooltip();
      };

      const handleClick = (e: Event) => {
        const target = e.target as HTMLElement;
        if (!onCitationClick) return;
        const citNums = target.getAttribute('data-cit-nums');
        if (citNums) {
          const firstNum = parseInt(citNums.split(',')[0].trim(), 10);
          if (!isNaN(firstNum)) onCitationClick(firstNum);
          return;
        }
        const citNum = target.dataset?.citation;
        if (citNum) {
          onCitationClick(parseInt(citNum, 10));
        }
      };

      const citationEls = container.querySelectorAll('.cit-hl, [data-citation]');
      citationEls.forEach(el => {
        el.addEventListener('mouseenter', handleMouseEnter);
        el.addEventListener('mouseleave', handleMouseLeave);
        el.addEventListener('click', handleClick);
      });

      return () => {
        citationEls.forEach(el => {
          el.removeEventListener('mouseenter', handleMouseEnter);
          el.removeEventListener('mouseleave', handleMouseLeave);
          el.removeEventListener('click', handleClick);
        });
      };
    },
    [referenceLookup, onCitationClick]
  );

  useEffect(() => {
    return setupInteractions(scrollRef.current);
  }, [setupInteractions, sanitizedHtml]);

  if (isLoading) {
    return (
      <div className="h-full overflow-auto bg-white" role="status" aria-label="Loading document">
        <SkeletonDocument />
      </div>
    );
  }

  if (!sanitizedHtml && !fullText) {
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

  if (sanitizedHtml) {
    return (
      <div
        ref={scrollRef}
        className="h-full overflow-auto bg-white"
        role="document"
        aria-label="Document source with highlighted citations"
      >
        <div
          className="document-panel px-10 py-8 max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
        />
      </div>
    );
  }

  if (!fullHtml && !highlightedHtml && fullText && onRegenerateHtml) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-3">
          <Upload className="h-4 w-4 text-amber-600 flex-shrink-0" aria-hidden="true" />
          <p className="text-xs text-amber-700 flex-1">
            This document was uploaded before styled HTML support. Re-upload the DOCX file to see
            formatted text.
          </p>
          <Button size="sm" variant="outline" onClick={onRegenerateHtml} disabled={isRegenerating}>
            {isRegenerating ? 'Processing...' : 'Re-upload DOCX'}
          </Button>
        </div>
        <div className="flex-1 overflow-auto" ref={scrollRef}>
          <PlainTextView
            lines={plainTextLines}
            highlightedCitation={highlightedCitation}
            referenceLookup={referenceLookup}
            onCitationClick={onCitationClick}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="h-full overflow-auto bg-white">
      <PlainTextView
        lines={plainTextLines}
        highlightedCitation={highlightedCitation}
        referenceLookup={referenceLookup}
        onCitationClick={onCitationClick}
      />
    </div>
  );
}

interface PlainTextViewProps {
  lines: string[];
  highlightedCitation?: number | null;
  referenceLookup?: Record<string, string | null>;
  onCitationClick?: (citationNumber: number) => void;
}

interface PlainTextSegment {
  text: string;
  isHighlight: boolean;
  citationNumber: number | null;
}

function parsePlainTextSegments(line: string): PlainTextSegment[] {
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
      });
    }
    const num = parseInt(match[1], 10);
    segments.push({ text: match[0], isHighlight: true, citationNumber: isNaN(num) ? null : num });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < line.length) {
    segments.push({ text: line.slice(lastIndex), isHighlight: false, citationNumber: null });
  }

  return segments;
}

function PlainTextView({
  lines,
  highlightedCitation,
  referenceLookup,
  onCitationClick,
}: PlainTextViewProps): JSX.Element {
  const handleCitationHover = useCallback(
    (e: React.MouseEvent, citNum: number | null) => {
      if (citNum == null || !referenceLookup) return;
      const refText = referenceLookup[String(citNum)];
      showTooltip(e.currentTarget, refText || 'No matching reference found');
    },
    [referenceLookup]
  );

  return (
    <div className="font-mono text-sm bg-gray-900 min-h-full">
      {lines.map((line, idx) => {
        const lineNum = idx + 1;
        const segments = parsePlainTextSegments(line);

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

                const isActive =
                  highlightedCitation != null && seg.citationNumber === highlightedCitation;

                return (
                  <span
                    key={si}
                    data-citation={seg.citationNumber}
                    className={`
                      rounded px-0.5 font-semibold cursor-pointer
                      bg-green-500/30 text-green-300 border border-green-500/50
                      ${isActive ? 'ring-2 ring-yellow-400' : ''}
                    `}
                    title={`Citation ${seg.text}`}
                    onMouseEnter={e => handleCitationHover(e, seg.citationNumber)}
                    onMouseLeave={hideTooltip}
                    onClick={() =>
                      seg.citationNumber != null && onCitationClick?.(seg.citationNumber)
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
