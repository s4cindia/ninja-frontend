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
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Loader2, Download, Share2, RotateCw, Filter, X, ChevronDown, ListChecks, Maximize2, Minimize2, Zap, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, CardContent } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { MatterhornSummary } from '@/components/pdf/MatterhornSummary';
import { PacReportModal } from '@/components/pdf/PacReportModal';
import { PdfPageNavigator } from '@/components/pdf/PdfPageNavigator';
import { PdfPreviewPanel } from '@/components/pdf/PdfPreviewPanel';
import { PdfStatsCards } from '@/components/pdf/PdfStatsCards';
import { RemediationChecklist } from '@/components/pdf/RemediationChecklist';
import { ManualRemediationTimeLog } from '@/components/pdf/ManualRemediationTimeLog';
import type { GuidanceAcknowledgment } from '@/components/pdf/RemediationChecklist';
import { IssueCard, AiAnalysis } from '@/components/remediation/IssueCard';
import { ApplyAllSuggestionsPanel } from '@/components/remediation/ApplyAllSuggestionsPanel';
import { useRemediationTimer } from '@/hooks/useRemediationTimer';
import { triggerAiAnalysis } from '@/services/api/pdfAiAnalysis.service';
import type { ApplyAllAiSuggestionsResult } from '@/services/api/pdfAiAnalysis.service';
import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth.store';

/**
 * Maps backend issue category/code fields to Matterhorn category IDs used in the UI filter.
 * Backend issues don't populate matterhornCheckpoint directly, so we derive it here.
 */
const CATEGORY_TO_MATTERHORN: Record<string, string> = {
  // Structure validator categories
  structure: '01',
  metadata: '07',
  language: '16',
  headings: '06',
  'reading-order': '09',
  lists: '04',
  tables: '11',
  // Table validator categories
  'table-structure': '11',
  'table-headers': '11',
  'table-summary': '11',
  'layout-table': '11',
  // Alt-text validator categories
  'alt-text': '13',
};

/** Derive Matterhorn category ID from an issue, regardless of which field is populated. */
function getIssueCheckpoint(issue: PdfAuditIssue & { category?: string; code?: string }): string | undefined {
  if (issue.matterhornCheckpoint) return issue.matterhornCheckpoint;
  if (issue.category && CATEGORY_TO_MATTERHORN[issue.category]) return CATEGORY_TO_MATTERHORN[issue.category];
  // Fallback: extract from code like "MATTERHORN-11-001" → "11"
  const code = issue.code || issue.ruleId || '';
  const match = code.match(/^MATTERHORN-(\d{2})-/);
  if (match) return match[1];
  return undefined;
}

const CATEGORY_LABELS: Record<string, string> = {
  structure: 'Structure',
  metadata: 'Metadata',
  language: 'Language',
  headings: 'Headings',
  'reading-order': 'Reading Order',
  lists: 'Lists',
  tables: 'Tables',
  'alt-text': 'Alt Text',
  contrast: 'Contrast',
  links: 'Links',
  forms: 'Forms',
  bookmarks: 'Bookmarks',
  formula: 'Formula',
};
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS);
const TABLE_SUBCATEGORIES = new Set(['table-structure', 'table-headers', 'table-summary', 'layout-table']);
function normalizeCategory(category: string | undefined): string | undefined {
  if (!category) return undefined;
  return TABLE_SUBCATEGORIES.has(category) ? 'tables' : category;
}
import { cn } from '@/utils/cn';
import { validateJobId } from '@/utils/validation';
import { useCreateRemediationPlan } from '@/hooks/usePdfRemediation';
import type { PdfAuditResult, PdfAuditIssue } from '@/types/pdf.types';
import type { IssueSeverity } from '@/types/accessibility.types';
import type { ScanLevel } from '@/types/scan-level.types';

// Filter state interface
interface IssueFilters {
  severity: IssueSeverity | 'all';
  wcagCriterion: string | 'all';
  matterhornCategory: string | 'all';
  categories: Set<string>;
  aiAction: 'all' | 'fixable' | 'guidance-only' | 'applied' | 'rejected';
  pageNumber: number | 'all';
  searchText: string;
  showMatterhornOnly: boolean;
}

const initialFilters: IssueFilters = {
  severity: 'all',
  wcagCriterion: 'all',
  matterhornCategory: 'all',
  categories: new Set<string>(),
  aiAction: 'all',
  pageNumber: 'all',
  searchText: '',
  showMatterhornOnly: false,
};

// Type guard for ScanLevel validation
const isScanLevel = (value: unknown): value is ScanLevel => {
  return typeof value === 'string' && ['basic', 'comprehensive', 'custom'].includes(value);
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

// ISO 8601 timestamps sort lexicographically in chronological order, so this
// avoids needing to parse dates just to find the most recent one.
function latestTimestamp(...timestamps: Array<string | null | undefined>): string | undefined {
  return timestamps.filter((t): t is string => !!t).sort().pop();
}

// Constants
const POLLING_INTERVAL_MS = 5000; // Poll every 5 seconds

export const PdfAuditResultsPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Only present when the operator arrived via a Comparison Study trial —
  // gates the remediation timer so regular remediation visits don't pay the
  // idle-listener/session overhead they're not part of.
  const comparisonTrialId = searchParams.get('comparisonTrialId');
  const { recordApplied, recordSuggestionDecision, recordBulkApply } = useRemediationTimer(
    comparisonTrialId ? jobId : undefined
  );
  const currentUser = useAuthStore(state => state.user);

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
  const [isDownloading] = useState(false);
  const [isReScanning, setIsReScanning] = useState(false);
  const [currentScanLevel, setCurrentScanLevel] = useState<ScanLevel>('basic');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // AI analysis state
  const [aiSuggestions, setAiSuggestions] = useState<Map<string, AiAnalysis>>(new Map());
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiProgress, setAiProgress] = useState<{ analyzed: number; total: number } | null>(null);
  const [isRerunningAiAnalysis, setIsRerunningAiAnalysis] = useState(false);
  // isAnalyzingAi starts false and only reflects reality once the initial
  // fetchAiSuggestions() call resolves — without this, Re-run AI Analysis is
  // clickable during that brief loading window even if analysis is already
  // running server-side (e.g. the very first pass, still in flight).
  const [hasLoadedAiStatus, setHasLoadedAiStatus] = useState(false);
  // Session-only — resets on reload/revisit, never persisted server-side
  // (an explicit, deliberate scope limit: no per-tenant sticky preference).
  const [includeColorContrastFix, setIncludeColorContrastFix] = useState(false);
  const [aiStats, setAiStats] = useState<{
    gemini: { totalTokens: number; estimatedCostUsd: number };
    claude: { totalTokens: number; estimatedCostUsd: number };
    totalTokens: number;
    totalCostUsd: number;
    analyzedAt?: string;
  } | null>(null);
  const aiPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTagPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoTagFetchedJobRef = useRef<string | null>(null);

  // Auto-tag status state
  const [autoTagInfo, setAutoTagInfo] = useState<{
    status?: string;
    hasTaggingReport?: boolean;
    hasWordExport?: boolean;
    elementCounts?: Record<string, number> | null;
    adobeFlags?: Array<{ elementType?: string; page?: number; confidence?: string; reviewComment?: string }>;
    postRemediationStatus?: 'pending' | 'complete' | 'failed';
    postRemediationAudit?: { runAt: string; resolved: number; remaining: number; regressions: number; resolutionRate: number };
    postRemediationProgress?: {
      currentPage?: number;
      totalPages?: number;
      completedValidators?: number;
      totalValidators?: number;
      currentValidator?: string;
      updatedAt?: string;
    };
    structureTreeCompleteness?: { totalElements: number; semanticElements: number; isEmptyShell: boolean } | null;
    retagOutcome?: 'success' | 'failed-strip-bailed' | 'failed-retag-error' | null;
    comparisonTrialId?: string | null;
    manualRemediationLastLoggedAt?: string | null;
  } | null>(null);
  // Tracked independently of autoTagInfo (not nested inside it) so a
  // just-submitted total is never lost: it can be set before autoTagInfo's
  // first fetch resolves (prev would otherwise be null), and reconciled via
  // Math.max against every subsequent /auto-tag/status response — for a
  // given job the total only ever grows, so the max of any two reads is
  // always the true value, with no risk of a slower in-flight GET stomping
  // a fresher submission. Explicitly reset on jobId change (below) since,
  // unlike this page's other per-job state (which self-corrects via plain
  // overwrite on the next fetch), Math.max would otherwise let a previous
  // job's leftover total incorrectly clamp a new job's lower one.
  const [manualRemediationMs, setManualRemediationMs] = useState(0);
  useEffect(() => {
    setManualRemediationMs(0);
  }, [jobId]);
  const [isRetryingAutoTag, setIsRetryingAutoTag] = useState(false);
  const [isReRunningAudit, setIsReRunningAudit] = useState(false);
  const [showPacReport, setShowPacReport] = useState(false);
  const [showApplyAllPanel, setShowApplyAllPanel] = useState(false);

  // Guided remediation checklist state — aiAnalysisStatus/guidanceAcknowledgment
  // ride on the existing AI-analysis fetch; jobFlags needs one extra lookup
  // since acrGenerated/pacReportGenerated/lastReauditAt only live on job.output.
  const [aiAnalysisStatus, setAiAnalysisStatus] = useState<string | null>(null);
  const [guidanceAcknowledgment, setGuidanceAcknowledgment] = useState<GuidanceAcknowledgment | null>(null);
  const [jobFlags, setJobFlags] = useState<{ acrGenerated: boolean; pacReportGenerated: boolean; lastReauditAt?: string } | null>(null);
  const jobFlagsFetchedRef = useRef<string | null>(null);

  // Counts driving the "Apply All Approved" bulk action — only apply-to-pdf
  // suggestions are eligible; guidance-only/auto-resolve ones have nothing to apply.
  const eligibleForApplyAll = useMemo(
    () => Array.from(aiSuggestions.values())
      .filter(s => s.applyMode === 'apply-to-pdf' && s.status === 'approved').length,
    [aiSuggestions]
  );
  const pendingEligible = useMemo(
    () => Array.from(aiSuggestions.values())
      .filter(s => s.applyMode === 'apply-to-pdf' && s.status === 'pending').length,
    [aiSuggestions]
  );

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
      const resultData = data as PdfAuditResult & { scanLevel?: string };
      setCurrentScanLevel(isScanLevel(resultData.scanLevel) ? resultData.scanLevel : 'basic');
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

  // Compute global sequential issue numbers — stable across filter changes
  // Order: page ascending → severity weight descending → original array index
  const issueNumberMap = useMemo(() => {
    if (!auditResult || !auditResult.issues) return new Map<string, number>();
    const SEVERITY_WEIGHT: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 };
    const sorted = auditResult.issues
      .map((issue, originalIndex) => ({ issue, originalIndex }))
      .sort((a, b) => {
        const pageDiff = (a.issue.pageNumber ?? 0) - (b.issue.pageNumber ?? 0);
        if (pageDiff !== 0) return pageDiff;
        const weightDiff = (SEVERITY_WEIGHT[b.issue.severity] ?? 0) - (SEVERITY_WEIGHT[a.issue.severity] ?? 0);
        if (weightDiff !== 0) return weightDiff;
        return a.originalIndex - b.originalIndex;
      });
    const map = new Map<string, number>();
    sorted.forEach(({ issue }, idx) => map.set(issue.id, idx + 1));
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
      issues = issues.filter((issue) => {
        const checkpoint = getIssueCheckpoint(issue as PdfAuditIssue & { category?: string; code?: string });
        return checkpoint?.startsWith(filters.matterhornCategory);
      });
    }

    // Filter by category (multi-select)
    if (filters.categories.size > 0) {
      issues = issues.filter((issue) => {
        const category = normalizeCategory((issue as PdfAuditIssue & { category?: string }).category);
        return category ? filters.categories.has(category) : false;
      });
    }

    // Filter by AI action
    if (filters.aiAction !== 'all') {
      issues = issues.filter((issue) => {
        const suggestion = aiSuggestions.get(issue.id);
        switch (filters.aiAction) {
          case 'fixable':
            return suggestion?.applyMode === 'apply-to-pdf' &&
              (suggestion.status === 'pending' || suggestion.status === 'approved');
          case 'guidance-only':
            return suggestion?.applyMode === 'guidance-only';
          case 'applied':
            return suggestion?.status === 'applied';
          case 'rejected':
            return suggestion?.status === 'rejected';
          default:
            return true;
        }
      });
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
        const issueWithCode = issue as typeof issue & { code?: string };
        const code = (issueWithCode.code || issue.ruleId || '').toUpperCase();
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
  }, [auditResult, filters, aiSuggestions]);

  // Count Matterhorn-related issues
  // Includes issues with explicit MATTERHORN codes and related codes that map to Matterhorn checkpoints
  const matterhornIssueCount = useMemo(() => {
    if (!auditResult || !auditResult.issues) return 0;
    return auditResult.issues.filter(
      (issue) => {
        const issueWithCode = issue as typeof issue & { code?: string };
        const code = (issueWithCode.code || issue.ruleId || '').toUpperCase();
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

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    if (!auditResult?.issues) return counts;
    for (const issue of auditResult.issues) {
      const category = normalizeCategory((issue as PdfAuditIssue & { category?: string }).category);
      if (!category) continue;
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return counts;
  }, [auditResult]);

  // Mirrors the "fixable" definition used in the filteredIssues filter logic
  // below — keep both in sync if that logic ever changes.
  const aiActionCounts = useMemo(() => {
    let fixable = 0, guidanceOnly = 0, applied = 0, rejected = 0;
    for (const suggestion of aiSuggestions.values()) {
      if (suggestion.applyMode === 'apply-to-pdf' && (suggestion.status === 'pending' || suggestion.status === 'approved')) {
        fixable++;
      }
      if (suggestion.applyMode === 'guidance-only') guidanceOnly++;
      if (suggestion.status === 'applied') applied++;
      if (suggestion.status === 'rejected') rejected++;
    }
    return { fixable, guidanceOnly, applied, rejected };
  }, [aiSuggestions]);

  // Handlers
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const scrollToIssueCard = useCallback((issueId: string) => {
    document.getElementById(`issue-card-${issueId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, []);

  const handleIssueSelect = useCallback((issue: PdfAuditIssue) => {
    setSelectedIssueId(issue.id);
    if (issue.pageNumber && issue.pageNumber !== currentPage) {
      setCurrentPage(issue.pageNumber);
    }
    scrollToIssueCard(issue.id);
  }, [currentPage, scrollToIssueCard]);

  const handlePageClick = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    // Select first issue on that page
    const pageIssues = issuesByPage.get(pageNumber);
    if (pageIssues && pageIssues.length > 0) {
      setSelectedIssueId(pageIssues[0].id);
    }
  }, [issuesByPage]);

  const handleViewAutoTagReport = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await api.get(`/pdf/${encodeURIComponent(jobId)}/auto-tag/report`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data as Blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      toast.error('Failed to open report');
    }
  }, [jobId]);

  const handleMatterhornCheckpointClick = useCallback((checkpointId: string) => {
    // Filter to show issues for this checkpoint
    setFilters((prev) => ({
      ...prev,
      matterhornCategory: checkpointId.substring(0, 2), // Extract category (e.g., "01" from "01-003")
    }));
    setShowFilters(true);
  }, []);

  // Fetch AI suggestions and update state
  const fetchAiSuggestions = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await api.get<{
        data: {
          suggestions: AiAnalysis[];
          analyzed: number;
          total: number;
          status: string;
          stats?: {
            gemini: { totalTokens: number; estimatedCostUsd: number };
            claude: { totalTokens: number; estimatedCostUsd: number };
            totalTokens: number;
            totalCostUsd: number;
            analyzedAt?: string;
          } | null;
          guidanceAcknowledgment?: GuidanceAcknowledgment | null;
        };
      }>(`/pdf/${encodeURIComponent(jobId)}/ai-analysis`);
      const { suggestions, analyzed, total, status, stats, guidanceAcknowledgment: ack } = res.data.data;
      const map = new Map<string, AiAnalysis>();
      suggestions.forEach((s) => map.set(s.issueId, s));
      // DEBUG: log to help diagnose ID matching
      if (suggestions.length > 0) {
        console.log('[AI Debug] map size:', map.size, 'status:', status);
        console.log('[AI Debug] sample issueIds:', suggestions.slice(0, 5).map(s => s.issueId));
      }
      if (isMountedRef.current) {
        setAiSuggestions(map);
        setAiProgress({ analyzed, total });
        setAiAnalysisStatus(status);
        setGuidanceAcknowledgment(ack ?? null);
        setHasLoadedAiStatus(true);
        if (stats) setAiStats(stats);
        if (status === 'complete') {
          setIsAnalyzingAi(false);
          if (aiPollingRef.current) {
            clearInterval(aiPollingRef.current);
            aiPollingRef.current = null;
          }
        } else if (status === 'error' || status === 'failed') {
          // Terminal failure — stop polling so we don't loop forever
          setIsAnalyzingAi(false);
          if (aiPollingRef.current) {
            clearInterval(aiPollingRef.current);
            aiPollingRef.current = null;
          }
        } else if ((status === 'processing' || status === 'pending') && !aiPollingRef.current) {
          // AI analysis is queued ('pending') or running ('processing') in the
          // background — start polling so suggestions appear without a manual refresh.
          setIsAnalyzingAi(true);
          aiPollingRef.current = setInterval(fetchAiSuggestions, 3000);
        }
      }
    } catch {
      // Non-fatal — silently ignore fetch errors during polling, but still
      // unblock the button rather than leaving it disabled forever on a
      // transient failure of the initial load.
      if (isMountedRef.current) setHasLoadedAiStatus(true);
    }
  }, [jobId]);

  const handleRerunAiAnalysis = useCallback(async () => {
    if (!jobId) return;
    setIsRerunningAiAnalysis(true);
    try {
      await triggerAiAnalysis(jobId, includeColorContrastFix ? { colorContrastMode: 'apply-to-pdf' } : undefined);
      toast.success(includeColorContrastFix ? 'Re-running AI analysis with color-contrast auto-fix…' : 'Re-running AI analysis…');
      setIsAnalyzingAi(true);
      if (!aiPollingRef.current) {
        aiPollingRef.current = setInterval(fetchAiSuggestions, 3000);
      }
    } catch {
      toast.error('Failed to start AI re-analysis');
    } finally {
      setIsRerunningAiAnalysis(false);
    }
  }, [jobId, includeColorContrastFix, fetchAiSuggestions]);

  // Load existing AI suggestions on mount (in case analysis was already run)
  useEffect(() => {
    if (jobId && auditResult) {
      fetchAiSuggestions();
    }
  }, [jobId, auditResult, fetchAiSuggestions]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      if (aiPollingRef.current) clearInterval(aiPollingRef.current);
      if (autoTagPollRef.current) clearInterval(autoTagPollRef.current);
    };
  }, []);

  // Merge a terminal auto-tag outcome into auditResult so the header badge
  // reflects the latest result. Skipped while status is 'processing' so the
  // badge keeps showing the previous outcome instead of flickering away
  // mid-retry (the stats card already shows a dedicated in-progress state).
  const applyAutoTagStatus = useCallback((info: {
    status?: string;
    taggerSource?: string | null;
    error?: string | null;
    skipReason?: string | null;
  } | undefined) => {
    if (!info || info.status === 'processing') return;
    setAuditResult(prev => prev ? {
      ...prev,
      autoTagStatus: (info.status as PdfAuditResult['autoTagStatus']) ?? prev.autoTagStatus,
      taggerSource: (info.taggerSource as PdfAuditResult['taggerSource']) ?? prev.taggerSource,
      autoTagError: info.error ?? prev.autoTagError,
      autoTagSkipReason: (info.skipReason as PdfAuditResult['autoTagSkipReason']) ?? prev.autoTagSkipReason,
    } : prev);
  }, []);

  // Fetch auto-tag status after audit result loads
  useEffect(() => {
    if (!jobId || !auditResult || autoTagFetchedJobRef.current === jobId) return;
    autoTagFetchedJobRef.current = jobId;
    api.get(`/pdf/${encodeURIComponent(jobId)}/auto-tag/status`)
      .then(res => {
        if (!isMountedRef.current) return;
        const info = res.data.data;
        setAutoTagInfo(info);
        applyAutoTagStatus(info);
        setManualRemediationMs(prev => Math.max(prev, info?.manualRemediationMs ?? 0));
      })
      .catch(() => {
        autoTagFetchedJobRef.current = null; // allow retry if the fetch itself failed
      });
  }, [jobId, auditResult, applyAutoTagStatus]);

  // Whether ACR/PAC have already been generated for this job, plus the
  // last manual re-audit time — all three live on job.output, which no
  // endpoint this page otherwise calls exposes, so this is one extra lookup
  // against the existing GET /jobs/:id route (not a new backend endpoint,
  // just a new call site). Re-called after a manual re-audit succeeds (see
  // handleReRunAuditForCurrentJob) so lastReauditAt doesn't go stale — that
  // manual path never touches postRemediationStatus/postRemediationAudit,
  // so it's otherwise the only signal that a fresh re-audit just happened.
  const fetchJobFlags = useCallback(async () => {
    if (!jobId) return;
    try {
      const res = await api.get(`/jobs/${encodeURIComponent(jobId)}`);
      if (!isMountedRef.current) return;
      const output = (res.data.data?.output ?? {}) as Record<string, unknown>;
      setJobFlags({
        acrGenerated: output.acrGenerated === true,
        pacReportGenerated: output.pacReportGenerated === true,
        lastReauditAt: output.lastReauditAt as string | undefined,
      });
    } catch {
      jobFlagsFetchedRef.current = null; // allow retry if the fetch itself failed
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !auditResult || jobFlagsFetchedRef.current === jobId) return;
    jobFlagsFetchedRef.current = jobId;
    fetchJobFlags();
  }, [jobId, auditResult, fetchJobFlags]);

  const handleRetryAutoTag = async () => {
    if (!jobId || isRetryingAutoTag) return;
    setIsRetryingAutoTag(true);
    try {
      await api.post(`/pdf/${encodeURIComponent(jobId)}/auto-tag`);
      setAutoTagInfo(prev => ({ ...prev, status: 'processing' }));
      toast.success('Auto-tagging started — this may take a minute');
      // Poll status every 5s until complete; track in a ref so it can be cleared
      // on unmount and so state updates are guarded against late firings.
      if (autoTagPollRef.current) clearInterval(autoTagPollRef.current);
      autoTagPollRef.current = setInterval(async () => {
        try {
          const res = await api.get(`/pdf/${encodeURIComponent(jobId)}/auto-tag/status`);
          const info = res.data.data;
          if (isMountedRef.current) {
            setAutoTagInfo(info);
            applyAutoTagStatus(info);
            setManualRemediationMs(prev => Math.max(prev, info?.manualRemediationMs ?? 0));
          }
          if (info?.status === 'complete' || info?.status === 'failed') {
            if (autoTagPollRef.current) {
              clearInterval(autoTagPollRef.current);
              autoTagPollRef.current = null;
            }
            if (isMountedRef.current) setIsRetryingAutoTag(false);
          }
        } catch {
          if (autoTagPollRef.current) {
            clearInterval(autoTagPollRef.current);
            autoTagPollRef.current = null;
          }
          if (isMountedRef.current) setIsRetryingAutoTag(false);
        }
      }, 5000);
    } catch (err) {
      setIsRetryingAutoTag(false);
      toast.error(err instanceof Error ? err.message : 'Failed to start auto-tag');
    }
  };

  const handleReRunAuditForCurrentJob = async () => {
    if (!jobId || isReRunningAudit) return;
    setIsReRunningAudit(true);
    try {
      await api.post(`/pdf/${encodeURIComponent(jobId)}/remediation/re-audit-current`);
      toast.success('Audit re-run complete');
      await fetchAuditResult();
      await fetchJobFlags();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to re-run audit');
    } finally {
      setIsReRunningAudit(false);
    }
  };

  // Apply-all kicks off an automatic post-fix validation audit server-side.
  // Reflect that immediately so the existing "Validating…" state (Generate ACR
  // button, PdfStatsCards post-fix validation card) shows right away, then poll
  // until the backend reports a terminal outcome.
  const pollPostRemediationStatus = useCallback(() => {
    if (!jobId) return;
    if (autoTagPollRef.current) clearInterval(autoTagPollRef.current);
    setAutoTagInfo(prev => prev ? { ...prev, postRemediationStatus: 'pending', postRemediationProgress: undefined } : prev);
    autoTagPollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/pdf/${encodeURIComponent(jobId)}/auto-tag/status`);
        const info = res.data.data;
        if (isMountedRef.current) {
          setAutoTagInfo(info);
          setManualRemediationMs(prev => Math.max(prev, info?.manualRemediationMs ?? 0));
        }
        if (info?.postRemediationStatus !== 'pending') {
          if (autoTagPollRef.current) {
            clearInterval(autoTagPollRef.current);
            autoTagPollRef.current = null;
          }
          if (isMountedRef.current && info?.postRemediationStatus === 'complete') {
            fetchAuditResult();
          }
        }
      } catch {
        if (autoTagPollRef.current) {
          clearInterval(autoTagPollRef.current);
          autoTagPollRef.current = null;
        }
      }
    }, 5000);
  }, [jobId, fetchAuditResult]);

  // After a successful bulk apply, refetch suggestions from the server instead
  // of patching aiSuggestions locally — apply-all's response only carries
  // aggregate counts, not which issues succeeded.
  const handleApplyAllSuccess = useCallback((result: ApplyAllAiSuggestionsResult) => {
    fetchAiSuggestions();
    pollPostRemediationStatus();
    recordBulkApply(result.applied);
  }, [fetchAiSuggestions, pollPostRemediationStatus, recordBulkApply]);

  const handleDownloadReport = (_format: 'pdf' | 'docx' | 'json' = 'json') => {
    if (!auditResult || !jobId) return;
    const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf-audit-report-${jobId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReturnToUpload = () => {
    navigate('/pdf');
  };

  const [isDownloadingRemediated, setIsDownloadingRemediated] = useState(false);
  const handleDownloadRemediatedPdf = async () => {
    if (!jobId || !auditResult) return;
    setIsDownloadingRemediated(true);
    try {
      const response = await api.get(`/pdf/${encodeURIComponent(jobId)}/remediation/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(response.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = auditResult.fileName.replace(/\.pdf$/i, '_remediated.pdf');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Download started');
    } catch {
      toast.error('Remediated PDF not available — apply at least one AI fix first');
    } finally {
      setIsDownloadingRemediated(false);
    }
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

  const hasActiveFilters =
    filters.severity !== 'all' ||
    filters.wcagCriterion !== 'all' ||
    filters.matterhornCategory !== 'all' ||
    filters.categories.size > 0 ||
    filters.aiAction !== 'all' ||
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
        <Button variant="primary" onClick={handleReturnToUpload} className="mt-4">
          Return to Upload
        </Button>
      </div>
    );
  }

  // Generate PDF URL using API service configuration
  const pdfUrl = `${api.defaults.baseURL}/pdf/job/${encodeURIComponent(jobId!)}/file`;

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
                    {auditResult.autoTagStatus === 'complete' && auditResult.taggerSource && (
                      <Badge variant="info" className="ml-2">
                        Auto-tagged: {auditResult.taggerSource === 'seam-c' ? 'Seam-C (YOLO)' : 'Adobe AutoTag'}
                      </Badge>
                    )}
                    {auditResult.autoTagStatus === 'skipped' && auditResult.autoTagSkipReason === 'already-tagged' && (
                      <Badge variant="info" className="ml-2">
                        Already tagged
                      </Badge>
                    )}
                    {auditResult.autoTagStatus === 'failed' && (
                      <Badge variant="error" className="ml-2" title={auditResult.autoTagError ?? undefined}>
                        Auto-tag failed
                        {auditResult.autoTagError && (
                          <span className="sr-only"> — {auditResult.autoTagError}</span>
                        )}
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
          <div className="flex items-center flex-wrap gap-2 mt-4">
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
            {Array.from(aiSuggestions.values()).some(s => s.status === 'applied') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadRemediatedPdf}
                disabled={isDownloadingRemediated}
              >
                {isDownloadingRemediated
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Downloading…</>
                  : <><Download className="h-4 w-4 mr-1" />Download AI-Fixed PDF</>
                }
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleShareResults}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button variant="outline" size="sm" onClick={handleReRunAuditForCurrentJob} disabled={isReRunningAudit}>
              {isReRunningAudit
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Re-running…</>
                : <><RotateCw className="h-4 w-4 mr-1" />Re-run Audit</>
              }
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRerunAiAnalysis}
                disabled={isRerunningAiAnalysis || isAnalyzingAi || !hasLoadedAiStatus}
                title={!hasLoadedAiStatus ? 'Loading AI analysis status…' : isAnalyzingAi ? 'AI analysis is already running' : undefined}
              >
                {isRerunningAiAnalysis
                  ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Re-running…</>
                  : <><Sparkles className="h-4 w-4 mr-1" />Re-run AI Analysis</>
                }
              </Button>
              {/* A <div>, not <label> — <label> would auto-forward its click to the
                  nested Checkbox <button> (buttons are labelable elements), which
                  combined with this span's own onClick would double-toggle. */}
              <div className="flex items-center gap-1.5 text-xs text-gray-600 select-none">
                <Checkbox
                  checked={includeColorContrastFix}
                  onChange={setIncludeColorContrastFix}
                  aria-label="Include color-contrast auto-fix on re-run"
                />
                <span
                  className="cursor-pointer"
                  onClick={() => setIncludeColorContrastFix(v => !v)}
                  title="When checked, the system attempts to locate each contrast issue's text run on the page and, if confidently found, offers a real Apply-to-PDF fix instead of guidance only. Issues it can't confidently locate still fall back to guidance-only either way."
                >
                  Include color-contrast auto-fix
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/acr/workflow?jobId=${jobId}&jobType=PDF_ACCESSIBILITY`)}
              disabled={autoTagInfo?.postRemediationStatus === 'pending'}
              title={autoTagInfo?.postRemediationStatus === 'pending' ? 'Validating fixes — please wait…' : undefined}
            >
              {autoTagInfo?.postRemediationStatus === 'pending'
                ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Validating…</>
                : <><FileText className="h-4 w-4 mr-1" />Generate ACR</>
              }
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPacReport(true)}
            >
              <FileText className="h-4 w-4 mr-1" />
              PAC Report
            </Button>
          </div>

        </div>
      </div>

      <PdfStatsCards
        autoTagInfo={autoTagInfo}
        auditResult={auditResult}
        aiSuggestions={aiSuggestions}
        aiStats={aiStats}
        matterhornIssueCount={matterhornIssueCount}
        isAnalyzingAi={isAnalyzingAi}
        aiProgress={aiProgress}
        onViewAutoTagReport={handleViewAutoTagReport}
        onRetryAutoTag={handleRetryAutoTag}
        isRetryingAutoTag={isRetryingAutoTag}
        jobId={jobId!}
      />

      <RemediationChecklist
        jobId={jobId!}
        aiAnalysisStatus={aiAnalysisStatus}
        aiSuggestions={aiSuggestions}
        guidanceAcknowledgment={guidanceAcknowledgment}
        onGuidanceAcknowledged={setGuidanceAcknowledgment}
        postRemediationStatus={autoTagInfo?.postRemediationStatus}
        lastVerifiedAt={latestTimestamp(autoTagInfo?.postRemediationAudit?.runAt, jobFlags?.lastReauditAt)}
        aiAnalyzedAt={aiStats?.analyzedAt}
        manualRemediationLastLoggedAt={autoTagInfo?.manualRemediationLastLoggedAt}
        acrGenerated={jobFlags?.acrGenerated ?? false}
        pacReportGenerated={jobFlags?.pacReportGenerated ?? false}
        comparisonTrialId={autoTagInfo?.comparisonTrialId}
        userRole={currentUser?.role}
      />

      <ManualRemediationTimeLog
        jobId={jobId!}
        manualRemediationMs={manualRemediationMs}
        onLogged={(totalMs) => setManualRemediationMs(prev => Math.max(prev, totalMs))}
      />

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


      {/* Three-column layout */}
      <div className={isFullscreen ? 'fixed inset-0 z-50 flex flex-col bg-white' : 'flex h-[calc(100vh-320px)]'}>
        {/* Fullscreen toolbar */}
        {isFullscreen && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white shrink-0">
            <span className="text-sm font-medium text-gray-700">
              {auditResult.fileName} — {auditResult.issues.length} issues
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
              Exit full screen
            </button>
          </div>
        )}
        <div className={isFullscreen ? 'flex flex-1 overflow-hidden' : 'flex h-full w-full'}>
        {/* Left: Page Navigator */}
        <div className="w-64 border-r border-gray-200 bg-white overflow-hidden">
          <PdfPageNavigator
            pageCount={auditResult.pageCount}
            currentPage={currentPage}
            issuesByPage={issuesByPage}
            onPageChange={handlePageChange}
            pageLabels={auditResult.metadata?.pageLabels}
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
            issueNumberMap={issueNumberMap}
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  title={isFullscreen ? 'Exit full screen' : 'Full screen'}
                  onClick={() => setIsFullscreen((v) => !v)}
                  className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              {(eligibleForApplyAll + pendingEligible) > 0 && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowApplyAllPanel(true)}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Apply Fixes ({eligibleForApplyAll + pendingEligible})
                </Button>
              )}
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

            {/* Category filter chips */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-gray-600 mr-1">Category:</span>
              {CATEGORY_ORDER.map((cat) => {
                const count = categoryCounts.get(cat) ?? 0;
                if (count === 0) return null;
                const selected = filters.categories.has(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => {
                        const next = new Set(prev.categories);
                        if (next.has(cat)) next.delete(cat);
                        else next.add(cat);
                        return { ...prev, categories: next };
                      })
                    }
                    className={cn(
                      'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                      selected
                        ? 'bg-primary-100 text-primary-700 border-primary-300'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    {CATEGORY_LABELS[cat] ?? cat} ({count})
                  </button>
                );
              })}
              {filters.categories.size > 0 && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, categories: new Set() }))}
                  className="text-xs text-gray-500 hover:text-gray-700 underline"
                >
                  Clear categories
                </button>
              )}
              {filters.matterhornCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                  Checkpoint {filters.matterhornCategory}
                  <button
                    type="button"
                    onClick={() => setFilters((prev) => ({ ...prev, matterhornCategory: 'all' }))}
                    className="hover:text-blue-900"
                    aria-label={`Clear checkpoint ${filters.matterhornCategory} filter`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
            </div>

            {/* AI action filter */}
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="text-sm text-gray-600 mr-1">AI:</span>
              {(
                [
                  ['all', 'All', aiSuggestions.size],
                  ['fixable', 'Fixable now', aiActionCounts.fixable],
                  ['guidance-only', 'Guidance only', aiActionCounts.guidanceOnly],
                  ['applied', 'Applied', aiActionCounts.applied],
                  ['rejected', 'Rejected', aiActionCounts.rejected],
                ] as const
              ).map(([value, label, count]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, aiAction: value }))}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium rounded-full border transition-colors',
                    filters.aiAction === value
                      ? value === 'fixable'
                        ? 'bg-green-100 text-green-800 border-green-300'
                        : 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {label} ({count})
                </button>
              ))}
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
              <>
                {/* DEBUG: one-time log when aiSuggestions has data */}
                {aiSuggestions.size > 0 && filteredIssues.length > 0 && (() => {
                  console.log('[AI Debug] map size:', aiSuggestions.size);
                  console.log('[AI Debug] issue ids (first 5):', filteredIssues.slice(0, 5).map(i => i.id));
                  console.log('[AI Debug] map lookup result (first 5):', filteredIssues.slice(0, 5).map(i => aiSuggestions.get(i.id)?.suggestionType ?? 'MISS'));
                  return null;
                })()}
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    jobId={jobId}
                    onPageClick={handlePageClick}
                    showMatterhorn={true}
                    pageLabels={auditResult.metadata?.pageLabels}
                    aiSuggestion={aiSuggestions.get(issue.id)}
                    issueNumber={issueNumberMap.get(issue.id)}
                    onClick={() => handleIssueSelect(issue)}
                    recordApplied={recordApplied}
                    recordSuggestionDecision={recordSuggestionDecision}
                    onAiSuggestionChange={(updated) => {
                      setAiSuggestions((prev) => {
                        const next = new Map(prev);
                        next.set(updated.issueId, updated);
                        return next;
                      });
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
        </div> {/* inner flex row */}
      </div>

      <Dialog open={showApplyAllPanel} onOpenChange={setShowApplyAllPanel}>
        <DialogContent className="max-w-lg">
          <ApplyAllSuggestionsPanel
            jobId={jobId!}
            eligibleCount={eligibleForApplyAll}
            pendingEligibleCount={pendingEligible}
            onApplied={handleApplyAllSuccess}
            onClose={() => setShowApplyAllPanel(false)}
          />
        </DialogContent>
      </Dialog>

      <PacReportModal
        isOpen={showPacReport}
        onClose={() => setShowPacReport(false)}
        jobId={jobId!}
        onGenerated={() => setJobFlags(prev => ({ acrGenerated: prev?.acrGenerated ?? false, pacReportGenerated: true, lastReauditAt: prev?.lastReauditAt }))}
      />
    </div>
  );
};
