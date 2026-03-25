import { useEffect, useRef, useMemo, useState } from 'react';
import { Document, Page } from 'react-pdf';

interface PageThumbnailNavProps {
  pdfUrl: string;
  totalPages: number;
  currentPage: number;
  zoneCountByPage: Map<number, number>;
  onPageSelect: (page: number) => void;
}

// Render thumbnails in a window around the current page to avoid loading all pages at once
const WINDOW_SIZE = 10;

export function PageThumbnailNav({
  pdfUrl,
  totalPages,
  currentPage,
  zoneCountByPage,
  onPageSelect,
}: PageThumbnailNavProps) {
  const currentThumbRef = useRef<HTMLButtonElement>(null);
  const [docLoaded, setDocLoaded] = useState(false);
  const [docError, setDocError] = useState(false);

  useEffect(() => {
    currentThumbRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    });
  }, [currentPage]);

  // Reset state when URL changes
  useEffect(() => {
    setDocLoaded(false);
    setDocError(false);
  }, [pdfUrl]);

  const fileObj = useMemo(() => ({ url: pdfUrl }), [pdfUrl]);

  // Pages to actually render thumbnails for (window around current page)
  const windowStart = Math.max(1, currentPage - WINDOW_SIZE);
  const windowEnd = Math.min(totalPages, currentPage + WINDOW_SIZE);

  if (docError) {
    return (
      <div className="flex flex-col h-full overflow-y-auto border-r bg-gray-50 w-[160px] flex-shrink-0 p-2">
        <div className="text-xs text-red-400 text-center mt-4">
          Thumbnails unavailable
        </div>
        {/* Fall back to text-only page list */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const zoneCount = zoneCountByPage.get(pageNum) ?? 0;
            const isCurrent = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                ref={isCurrent ? currentThumbRef : undefined}
                onClick={() => onPageSelect(pageNum)}
                className={`relative flex flex-col items-center rounded-md p-1.5 transition-all hover:bg-blue-50 cursor-pointer ${
                  isCurrent
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="w-[64px] h-[40px] flex items-center justify-center bg-gray-100 rounded text-xs text-gray-400">
                  p.{pageNum}
                </div>
                {zoneCount > 0 && (
                  <span className="text-[10px] text-gray-500 mt-0.5">({zoneCount})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto border-r bg-gray-50 w-[160px] flex-shrink-0">
      <Document
        file={fileObj}
        loading={null}
        onLoadSuccess={() => setDocLoaded(true)}
        onLoadError={(err) => {
          console.error('[PageThumbnailNav] PDF load error:', err);
          setDocError(true);
        }}
        error={null}
      >
        <div className="grid grid-cols-2 gap-2 p-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
            const zoneCount = zoneCountByPage.get(pageNum) ?? 0;
            const isCurrent = pageNum === currentPage;
            const inWindow = docLoaded && pageNum >= windowStart && pageNum <= windowEnd;

            return (
              <button
                key={pageNum}
                ref={isCurrent ? currentThumbRef : undefined}
                onClick={() => onPageSelect(pageNum)}
                className={`relative flex flex-col items-center rounded-md p-1 transition-all hover:bg-blue-50 cursor-pointer ${
                  isCurrent
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'bg-white border border-gray-200'
                }`}
              >
                <div className="w-[64px] h-[84px] overflow-hidden flex items-center justify-center">
                  {inWindow ? (
                    <Page
                      pageNumber={pageNum}
                      width={64}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      loading={
                        <div className="w-[64px] h-[84px] bg-gray-100 animate-pulse rounded" />
                      }
                    />
                  ) : (
                    <div className="w-[64px] h-[84px] bg-gray-100 rounded flex items-center justify-center text-[10px] text-gray-400">
                      {pageNum}
                    </div>
                  )}
                </div>

                {zoneCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[10px] font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                    {zoneCount}
                  </span>
                )}

                <span
                  className={`text-[10px] mt-0.5 ${
                    isCurrent ? 'font-bold text-blue-700' : 'text-gray-500'
                  }`}
                >
                  {pageNum}
                </span>
              </button>
            );
          })}
        </div>
      </Document>
    </div>
  );
}
