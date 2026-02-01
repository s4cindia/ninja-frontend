import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronLeft, ChevronRight, FileText, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip } from '../ui/Tooltip';
import type { PdfAuditIssue } from '@/types/pdf.types';

type PageFilter = 'all' | 'with-issues' | 'critical-only';

export interface PdfPageNavigatorProps {
  pageCount: number;
  currentPage: number;
  issuesByPage: Map<number, PdfAuditIssue[]>;
  onPageChange: (page: number) => void;
  thumbnails?: string[];
  orientation?: 'vertical' | 'horizontal';
  className?: string;
}

interface PageIssueSummary {
  total: number;
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  highestSeverity: 'critical' | 'serious' | 'moderate' | 'minor' | null;
}

const SEVERITY_ORDER = ['critical', 'serious', 'moderate', 'minor'] as const;

const SEVERITY_CONFIG = {
  critical: {
    color: 'bg-red-500',
    textColor: 'text-red-700',
    borderColor: 'border-red-500',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  serious: {
    color: 'bg-orange-500',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-500',
    icon: <AlertTriangle className="h-3 w-3" />,
  },
  moderate: {
    color: 'bg-yellow-500',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-500',
    icon: <Info className="h-3 w-3" />,
  },
  minor: {
    color: 'bg-blue-500',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-500',
    icon: <Info className="h-3 w-3" />,
  },
};

function getPageIssueSummary(issues: PdfAuditIssue[]): PageIssueSummary {
  const summary: PageIssueSummary = {
    total: issues.length,
    critical: 0,
    serious: 0,
    moderate: 0,
    minor: 0,
    highestSeverity: null,
  };

  issues.forEach((issue) => {
    const severity = issue.severity as keyof Omit<PageIssueSummary, 'total' | 'highestSeverity'>;
    if (severity in summary) {
      summary[severity]++;
    }
  });

  // Determine highest severity
  for (const severity of SEVERITY_ORDER) {
    if (summary[severity] > 0) {
      summary.highestSeverity = severity;
      break;
    }
  }

  return summary;
}

const PageItem: React.FC<{
  pageNumber: number;
  isActive: boolean;
  issueSummary: PageIssueSummary | null;
  thumbnail?: string;
  onClick: () => void;
  showThumbnails: boolean;
}> = ({ pageNumber, isActive, issueSummary, thumbnail, onClick, showThumbnails }) => {
  const severityConfig = issueSummary?.highestSeverity
    ? SEVERITY_CONFIG[issueSummary.highestSeverity]
    : null;

  const tooltipContent = issueSummary
    ? `Critical: ${issueSummary.critical}, Serious: ${issueSummary.serious}, Moderate: ${issueSummary.moderate}, Minor: ${issueSummary.minor}`
    : 'No issues';

  return (
    <Tooltip id={`page-${pageNumber}-tooltip`} content={tooltipContent} position="right">
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'relative w-full p-2 rounded-lg border-2 transition-all group',
          isActive
            ? 'border-primary-500 bg-primary-50 shadow-md'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1'
        )}
        aria-label={`Page ${pageNumber}${issueSummary && issueSummary.total > 0 ? ` - ${issueSummary.total} ${issueSummary.total === 1 ? 'issue' : 'issues'}` : ''}`}
        aria-current={isActive ? 'page' : undefined}
      >
        {showThumbnails && thumbnail ? (
          <div className="space-y-2">
            <img
              src={thumbnail}
              alt={`Page ${pageNumber} thumbnail`}
              className="w-full h-auto rounded border border-gray-200"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">Page {pageNumber}</span>
              {issueSummary && issueSummary.total > 0 && severityConfig && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded text-xs font-bold text-white',
                    severityConfig.color
                  )}
                >
                  {issueSummary.total}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Page {pageNumber}</span>
            </div>
            {issueSummary && issueSummary.total > 0 && severityConfig && (
              <span
                className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-bold text-white flex items-center gap-1',
                  severityConfig.color
                )}
              >
                {issueSummary.total}
              </span>
            )}
          </div>
        )}

        {/* Severity indicator bar */}
        {issueSummary && issueSummary.total > 0 && severityConfig && (
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-1 rounded-l-lg',
              severityConfig.color
            )}
          />
        )}
      </button>
    </Tooltip>
  );
};

export const PdfPageNavigator: React.FC<PdfPageNavigatorProps> = ({
  pageCount,
  currentPage,
  issuesByPage,
  onPageChange,
  thumbnails,
  orientation = 'vertical',
  className,
}) => {
  const [filter, setFilter] = useState<PageFilter>('all');
  const [jumpToPage, setJumpToPage] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const showThumbnails = thumbnails && thumbnails.length > 0;

  // Calculate issue summaries for each page
  const pageSummaries = useMemo(() => {
    const summaries = new Map<number, PageIssueSummary>();
    for (let i = 1; i <= pageCount; i++) {
      const issues = issuesByPage.get(i) || [];
      summaries.set(i, getPageIssueSummary(issues));
    }
    return summaries;
  }, [pageCount, issuesByPage]);

  // Filter pages based on selected filter
  const visiblePages = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= pageCount; i++) {
      const summary = pageSummaries.get(i);

      if (filter === 'all') {
        pages.push(i);
      } else if (filter === 'with-issues' && summary && summary.total > 0) {
        pages.push(i);
      } else if (filter === 'critical-only' && summary && summary.critical > 0) {
        pages.push(i);
      }
    }
    return pages;
  }, [pageCount, filter, pageSummaries]);

  // Scroll active page into view
  useEffect(() => {
    if (activeItemRef.current && containerRef.current) {
      activeItemRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [currentPage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPage > 1) {
          onPageChange(currentPage - 1);
        }
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPage < pageCount) {
          onPageChange(currentPage + 1);
        }
      } else if (e.key === 'Home') {
        e.preventDefault();
        onPageChange(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        onPageChange(pageCount);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageCount, onPageChange]);

  const handleJumpToPage = (e: React.FormEvent) => {
    e.preventDefault();
    const page = parseInt(jumpToPage, 10);
    if (!isNaN(page) && page >= 1 && page <= pageCount) {
      onPageChange(page);
      setJumpToPage('');
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < pageCount) {
      onPageChange(currentPage + 1);
    }
  };

  const totalIssues = useMemo(() => {
    let total = 0;
    pageSummaries.forEach((summary) => {
      total += summary.total;
    });
    return total;
  }, [pageSummaries]);

  const pagesWithIssues = useMemo(() => {
    let count = 0;
    pageSummaries.forEach((summary) => {
      if (summary.total > 0) count++;
    });
    return count;
  }, [pageSummaries]);

  return (
    <div
      className={cn(
        'flex flex-col bg-white border border-gray-200 rounded-lg',
        orientation === 'vertical' ? 'h-full' : 'w-full',
        className
      )}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Pages</h3>

        {/* Summary */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
          <span>{pageCount} pages</span>
          <span className="text-red-600 font-medium">
            {totalIssues} issues on {pagesWithIssues} pages
          </span>
        </div>

        {/* Filter */}
        <div className="flex gap-1 mb-3">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              filter === 'all'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setFilter('with-issues')}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              filter === 'with-issues'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            With Issues
          </button>
          <button
            type="button"
            onClick={() => setFilter('critical-only')}
            className={cn(
              'px-2 py-1 rounded text-xs font-medium transition-colors',
              filter === 'critical-only'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            Critical
          </button>
        </div>

        {/* Jump to page */}
        <form onSubmit={handleJumpToPage} className="flex gap-2">
          <input
            type="number"
            min={1}
            max={pageCount}
            value={jumpToPage}
            onChange={(e) => setJumpToPage(e.target.value)}
            placeholder="Jump to..."
            className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Jump to page number"
          />
          <button
            type="submit"
            className="px-3 py-1 text-xs font-medium bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
          >
            Go
          </button>
        </form>
      </div>

      {/* Page list */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 overflow-y-auto p-2 space-y-2',
          orientation === 'horizontal' && 'flex flex-row space-y-0 space-x-2 overflow-x-auto'
        )}
        role="list"
        aria-label="PDF pages"
      >
        {visiblePages.map((pageNumber) => (
          <PageItem
            key={pageNumber}
            pageNumber={pageNumber}
            isActive={pageNumber === currentPage}
            issueSummary={pageSummaries.get(pageNumber) || null}
            thumbnail={thumbnails?.[pageNumber - 1]}
            onClick={() => onPageChange(pageNumber)}
            showThumbnails={!!showThumbnails}
          />
        ))}

        {visiblePages.length === 0 && (
          <div className="text-center py-8 text-sm text-gray-500">
            No pages match the current filter
          </div>
        )}
      </div>

      {/* Navigation controls */}
      <div className="p-3 border-t border-gray-200 flex items-center justify-between">
        <button
          type="button"
          onClick={handlePrevPage}
          disabled={currentPage <= 1}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <span className="text-sm text-gray-700 font-medium">
          Page {currentPage} / {pageCount}
        </span>

        <button
          type="button"
          onClick={handleNextPage}
          disabled={currentPage >= pageCount}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
};
