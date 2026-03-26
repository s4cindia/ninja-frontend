import { useRef, useCallback, useState, useEffect, useMemo, memo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import ZoneOverlay from './ZoneOverlay';
import type { CalibrationZone } from '@/services/zone-correction.service';

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

interface ZonePdfPanelProps {
  pdfUrl: string | undefined;
  page: number;
  zones: CalibrationZone[];
  source: 'docling' | 'pdfxt';
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  scrollTop: number;
  onScroll: (scrollTop: number) => void;
  onDocumentLoad?: (numPages: number) => void;
  label: string;
  zoneNumberMap?: Map<string, number>;
}

const FALLBACK_WIDTH = 600;

const PDF_LOADING = (
  <div className="flex items-center justify-center h-96 text-gray-400">
    Loading PDF...
  </div>
);

const PDF_ERROR = (
  <div className="flex items-center justify-center h-96 text-red-400">
    Failed to load PDF. Check console for details.
  </div>
);

function ZonePdfPanelInner({
  pdfUrl,
  page,
  zones,
  source,
  selectedZoneId,
  onZoneClick,
  scrollTop,
  onScroll,
  onDocumentLoad,
  label,
  zoneNumberMap,
}: ZonePdfPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isExternalScroll = useRef(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [dims, setDims] = useState({ pageHeight: 0, pdfWidth: 595, pdfHeight: 842 });

  // Measure container width with ResizeObserver — only update on meaningful changes
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.round(entry.contentRect.width);
        if (w > 0) {
          setContainerWidth((prev) => (Math.abs(prev - w) > 2 ? w : prev));
        }
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // PDF renders at container width minus padding, with fallback
  const renderWidth = containerWidth > 0 ? containerWidth - 16 : FALLBACK_WIDTH;

  // Sync scroll position from the other panel
  const prevScrollTop = useRef(scrollTop);
  if (scrollRef.current && scrollTop !== prevScrollTop.current) {
    isExternalScroll.current = true;
    scrollRef.current.scrollTop = scrollTop;
    prevScrollTop.current = scrollTop;
  }

  const handleScroll = useCallback(() => {
    if (isExternalScroll.current) {
      isExternalScroll.current = false;
      return;
    }
    if (scrollRef.current) {
      onScroll(scrollRef.current.scrollTop);
    }
  }, [onScroll]);

  const handlePageLoad = useCallback(
    (pageObj: { width: number; height: number; originalWidth: number; originalHeight: number }) => {
      const scale = renderWidth / pageObj.originalWidth;
      setDims({
        pdfWidth: pageObj.originalWidth,
        pdfHeight: pageObj.originalHeight,
        pageHeight: pageObj.originalHeight * scale,
      });
    },
    [renderWidth],
  );

  const scaleX = renderWidth / dims.pdfWidth;
  const scaleY = dims.pageHeight / dims.pdfHeight;

  const pageZones = useMemo(
    () => zones.filter((z) => z.pageNumber === page),
    [zones, page],
  );

  const fileObj = useMemo(() => (pdfUrl ? { url: pdfUrl } : undefined), [pdfUrl]);

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 last:border-r-0">
      {/* Panel header */}
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wide shrink-0">
        {label}
      </div>

      {/* Scrollable PDF area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-100"
        onScroll={handleScroll}
      >
        {pdfUrl ? (
          <div className="flex justify-center p-2">
            <div className="relative" style={{ width: renderWidth }}>
              <Document
                key={pdfUrl}
                file={fileObj}
                onLoadSuccess={(pdf) => onDocumentLoad?.(pdf.numPages)}
                onLoadError={(err) => console.error(`[ZonePdfPanel] PDF load error for ${label}:`, err)}
                loading={PDF_LOADING}
                error={PDF_ERROR}
              >
                <Page
                  pageNumber={page}
                  width={renderWidth}
                  onLoadSuccess={handlePageLoad}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Zone overlay */}
              {dims.pageHeight > 0 && (
                <ZoneOverlay
                  zones={pageZones}
                  pageNumber={page}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  selectedZoneId={selectedZoneId}
                  onZoneClick={onZoneClick}
                  source={source}
                  zoneNumberMap={zoneNumberMap}
                />
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 text-gray-400">
            No PDF available
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(ZonePdfPanelInner);
