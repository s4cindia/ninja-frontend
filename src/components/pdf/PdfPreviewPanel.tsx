/**
 * PdfPreviewPanel Component
 *
 * Displays PDF preview with issue highlighting overlays.
 *
 * NOTE: This component requires react-pdf to be installed:
 * npm install react-pdf pdfjs-dist
 *
 * Then uncomment the react-pdf imports and PDF rendering code below.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import type { PdfAuditIssue } from '@/types/pdf.types';

// TODO: Uncomment when react-pdf is installed
// import { Document, Page, pdfjs } from 'react-pdf';
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';

// TODO: Uncomment when react-pdf is installed
// Use local worker for better compatibility and to avoid CDN/CSP issues
// pdfjs.GlobalWorkerOptions.workerSrc = new URL(
//   'pdfjs-dist/build/pdf.worker.min.js',
//   import.meta.url
// ).toString();

export interface PdfPreviewPanelProps {
  pdfUrl: string;
  currentPage: number;
  issues: PdfAuditIssue[];
  selectedIssueId?: string;
  onPageChange: (page: number) => void;
  onIssueSelect: (issue: PdfAuditIssue) => void;
  className?: string;
}

type ZoomLevel = 'fit-width' | 'fit-page' | 50 | 75 | 100 | 125 | 150 | 200;

const ZOOM_LEVELS: ZoomLevel[] = [50, 75, 100, 125, 150, 200];

const SEVERITY_COLORS = {
  critical: 'rgba(239, 68, 68, 0.3)',    // red-500
  serious: 'rgba(249, 115, 22, 0.3)',    // orange-500
  moderate: 'rgba(234, 179, 8, 0.3)',    // yellow-500
  minor: 'rgba(59, 130, 246, 0.3)',      // blue-500
};

const SEVERITY_BORDER_COLORS = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
};

interface IssueHighlight {
  issue: PdfAuditIssue;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parse issue location to extract coordinates
 * Format examples:
 * - "Page 5, x:100 y:200 w:300 h:50"
 * - "x:100, y:200, width:300, height:50"
 */
function parseIssueLocation(_issue: PdfAuditIssue): IssueHighlight | null {
  // This is a placeholder - actual implementation would parse
  // _issue.elementPath or a dedicated location field
  // For now, return null if no valid location data
  // TODO: Implement coordinate parsing when backend provides location data
  return null;
}

const IssueOverlay: React.FC<{
  highlight: IssueHighlight;
  isSelected: boolean;
  onClick: () => void;
  index: number;
}> = ({ highlight, isSelected, onClick, index }) => {
  const severity = highlight.issue.severity as keyof typeof SEVERITY_COLORS;

  return (
    <div
      className={cn(
        'absolute cursor-pointer transition-all',
        isSelected && 'animate-pulse'
      )}
      style={{
        left: `${highlight.x}px`,
        top: `${highlight.y}px`,
        width: `${highlight.width}px`,
        height: `${highlight.height}px`,
        backgroundColor: SEVERITY_COLORS[severity],
        border: `2px solid ${SEVERITY_BORDER_COLORS[severity]}`,
        zIndex: isSelected ? 20 : 10,
      }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      aria-label={`Issue ${index + 1}: ${highlight.issue.message}`}
    >
      {/* Issue number badge */}
      <div
        className={cn(
          'absolute -top-2 -left-2 w-6 h-6 rounded-full flex items-center justify-center',
          'text-white text-xs font-bold shadow-md'
        )}
        style={{
          backgroundColor: SEVERITY_BORDER_COLORS[severity],
        }}
      >
        {index + 1}
      </div>
    </div>
  );
};

export const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({
  pdfUrl: _pdfUrl, // TODO: Use when react-pdf is installed
  currentPage,
  issues,
  selectedIssueId,
  onPageChange,
  onIssueSelect,
  className,
}) => {
  const [numPages, _setNumPages] = useState<number | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [showHighlights, setShowHighlights] = useState(true);
  const [isLoading, _setIsLoading] = useState(true); // eslint-disable-line @typescript-eslint/no-unused-vars
  const [error, _setError] = useState<string | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  // Filter issues for current page and create highlights
  const currentPageIssues = useMemo(() => {
    return issues.filter((issue) => issue.pageNumber === currentPage);
  }, [issues, currentPage]);

  const highlights = useMemo(() => {
    return currentPageIssues
      .map((issue) => parseIssueLocation(issue))
      .filter((h): h is IssueHighlight => h !== null);
  }, [currentPageIssues]);

  // TODO: Uncomment when react-pdf is installed
  // const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
  //   _setNumPages(numPages);
  //   _setIsLoading(false);
  //   _setError(null);
  // }, []);

  // TODO: Uncomment when react-pdf is installed
  // const handleDocumentLoadError = useCallback((error: Error) => {
  //   _setError(error.message || 'Failed to load PDF');
  //   _setIsLoading(false);
  // }, []);

  const handleZoomIn = useCallback(() => {
    if (typeof zoomLevel === 'number') {
      const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
      if (currentIndex < ZOOM_LEVELS.length - 1) {
        setZoomLevel(ZOOM_LEVELS[currentIndex + 1]);
      }
    }
  }, [zoomLevel]);

  const handleZoomOut = useCallback(() => {
    if (typeof zoomLevel === 'number') {
      const currentIndex = ZOOM_LEVELS.indexOf(zoomLevel);
      if (currentIndex > 0) {
        setZoomLevel(ZOOM_LEVELS[currentIndex - 1]);
      }
    }
  }, [zoomLevel]);

  const handlePrevPage = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNextPage = useCallback(() => {
    // Allow navigation even if numPages not loaded yet (for testing)
    if (!numPages || currentPage < numPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, numPages, onPageChange]);

  const handlePageInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const page = parseInt(e.target.value, 10);
      // Allow page change if valid number and within bounds (or bounds not known yet)
      if (!isNaN(page) && page >= 1 && (!numPages || page <= numPages)) {
        onPageChange(page);
      }
    },
    [numPages, onPageChange]
  );

  const canZoomIn = typeof zoomLevel === 'number' && zoomLevel < 200;
  const canZoomOut = typeof zoomLevel === 'number' && zoomLevel > 50;

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 bg-white border-b border-gray-200">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomOut}
            disabled={!canZoomOut}
            aria-label="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>

          <select
            value={zoomLevel}
            onChange={(e) => setZoomLevel(e.target.value as ZoomLevel)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Zoom level"
          >
            <option value="fit-width">Fit Width</option>
            <option value="fit-page">Fit Page</option>
            {ZOOM_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}%
              </option>
            ))}
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={handleZoomIn}
            disabled={!canZoomIn}
            aria-label="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel('fit-page')}
            aria-label="Fit to page"
          >
            <Maximize className="h-4 w-4" />
          </Button>
        </div>

        {/* Page navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              min={1}
              max={numPages || 1}
              value={currentPage}
              onChange={handlePageInputChange}
              className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-label="Current page"
            />
            <span className="text-gray-600">/ {numPages || '?'}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={numPages !== null && currentPage >= numPages}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Highlight toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant={showHighlights ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowHighlights(!showHighlights)}
            aria-label={showHighlights ? 'Hide issue highlights' : 'Show issue highlights'}
          >
            {showHighlights ? (
              <>
                <Eye className="h-4 w-4 mr-1" />
                <span className="text-sm">Issues ({currentPageIssues.length})</span>
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4 mr-1" />
                <span className="text-sm">Show Issues</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* PDF viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-4">
        <div className="flex justify-center">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
              <p className="text-gray-600">Loading PDF...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
              <p className="text-red-600 font-medium mb-2">Failed to load PDF</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!isLoading && !error && (
            <div className="relative bg-white shadow-lg p-8">
              {/* TODO: Uncomment when react-pdf is installed */}
              {/* <Document
                file={pdfUrl}
                onLoadSuccess={handleDocumentLoadSuccess}
                onLoadError={handleDocumentLoadError}
                loading={
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 text-primary-600 animate-spin mb-4" />
                    <p className="text-gray-600">Loading PDF...</p>
                  </div>
                }
              >
                <Page
                  pageNumber={currentPage}
                  scale={typeof zoomLevel === 'number' ? zoomLevel / 100 : 1}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                />
              </Document> */}

              {/* Placeholder until react-pdf is installed */}
              <div className="flex flex-col items-center justify-center py-20 bg-gray-100 rounded">
                <FileText className="h-16 w-16 text-gray-400 mb-4" />
                <p className="text-gray-600 font-medium mb-2">PDF Preview Not Available</p>
                <p className="text-sm text-gray-500">Install react-pdf to enable PDF viewing</p>
                <p className="text-xs text-gray-400 mt-2 font-mono">npm install react-pdf pdfjs-dist</p>
              </div>

              {/* Issue highlights overlay */}
              {showHighlights && highlights.length > 0 && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="relative w-full h-full pointer-events-auto">
                    {highlights.map((highlight, index) => (
                      <IssueOverlay
                        key={highlight.issue.id}
                        highlight={highlight}
                        isSelected={highlight.issue.id === selectedIssueId}
                        onClick={() => onIssueSelect(highlight.issue)}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Issue count indicator */}
      {currentPageIssues.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200 text-sm text-gray-600">
          {currentPageIssues.length} {currentPageIssues.length === 1 ? 'issue' : 'issues'} on this
          page
        </div>
      )}
    </div>
  );
};
