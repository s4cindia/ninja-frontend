import { useState, useEffect, useRef } from 'react';
import { Copy, Check, X, Info } from 'lucide-react';

interface CitationTooltipProps {
  citationNumber: number;
  referenceText: string;
  confidence?: number;
  citationType?: string;
  validationStatus?: 'valid' | 'invalid' | 'unmatched';
  anchorElement: Element | null;
  onClose: () => void;
  visible: boolean;
}

/**
 * Enhanced Citation Tooltip Component
 * Shows citation metadata with copy functionality and better UX
 */
export function CitationTooltip({
  citationNumber,
  referenceText,
  confidence,
  citationType,
  validationStatus,
  anchorElement,
  onClose,
  visible,
}: CitationTooltipProps): JSX.Element | null {
  const [copied, setCopied] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Calculate tooltip position
  useEffect(() => {
    if (!visible || !anchorElement || !tooltipRef.current) return;

    const rect = anchorElement.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 12;

    let left = rect.left;
    let top = rect.bottom + 8;

    // Adjust horizontal position if tooltip would overflow
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding;
    }
    if (left < padding) {
      left = padding;
    }

    // Flip tooltip above element if not enough space below
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = rect.top - tooltipRect.height - 8;
    }

    setPosition({ top, left });
  }, [visible, anchorElement]);

  // Copy to clipboard
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(referenceText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy citation:', error);
    }
  };

  // Close on Escape key
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, onClose]);

  if (!visible) return null;

  const statusColors = {
    valid: 'text-green-600 bg-green-100',
    invalid: 'text-red-600 bg-red-100',
    unmatched: 'text-amber-600 bg-amber-100',
  };

  const statusLabels = {
    valid: 'Valid',
    invalid: 'Invalid',
    unmatched: 'Unmatched',
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[1001] max-w-[480px] bg-gradient-to-br from-slate-800 to-slate-900 text-slate-100 rounded-lg shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-200"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      role="tooltip"
      aria-label={`Citation ${citationNumber} reference`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-4 pt-3 pb-2 border-b border-slate-700">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Info className="h-4 w-4 text-blue-400 flex-shrink-0" aria-hidden="true" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-300">Citation #{citationNumber}</p>
            {citationType && (
              <p className="text-xs text-slate-400 capitalize">
                {citationType.toLowerCase().replace('_', ' ')}
              </p>
            )}
          </div>
        </div>

        {/* Validation Status Badge */}
        {validationStatus && (
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[validationStatus]}`}
          >
            {statusLabels[validationStatus]}
          </span>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700"
          aria-label="Close tooltip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Reference Text */}
      <div className="px-4 py-3">
        <p className="text-sm leading-relaxed text-slate-100">
          {referenceText || 'No reference text available'}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/50 rounded-b-lg border-t border-slate-700">
        {/* Confidence Score */}
        {confidence != null && (
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400">Confidence:</span>
            <span
              className={`font-semibold ${
                confidence >= 80
                  ? 'text-green-400'
                  : confidence >= 50
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {Math.round(confidence)}%
            </span>
          </div>
        )}

        {/* Copy Button */}
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          aria-label="Copy citation reference"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy
            </>
          )}
        </button>
      </div>
    </div>
  );
}
