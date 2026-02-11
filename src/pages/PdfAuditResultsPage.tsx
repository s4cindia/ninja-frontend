/**
 * PdfAuditResultsPage Component
 *
 * Main page for displaying PDF accessibility audit results with:
 * - Three-column layout: Navigator | Preview | Issues
 * - Issue filtering and searching
 * - Matterhorn Protocol compliance display
 * - Issue-page synchronization
 * - Download reports and other actions
 *
 * @important When adding this route to App.tsx, wrap it with ErrorBoundary:
 * ```tsx
 * import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
 * import { PdfAuditResultsPage } from '@/pages/PdfAuditResultsPage';
 *
 * <Route path="/pdf/results/:jobId" element={
 *   <ErrorBoundary>
 *     <PdfAuditResultsPage />
 *   </ErrorBoundary>
 * } />
 * ```
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, Download, Share2, RotateCw, Filter, X, ChevronDown, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { MatterhornSummary } from '@/components/pdf/MatterhornSummary';
import { PdfPageNavigator } from '@/components/pdf/PdfPageNavigator';
import { PdfPreviewPanel } from '@/components/pdf/PdfPreviewPanel';
import { ScanLevelBanner } from '@/components/pdf/ScanLevelBanner';
import { IssueCard } from '@/components/remediation/IssueCard';
import { api } from '@/services/api';
import { cn } from '@/utils/cn';
import { validateJobId } from '@/utils/validation';
import { useCreateRemediationPlan } from '@/hooks/usePdfRemediation';
import type { PdfAuditResult, PdfAuditIssue } from '@/types/pdf.types';
import type { IssueSeverity } from '@/types/accessibility.types';
import type { ScanLevel, ValidatorType } from '@/types/scan-level.types';

// Filter state interface
interface IssueFilters {
  severity: IssueSeverity | 'all';
  wcagCriterion: string | 'all';
  matterhornCategory: string | 'all';
  pageNumber: number | 'all';
  searchText: string;
  showMatterhornOnly: boolean;
}

const initialFilters: IssueFilters = {
  severity: 'all',
  wcagCriterion: 'all',
  matterhornCategory: 'all',
  pageNumber: 'all',
  searchText: '',
  showMatterhornOnly: false,
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

// Constants
const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds

export const PdfAuditResultsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  // Track component mount status to prevent setState on unmounted component
  const isMountedRef = useRef(true);

  // React Query hooks
  const createPlanMutation = useCreateRemediationPlan();

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
  const [isReScanning, setIsReScanning] = useState(false);
  const [currentScanLevel, setCurrentScanLevel] = useState<ScanLevel>('basic');

  // Fetch audit result
  const fetchAuditResult = useCallback(async () => {
    // Validate jobId to prevent path traversal attacks
    if (!validateJobId(jobId)) {
      if (isMountedRef.current) {
        setError('Invalid job ID');
        setIsLoading(false);
      }
      return;
    }

    try {
      // encodeURIComponent provides defense-in-depth despite regex validation
      const response = await api.get(`/pdf/job/${encodeURIComponent(jobId)}/audit/result`);
      const data = response.data.data || response.data;

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      // Check if still processing (case-insensitive to handle backend uppercase values)
      const statusLower = typeof data.status === 'string' ? data.status.toLowerCase() : '';
      if (statusLower === 'processing' || statusLower === 'pending' || statusLower === 'queued') {
        setIsPolling(true);
        setIsLoading(false);
        return;
      }

      // Check if failed
      if (statusLower === 'failed') {
        setError('Audit failed. Please try again.');
        setIsLoading(false);
        setIsPolling(false);
        return;
      }

      setAuditResult(data as PdfAuditResult);
      // Extract scan level from output metadata (default to 'basic' if not specified)
      setCurrentScanLevel((data as any).scanLevel || 'basic');
      setIsLoading(false);
      setIsPolling(false);
      setIsReScanning(false);
      setError(null);
    } catch (err) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Failed to load audit results';
      setError(message);
      setIsLoading(false);
      setIsPolling(false);
    }
  }, [jobId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchAuditResult();
  }, [fetchAuditResult]);

  // Polling for processing jobs
  useEffect(() => {
    if (!isPolling) return;

    const pollInterval = setInterval(() => {
      fetchAuditResult();
    }, POLLING_INTERVAL_MS);

    return () => clearInterval(pollInterval);
  }, [isPolling, fetchAuditResult]);

  // Build issues by page map
  const issuesByPage = useMemo(() => {
    if (!auditResult || !auditResult.issues) return new Map<number, PdfAuditIssue[]>();

    const map = new Map<number, PdfAuditIssue[]>();
    auditResult.issues.forEach((issue) => {
      // Skip issues without a valid page number
      if (!issue.pageNumber || issue.pageNumber < 1) return;

      const page = issue.pageNumber;
      if (!map.has(page)) {
        map.set(page, []);
      }
      map.get(page)!.push(issue);
    });
    return map;
  }, [auditResult]);

  // Filter issues
  const filteredIssues = useMemo(() => {
    if (!auditResult || !auditResult.issues) return [];

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

    // Filter by Matterhorn mapping only
    if (filters.showMatterhornOnly) {
      issues = issues.filter((issue) => {
        const code = ((issue as any).code || issue.ruleId || '').toUpperCase();
        return (
          (issue.matterhornCheckpoint != null && issue.matterhornCheckpoint !== '') ||
          code.startsWith('MATTERHORN-') ||
          // Include related codes that map to Matterhorn checkpoints
          code.startsWith('TABLE-') ||
          code.startsWith('ALT-TEXT-') ||
          code.startsWith('LIST-') ||
          code.startsWith('PDF-LOW-CONTRAST') ||
          code.startsWith('PDF-UNTAGGED') ||
          code.startsWith('PDF-NO-LANGUAGE')
        );
      });
    }

    return issues;
  }, [auditResult, filters]);

  // Count Matterhorn-related issues
  // Includes issues with explicit MATTERHORN codes and related codes that map to Matterhorn checkpoints
  const matterhornIssueCount = useMemo(() => {
    if (!auditResult || !auditResult.issues) return 0;
    return auditResult.issues.filter(
      (issue) => {
        const code = ((issue as any).code || issue.ruleId || '').toUpperCase();
        return (
          (issue.matterhornCheckpoint != null && issue.matterhornCheckpoint !== '') ||
          code.startsWith('MATTERHORN-') ||
          // Table-related codes (map to Matterhorn 15)
          code.startsWith('TABLE-') ||
          // Alt text codes (map to Matterhorn 13)
          code.startsWith('ALT-TEXT-') ||
          // List codes (map to Matterhorn structure)
          code.startsWith('LIST-') ||
          // PDF structure codes
          code.startsWith('PDF-LOW-CONTRAST') ||
          code.startsWith('PDF-UNTAGGED') ||
          code.startsWith('PDF-NO-LANGUAGE')
        );
      }
    ).length;
  }, [auditResult]);

  // Get unique WCAG criteria
  const uniqueWcagCriteria = useMemo(() => {
    if (!auditResult || !auditResult.issues) return [];
    const criteria = new Set<string>();
    auditResult.issues.forEach((issue) => {
      issue.wcagCriteria?.forEach((c) => criteria.add(c));
    });
    return Array.from(criteria).sort();
  }, [auditResult]);

  // Get unique Matterhorn categories
  const uniqueMatterhornCategories = useMemo(() => {
    if (!auditResult || !auditResult.matterhornSummary?.categories) return [];
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
      const response = await api.get(`/pdf/job/${encodeURIComponent(jobId)}/report`, {
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
    } catch (err) {
      console.warn('Failed to download report in requested format, falling back to JSON:', err);

      // Notify user about fallback (TODO: Replace with toast notification)
      alert(`Unable to generate ${format.toUpperCase()} report. Downloading as JSON instead.`);

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

  const handleShareResults = async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        // TODO: Replace with toast notification system
        alert('Results link copied to clipboard!');
      } else {
        // Fallback: create a temporary input element
        const input = document.createElement('input');
        input.value = url;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        alert('Results link copied to clipboard!');
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
      alert('Failed to copy link. Please copy manually: ' + url);
    }
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const handleCreatePlan = async () => {
    if (!jobId) return;

    try {
      await createPlanMutation.mutateAsync(jobId);
      toast.success('Remediation plan created successfully');
      navigate(`/pdf/${jobId}/remediation`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create remediation plan';
      toast.error(message);
    }
  };

  const handleReScan = async (scanLevel: ScanLevel, customValidators?: ValidatorType[]) => {
    if (!jobId) return;

    setIsReScanning(true);
    setIsPolling(false); // Don't poll - we'll get the result directly from the POST response
    // Optimistically update scan level immediately
    setCurrentScanLevel(scanLevel);

    try {
      // Show loading toast
      const toastId = toast.loading(`Running ${scanLevel} scan... This may take a few minutes.`);

      // Call re-scan API - the response will contain the full audit results
      const response = await api.post(`/pdf/job/${encodeURIComponent(jobId)}/re-scan`, {
        scanLevel,
        customValidators,
      });

      // Extract audit report from response
      const data = response.data.data || response.data;
      if (data.auditReport) {
        // Transform the audit report to match PdfAuditResult structure
        // Backend returns pageCount and matterhornSummary in metadata, but frontend expects them at root
        const report = data.auditReport;
        const transformedResult: PdfAuditResult = {
          id: report.jobId || jobId!,
          jobId: report.jobId || jobId!,
          fileName: report.fileName,
          fileSize: auditResult?.fileSize || 0, // Preserve from previous result
          pageCount: (report.metadata as any)?.pageCount || auditResult?.pageCount || 0,
          score: report.score,
          status: 'completed',
          createdAt: auditResult?.createdAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          issues: report.issues || [],
          matterhornSummary: (report.metadata as any)?.matterhornSummary || auditResult?.matterhornSummary,
          metadata: report.metadata as any,
        };

        setAuditResult(transformedResult);
        setCurrentScanLevel(data.scanLevel || scanLevel);
        toast.success(`${scanLevel} scan complete! Found ${report.issues?.length || 0} issues.`, { id: toastId });
      } else {
        // Fallback to polling if response doesn't contain audit report
        setIsPolling(true);
        toast.success(`${scanLevel} scan started. Loading results...`, { id: toastId });
      }

      setIsReScanning(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start re-scan';
      toast.error(message);
      setIsReScanning(false);
      setIsPolling(false);
      // Revert scan level on error
      setCurrentScanLevel('basic');
    }
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
              <p className="text-gray-700 font-medium text-lg">
                {isReScanning ? 'Re-scanning document...' : 'Audit in progress...'}
              </p>
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
            { label: 'PDF Accessibility', path: '/pdf' },
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
  const pdfUrl = `/api/v1/pdf/job/${encodeURIComponent(jobId!)}/file`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <Breadcrumbs
            items={[
              { label: 'PDF Accessibility', path: '/pdf' },
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
                    {auditResult.pageCount} pages • {Math.round(auditResult.fileSize / 1024)} KB
                    {auditResult.metadata?.pdfVersion && ` • PDF ${auditResult.metadata.pdfVersion}`}
                    {auditResult.metadata?.isTagged && (
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
              onClick={handleCreatePlan}
              disabled={createPlanMutation.isPending || (auditResult?.issues?.length ?? 0) === 0}
            >
              <ListChecks className="h-4 w-4 mr-1" />
              {createPlanMutation.isPending ? 'Creating Plan...' : 'Create Remediation Plan'}
            </Button>
            <Button
              variant="outline"
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

        {/* Info Note: Matterhorn vs All Issues */}
        {auditResult.issues && auditResult.issues.length > matterhornIssueCount && (
          <Alert variant="info" className="mt-4">
            <div className="flex items-start gap-2">
              <ListChecks className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium mb-1">
                  Understanding Issue Counts
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  <strong>{matterhornIssueCount} issues</strong> relate to Matterhorn Protocol compliance (includes explicit MATTERHORN codes and related codes like TABLE-, ALT-TEXT-, LIST-),
                  while <strong>{auditResult.issues.length} total issues</strong> were found across all validators.
                </p>
                <p className="text-sm text-gray-700 mb-2">
                  The Matterhorn Summary above shows <strong>{auditResult.matterhornSummary?.failed || 0} failed checkpoints</strong> with a total of{' '}
                  <strong>
                    {auditResult.matterhornSummary?.categories?.reduce(
                      (sum, cat) => sum + cat.checkpoints.reduce((s, cp) => s + (cp.status === 'failed' ? cp.issueCount : 0), 0),
                      0
                    ) || 0} checkpoint violations
                  </strong>.
                  {' '}Note that one issue can violate multiple checkpoints, so the violation count may be higher than the unique issue count.
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  <strong>Tip:</strong> Use the toggle in the Issues panel to switch between "All Issues" and "Matterhorn-Related Issues" views.
                </p>
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* Debug: Show scan level */}
      {process.env.NODE_ENV === 'development' && (
        <div className="px-6 py-2 bg-yellow-50 text-xs border-b">
          Debug: scanLevel={currentScanLevel}, auditResult={auditResult ? 'loaded' : 'null'}, isReScanning={isReScanning}, bannerVisible={currentScanLevel !== 'comprehensive' && !!auditResult}
        </div>
      )}

      {/* Scan Level Banner - offer deeper analysis if not already comprehensive */}
      {currentScanLevel !== 'comprehensive' && auditResult && (
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <ScanLevelBanner
            currentScanLevel={currentScanLevel}
            onReScan={handleReScan}
            isScanning={isReScanning}
          />
        </div>
      )}

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

            {/* Matterhorn Toggle */}
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, showMatterhornOnly: false }))}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  !filters.showMatterhornOnly
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                )}
              >
                All Issues ({auditResult?.issues?.length || 0})
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, showMatterhornOnly: true }))}
                className={cn(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  filters.showMatterhornOnly
                    ? 'bg-primary-100 text-primary-700 border border-primary-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                )}
                title="Includes MATTERHORN-, TABLE-, ALT-TEXT-, LIST-, and related codes"
              >
                Matterhorn-Related ({matterhornIssueCount})
              </button>
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
                  aria-label="Filter by severity"
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
                    if (val === '') {
                      setFilters((prev) => ({ ...prev, pageNumber: 'all' }));
                    } else {
                      const parsed = parseInt(val, 10);
                      // Validate range instead of checking isInteger (parseInt always returns integers)
                      if (!isNaN(parsed) && parsed >= 1 && parsed <= auditResult.pageCount) {
                        setFilters((prev) => ({ ...prev, pageNumber: parsed }));
                      }
                      // If invalid, keep the previous value by not calling setFilters
                    }
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
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
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
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
