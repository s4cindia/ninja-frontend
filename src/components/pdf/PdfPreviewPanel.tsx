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
  ImageIcon,
  Table2,
  Type,
  List,
  Sun,
  Link as LinkIcon,
  Bookmark,
  Globe,
  AlignLeft,
  Shield,
  FileInput,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '../ui/Button';
import type { PdfAuditIssue } from '@/types/pdf.types';

import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Use local worker served from public/ to avoid CDN/CSP issues
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';

export interface PdfPreviewPanelProps {
  pdfUrl: string;
  currentPage: number;
  issues: PdfAuditIssue[];
  selectedIssueId?: string;
  onPageChange: (page: number) => void;
  onIssueSelect: (issue: PdfAuditIssue) => void;
  issueNumberMap?: Map<string, number>;
  className?: string;
}

type ZoomLevel = 'fit-width' | 'fit-page' | 50 | 75 | 100 | 125 | 150 | 200;

const ZOOM_LEVELS: ZoomLevel[] = [50, 75, 100, 125, 150, 200];

const SEVERITY_BORDER_COLORS = {
  critical: '#ef4444',
  serious: '#f97316',
  moderate: '#eab308',
  minor: '#3b82f6',
};

// ─── Issue category mapping ───────────────────────────────────────────────────

interface RuleCategory {
  prefixes: string[];
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

const RULE_CATEGORIES: RuleCategory[] = [
  { prefixes: ['ALT-TEXT', 'MATTERHORN-ALT'], label: 'Alt Text',      icon: <ImageIcon size={11} />, color: 'text-orange-700', bgColor: 'bg-orange-100' },
  { prefixes: ['TABLE'],                       label: 'Tables',        icon: <Table2 size={11} />,    color: 'text-blue-700',   bgColor: 'bg-blue-100'   },
  { prefixes: ['HEADING'],                     label: 'Headings',      icon: <Type size={11} />,      color: 'text-purple-700', bgColor: 'bg-purple-100' },
  { prefixes: ['LIST'],                        label: 'Lists',         icon: <List size={11} />,      color: 'text-teal-700',   bgColor: 'bg-teal-100'   },
  { prefixes: ['CONTRAST', 'COLOR-CONTRAST'],  label: 'Contrast',      icon: <Sun size={11} />,       color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  { prefixes: ['LINK'],                        label: 'Links',         icon: <LinkIcon size={11} />,  color: 'text-cyan-700',   bgColor: 'bg-cyan-100'   },
  { prefixes: ['FORM', 'FIELD'],               label: 'Forms',         icon: <FileInput size={11} />, color: 'text-green-700',  bgColor: 'bg-green-100'  },
  { prefixes: ['BOOKMARK'],                    label: 'Bookmarks',     icon: <Bookmark size={11} />,  color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  { prefixes: ['LANGUAGE', 'PDF-NO-LANG'],     label: 'Language',      icon: <Globe size={11} />,     color: 'text-rose-700',   bgColor: 'bg-rose-100'   },
  { prefixes: ['READING'],                     label: 'Reading Order', icon: <AlignLeft size={11} />, color: 'text-gray-700',   bgColor: 'bg-gray-100'   },
  { prefixes: ['MATTERHORN', 'PDFUA', 'PDF-UA', 'PDF/UA'], label: 'PDF/UA', icon: <Shield size={11} />, color: 'text-red-700', bgColor: 'bg-red-100'  },
];

const OTHER_CATEGORY: Omit<RuleCategory, 'prefixes'> = {
  label: 'Other', icon: <AlertCircle size={11} />, color: 'text-gray-600', bgColor: 'bg-gray-100',
};

// p-8 padding on the PDF container — overlays must offset by this amount
const OVERLAY_PADDING_PX = 32;

function categorizePageIssues(issues: PdfAuditIssue[]) {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    const ruleId = (issue.ruleId || '').toUpperCase();
    const cat = RULE_CATEGORIES.find(c => c.prefixes.some(p => ruleId.startsWith(p)));
    const label = cat?.label ?? OTHER_CATEGORY.label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([label, count]) => {
    const cat = RULE_CATEGORIES.find(c => c.label === label) ?? OTHER_CATEGORY;
    return { label, count, icon: cat.icon, color: cat.color, bgColor: cat.bgColor };
  });
}

// ─────────────────────────────────────────────────────────────────────────────

interface IssueHighlight {
  issue: PdfAuditIssue;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Parse issue bounding box at scale=1 (PDF points, top-left origin).
 * Returns raw coords without scale or padding applied — the caller scales them.
 */
function parseIssueLocation(issue: PdfAuditIssue): { x: number; y: number; width: number; height: number } | null {
  const bb = issue.boundingBox;
  if (!bb || bb.width <= 0 || bb.height <= 0) return null;
  return { x: bb.x, y: bb.y, width: bb.width, height: bb.height };
}

const IssueOverlay: React.FC<{
  highlight: IssueHighlight;
  isSelected: boolean;
  onClick: () => void;
  index: number;
  globalNumber?: number;
}> = ({ highlight, isSelected, onClick, index, globalNumber }) => {
  const severity = highlight.issue.severity as keyof typeof SEVERITY_BORDER_COLORS;

  return (
    <div
      className="absolute cursor-pointer transition-all"
      style={{
        left: `${highlight.x}px`,
        top: `${highlight.y}px`,
        width: `${highlight.width}px`,
        height: `${highlight.height}px`,
        backgroundColor: 'transparent',
        border: `3px solid #ef4444`,
        outline: isSelected ? '3px solid #fbbf24' : undefined,
        outlineOffset: '2px',
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
        {globalNumber ?? index + 1}
      </div>
    </div>
  );
};

export const PdfPreviewPanel: React.FC<PdfPreviewPanelProps> = ({
  pdfUrl,
  currentPage,
  issues,
  selectedIssueId,
  onPageChange,
  onIssueSelect,
  issueNumberMap,
  className,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(100);
  const [showHighlights, setShowHighlights] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Prepare PDF file with auth headers
  const pdfFile = useMemo(() => {
    // Get token from localStorage (same method as api.ts)
    let token: string | null = null;
    try {
      const stored = localStorage.getItem('ninja-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        token = parsed.state?.accessToken || null;
      }
    } catch {
      // Ignore parse errors
    }

    return {
      url: pdfUrl,
      httpHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      withCredentials: true,
    };
  }, [pdfUrl]);

  // Filter issues for current page and create highlights
  const currentPageIssues = useMemo(() => {
    return issues?.filter((issue) => issue.pageNumber === currentPage) || [];
  }, [issues, currentPage]);

  const highlights = useMemo(() => {
    const scale = typeof zoomLevel === 'number' ? zoomLevel / 100 : 1;
    return currentPageIssues
      .flatMap((issue) => {
        const raw = parseIssueLocation(issue);
        if (!raw) return [];
        return [{
          issue,
          x: raw.x * scale + OVERLAY_PADDING_PX,
          y: raw.y * scale + OVERLAY_PADDING_PX,
          width: raw.width * scale,
          height: raw.height * scale,
        } as IssueHighlight];
      });
  }, [currentPageIssues, zoomLevel]);

  const categoryBreakdown = useMemo(() => categorizePageIssues(currentPageIssues), [currentPageIssues]);

  const selectedIssue = useMemo(() => {
    if (!selectedIssueId) return null;
    return currentPageIssues.find(i => i.id === selectedIssueId)
      ?? issues.find(i => i.id === selectedIssueId)
      ?? null;
  }, [selectedIssueId, currentPageIssues, issues]);

  const handleDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    // setIsLoading(false);
    setError(null);
  }, []);

  const handleDocumentLoadError = useCallback((error: Error) => {
    setError(error.message || 'Failed to load PDF');
    // setIsLoading(false);
  }, []);

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
            onChange={(e) => {
              const value = e.target.value;
              // Parse numeric values as numbers, keep string values as strings
              if (value === 'fit-width' || value === 'fit-page') {
                setZoomLevel(value);
              } else {
                setZoomLevel(Number(value) as ZoomLevel);
              }
            }}
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
          {error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <AlertCircle className="h-12 w-12 text-red-600 mb-4" />
              <p className="text-red-600 font-medium mb-2">Failed to load PDF</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          ) : (
            <div className="relative bg-white shadow-lg p-8">
              <Document
                file={pdfFile}
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
              </Document>

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
                        globalNumber={issueNumberMap?.get(highlight.issue.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected issue context strip — below the PDF page, inside the scrollable area */}
        {!error && selectedIssue && (
          <div className="mt-3 mx-auto max-w-3xl px-4 py-2.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'px-1.5 py-0.5 rounded font-medium',
                selectedIssue.severity === 'critical' && 'bg-red-100 text-red-700',
                selectedIssue.severity === 'serious' && 'bg-orange-100 text-orange-700',
                selectedIssue.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
                selectedIssue.severity === 'minor' && 'bg-blue-100 text-blue-700',
              )}>
                {selectedIssue.severity}
              </span>
              <span className="font-semibold text-purple-900">{selectedIssue.ruleId}</span>
              {selectedIssue.elementPath && (
                <span className="font-mono text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded truncate max-w-xs">
                  {selectedIssue.elementPath}
                </span>
              )}
            </div>
            <p className="text-purple-800 mt-1 leading-relaxed">{selectedIssue.message}</p>
          </div>
        )}
      </div>

      {/* Issue type breakdown bar */}
      {currentPageIssues.length > 0 && (
        <div className="px-4 py-2 bg-white border-t border-gray-200">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-500 shrink-0">
              Page {currentPage} — {currentPageIssues.length} {currentPageIssues.length === 1 ? 'issue' : 'issues'}:
            </span>
            {categoryBreakdown.map(({ label, count, icon, color, bgColor }) => (
              <span
                key={label}
                className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', bgColor, color)}
              >
                {icon}
                {count} {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
