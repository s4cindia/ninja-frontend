import { useRef, useCallback, useState } from 'react';
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
}

const PDF_WIDTH = 800;

export default function ZonePdfPanel({
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
}: ZonePdfPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isExternalScroll = useRef(false);
  const [pageHeight, setPageHeight] = useState(0);
  const [pdfWidth, setPdfWidth] = useState(595);
  const [pdfHeight, setPdfHeight] = useState(842);

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
      setPdfWidth(pageObj.originalWidth);
      setPdfHeight(pageObj.originalHeight);
      const scale = PDF_WIDTH / pageObj.originalWidth;
      setPageHeight(pageObj.originalHeight * scale);
    },
    [],
  );

  const scaleX = PDF_WIDTH / pdfWidth;
  const scaleY = pageHeight / pdfHeight;

  const pageZones = zones.filter((z) => z.pageNumber === page);

  return (
    <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 last:border-r-0">
      {/* Panel header */}
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wide">
        {label}
      </div>

      {/* Scrollable PDF area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto bg-gray-100"
        onScroll={handleScroll}
      >
        {pdfUrl ? (
          <div className="flex justify-center p-2">
            <div className="relative" style={{ width: PDF_WIDTH }}>
              <Document
                key={pdfUrl}
                file={{ url: pdfUrl }}
                onLoadSuccess={(pdf) => onDocumentLoad?.(pdf.numPages)}
                loading={
                  <div className="flex items-center justify-center h-96 text-gray-400">
                    Loading PDF...
                  </div>
                }
              >
                <Page
                  pageNumber={page}
                  width={PDF_WIDTH}
                  onLoadSuccess={handlePageLoad}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>

              {/* Zone overlay */}
              {pageHeight > 0 && (
                <ZoneOverlay
                  zones={pageZones}
                  pageNumber={page}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  selectedZoneId={selectedZoneId}
                  onZoneClick={onZoneClick}
                  source={source}
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
