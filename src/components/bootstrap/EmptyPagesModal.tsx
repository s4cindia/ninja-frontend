import { X } from 'lucide-react';

interface EmptyPagesModalProps {
  filename: string;
  pageCount: number;
  emptyPages: number[];
  onClose: () => void;
}

function formatPageRanges(pages: number[]): string {
  if (pages.length === 0) return '';
  const ranges: string[] = [];
  let start = pages[0];
  let prev = pages[0];
  for (let i = 1; i <= pages.length; i++) {
    const curr = pages[i];
    if (curr !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = curr;
    }
    prev = curr;
  }
  return ranges.join(', ');
}

export function EmptyPagesModal({ filename, pageCount, emptyPages, onClose }: EmptyPagesModalProps) {
  const pct = pageCount > 0 ? ((emptyPages.length / pageCount) * 100).toFixed(1) : '0';
  const ranges = formatPageRanges(emptyPages);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="empty-pages-title"
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 id="empty-pages-title" className="text-lg font-semibold text-gray-900">
              Empty Pages
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 truncate max-w-md" title={filename}>
              {filename}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">{emptyPages.length}</span> of{' '}
            <span className="font-semibold">{pageCount}</span> pages have no detected zones
            <span className="text-gray-500"> ({pct}%)</span>
          </p>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {emptyPages.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No empty pages — every page has at least one detected zone.</p>
          ) : (
            <>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Page numbers
              </p>
              <p className="text-sm font-mono text-gray-800 leading-relaxed break-words">
                {ranges}
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm font-medium rounded bg-gray-200 text-gray-700 hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
