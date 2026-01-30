/**
 * PdfAuditResultsPage Component
 *
 * Main page for displaying PDF accessibility audit results with:
 * - Three-column layout: Navigator | Preview | Issues
 * - Issue filtering and searching
 * - Matterhorn Protocol compliance display
 * - Issue-page synchronization
 * - Download reports and other actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, Download, Share2, RotateCw, Filter, X, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MatterhornSummary } from '@/components/pdf/MatterhornSummary';
import { PdfPageNavigator } from '@/components/pdf/PdfPageNavigator';
import { PdfPreviewPanel } from '@/components/pdf/PdfPreviewPanel';
import { IssueCard } from '@/components/remediation/IssueCard';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import type { PdfAuditResult, PdfAuditIssue } from '@/types/pdf.types';
import type { IssueSeverity } from '@/types/accessibility.types';

// Filter state interface
interface IssueFilters {
  severity: IssueSeverity | 'all';
  wcagCriterion: string | 'all';
  matterhornCategory: string | 'all';
  pageNumber: number | 'all';
  searchText: string;
}

const initialFilters: IssueFilters = {
  severity: 'all',
  wcagCriterion: 'all',
  matterhornCategory: 'all',
  pageNumber: 'all',
  searchText: '',
};

// Score color helper
const getScoreColor = (score: number): string => {
  if (score >= 90) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  if (score >= 50) return 'text-orange-600';
  return 'text-red-600';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 90) return 'bg-green-50 border-green-200';
  if (score >= 70) return 'bg-yellow-50 border-yellow-200';
  if (score >= 50) return 'bg-orange-50 border-orange-200';
  return 'bg-red-50 border-red-200';
};

export const PdfAuditResultsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  // State management
  const [auditResult, setAuditResult] = useState<PdfAuditResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>();
  const [filters, setFilters] = useState<IssueFilters>(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch audit result
  const fetchAuditResult = useCallback(async () => {
    if (!jobId) {
      setError('No job ID provided');
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.get(`/pdf/job/${jobId}/audit/result`);
      const data = response.data.data || response.data;

      // Check if still processing
      if (data.status === 'processing' || data.status === 'pending') {
        setIsPolling(true);
        setIsLoading(false);
        return;
      }

      // Check if failed
      if (data.status === 'failed') {
        setError('Audit failed. Please try again.');
        setIsLoading(false);
        setIsPolling(false);
        return;
      }

      setAuditResult(data as PdfAuditResult);
      setIsLoading(false);
      setIsPolling(false);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load audit results';
      setError(message);
      setIsLoading(false);
      setIsPolling(false);
    }
  }, [jobId]);

  // Initial load
  useEffect(() => {
    fetchAuditResult();
  }, [fetchAuditResult]);

  // Polling for processing jobs
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      fetchAuditResult();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, fetchAuditResult]);

  // Build issues by page map
  const issuesByPage = useMemo(() => {
    if (!auditResult) return new Map<number, PdfAuditIssue[]>();

    const map = new Map<number, PdfAuditIssue[]>();
    auditResult.issues.forEach((issue) => {
      const page = issue.pageNumber || 0;
      if (!map.has(page)) {
        map.set(page, []);
      }
      map.get(page)!.push(issue);
    });
    return map;
  }, [auditResult]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (!auditResult) return [];

    let issues = [...auditResult.issues];

    // Filter by severity
    if (filters.severity !== 'all') {
      issues = issues.filter((issue) => issue.severity === filters.severity);
    }

    // Filter by WCAG criterion
    if (filters.wcagCriterion !== 'all') {
      issues = issues.filter(
        (issue) => issue.wcagCriteria?.includes(filters.wcagCriterion)
      );
    }

    // Filter by Matterhorn category
    if (filters.matterhornCategory !== 'all') {
      issues = issues.filter((issue) =>
        issue.matterhornCheckpoint?.startsWith(filters.matterhornCategory)
      );
    }

    // Filter by page number
    if (filters.pageNumber !== 'all') {
      issues = issues.filter((issue) => issue.pageNumber === filters.pageNumber);
    }

    // Filter by search text
    if (filters.searchText.trim()) {
      const searchLower = filters.searchText.toLowerCase();
      issues = issues.filter(
        (issue) =>
          issue.message.toLowerCase().includes(searchLower) ||
          issue.description.toLowerCase().includes(searchLower) ||
          issue.ruleId.toLowerCase().includes(searchLower)
      );
    }

    return issues;
  }, [auditResult, filters]);

  // Get unique WCAG criteria
  const uniqueWcagCriteria = useMemo(() => {
    if (!auditResult) return [];
    const criteria = new Set<string>();
    auditResult.issues.forEach((issue) => {
      issue.wcagCriteria?.forEach((c) => criteria.add(c));
    });
    return Array.from(criteria).sort();
  }, [auditResult]);

  // Get unique Matterhorn categories
  const uniqueMatterhornCategories = useMemo(() => {
    if (!auditResult) return [];
    return auditResult.matterhornSummary.categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
    }));
  }, [auditResult]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleIssueSelect = useCallback((issue: PdfAuditIssue) => {
    setSelectedIssueId(issue.id);
    if (issue.pageNumber && issue.pageNumber !== currentPage) {
      setCurrentPage(issue.pageNumber);
    }
  }, [currentPage]);

  const handlePageClick = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Select first issue on that page
    const pageIssues = issuesByPage.get(pageNumber);
    if (pageIssues && pageIssues.length > 0) {
      setSelectedIssueId(pageIssues[0].id);
    }
  }, [issuesByPage]);

  const handleMatterhornCheckpointClick = useCallback((checkpointId: string) => {
    // Filter to show issues for this checkpoint
    setFilters((prev) => ({
      ...prev,
      matterhornCategory: checkpointId.substring(0, 2), // Extract category (e.g., "01" from "01-003")
    }));
    setShowFilters(true);
  }, []);

  const handleDownloadReport = async (format: 'pdf' | 'docx' | 'json' = 'json') => {
    if (!auditResult || !jobId) return;

    setIsDownloading(true);
    try {
      const response = await api.get(`/pdf/job/${jobId}/report`, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob',
      });

      const data = response.data;
      const blob =
        format === 'json'
          ? new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
          : data;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdf-audit-report-${jobId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: download JSON
      const blob = new Blob([JSON.stringify(auditResult, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pdf-audit-report-${jobId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleReRunAudit = () => {
    navigate('/pdf');
  };

  const handleShareResults = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      alert('Results link copied to clipboard!');
    } else {
      prompt('Copy this link to share results:', url);
    }
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const hasActiveFilters =
    filters.severity !== 'all' ||
    filters.wcagCriterion !== 'all' ||
    filters.matterhornCategory !== 'all' ||
    filters.pageNumber !== 'all' ||
    filters.searchText.trim() !== '';

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
              <span className="text-gray-600 text-lg">Loading audit results...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Polling state
  if (isPolling) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
              <p className="text-gray-700 font-medium text-lg">Audit in progress...</p>
              <p className="text-gray-500">This may take a few moments</p>
              <Button variant="outline" size="sm" onClick={fetchAuditResult} className="mt-4">
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error || !auditResult) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'PDF Accessibility', href: '/pdf' },
            { label: 'Audit Results' },
          ]}
        />
        <Alert variant="error" className="mt-6">
          {error || 'Failed to load audit results'}
        </Alert>
        <Button variant="primary" onClick={handleReRunAudit} className="mt-4">
          Return to Upload
        </Button>
      </div>
    );
  }

  // Generate PDF URL (this would come from API in production)
  const pdfUrl = `/api/pdf/job/${jobId}/file`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: 'PDF Accessibility', href: '/pdf' },
              { label: 'Audit Results' },
            ]}
          />
          <div className="flex items-start justify-between mt-3">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <FileText className="h-7 w-7 text-primary-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{auditResult.fileName}</h1>
                  <p className="text-sm text-gray-600 mt-1">
                    {auditResult.pageCount} pages • {Math.round(auditResult.fileSize / 1024)} KB •
                    PDF {auditResult.metadata.pdfVersion}
                    {auditResult.metadata.isTagged && (
                      <Badge variant="success" className="ml-2">
                        Tagged
                      </Badge>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Score Display */}
            <div className={cn('flex flex-col items-center p-4 rounded-lg border-2', getScoreBgColor(auditResult.score))}>
              <div className={cn('text-4xl font-bold', getScoreColor(auditResult.score))}>
                {auditResult.score}
              </div>
              <div className="text-sm text-gray-600 mt-1">Accessibility Score</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleDownloadReport('json')}
              disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-1" />
              Download Report
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareResults}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleReRunAudit}>
              <RotateCw className="h-4 w-4 mr-1" />
              Re-run Audit
            </Button>
          </div>
        </div>
      </div>

      {/* Matterhorn Summary */}
      <div className="px-6 py-4 bg-white border-b border-gray-200">
        <MatterhornSummary
          summary={auditResult.matterhornSummary}
          onCheckpointClick={handleMatterhornCheckpointClick}
          collapsed={true}
        />
      </div>

      {/* Three-column layout */}
      <div className="flex h-[calc(100vh-320px)]">
        {/* Left: Page Navigator */}
        <div className="w-64 border-r border-gray-200 bg-white overflow-hidden">
          <PdfPageNavigator
            pageCount={auditResult.pageCount}
            currentPage={currentPage}
            issuesByPage={issuesByPage}
            onPageChange={handlePageChange}
            orientation="vertical"
            className="h-full"
          />
        </div>

        {/* Center: PDF Preview */}
        <div className="flex-1 overflow-hidden">
          <PdfPreviewPanel
            pdfUrl={pdfUrl}
            currentPage={currentPage}
            issues={auditResult.issues}
            selectedIssueId={selectedIssueId}
            onPageChange={handlePageChange}
            onIssueSelect={handleIssueSelect}
          />
        </div>

        {/* Right: Issues List */}
        <div className="w-96 border-l border-gray-200 bg-white flex flex-col">
          {/* Filter Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Issues ({filteredIssues.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
                <ChevronDown
                  className={cn(
                    'h-4 w-4 ml-1 transition-transform',
                    showFilters && 'rotate-180'
                  )}
                />
              </Button>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active filters:</span>
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3 w-3 mr-1" />
                  Clear
                </Button>
              </div>
            )}

            {/* Filter Panel */}
            {showFilters && (
              <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search issues..."
                  value={filters.searchText}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, searchText: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />

                {/* Severity filter */}
                <select
                  value={filters.severity}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      severity: e.target.value as IssueSeverity | 'all',
                    }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="serious">Serious</option>
                  <option value="moderate">Moderate</option>
                  <option value="minor">Minor</option>
                </select>

                {/* WCAG filter */}
                <select
                  value={filters.wcagCriterion}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, wcagCriterion: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All WCAG Criteria</option>
                  {uniqueWcagCriteria.map((criterion) => (
                    <option key={criterion} value={criterion}>
                      WCAG {criterion}
                    </option>
                  ))}
                </select>

                {/* Matterhorn category filter */}
                <select
                  value={filters.matterhornCategory}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, matterhornCategory: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Matterhorn Categories</option>
                  {uniqueMatterhornCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.id}: {cat.name}
                    </option>
                  ))}
                </select>

                {/* Page filter */}
                <input
                  type="number"
                  min={1}
                  max={auditResult.pageCount}
                  placeholder={`Page (1-${auditResult.pageCount})`}
                  value={filters.pageNumber === 'all' ? '' : filters.pageNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({
                      ...prev,
                      pageNumber: val === '' ? 'all' : parseInt(val, 10),
                    }));
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            )}
          </div>

          {/* Issues List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No issues found</p>
                {hasActiveFilters && (
                  <Button variant="link" size="sm" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                )}
              </div>
            ) : (
              filteredIssues.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  onPageClick={handlePageClick}
                  showMatterhorn={true}
                  compact={true}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
