import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, AlertTriangle, Info, CheckCircle,
  Wrench, Hand, FileDown, ClipboardList, ExternalLink, FileCheck, FileSpreadsheet,
  HelpCircle, ChevronDown, ChevronUp, Zap, User, Image as ImageIcon, Loader2, Ban, RotateCcw
} from 'lucide-react';
import { useIssueDismissals, useCreateDismissal, useDeleteDismissal } from '@/hooks/useIssueDismissals';
import { DismissIssueDialog } from '../audit';
import type { IssueDismissal } from '@/services/issue-dismissal.service';
import { api } from '@/services/api';
import { generateCSV, downloadCSV, formatDate } from '@/utils/csvExport';
import {
  buildAiAltTextExportCsv,
  buildAiAltTextExportFilename,
} from '@/lib/ai-alt-text-export';
import { altTextService } from '@/services/alt-text.service';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { QuickRating } from '../feedback';
import { SourceBadge, SummaryBySource, ViewInContextButton, RemediationGuidance, ScoreTooltip, PublisherProfileBadge, BoilerplateSuggestion, isBoilerplateCode, GroupedIssueRow, groupIssues, HeuristicMarker, isHeuristicCode, calculateScoreBreakdown } from '../audit';
import type { SummaryBySourceData, PublisherProfile } from '../audit';
import { cn } from '@/utils/cn';
import { getWcagUrl, getWcagTooltip, formatWcagLabel } from '@/utils/wcag';

type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
type IssueSource = 'js-auditor' | 'ace' | 'epubcheck' | 'manual' | 'prh-uk';
type FilterableSource = 'js-auditor' | 'ace' | 'epubcheck' | 'prh-uk';

interface AuditIssue {
  id: string;
  code: string;
  severity: Severity;
  message: string;
  location?: string;
  suggestion?: string;
  wcagCriteria?: string;
  source: IssueSource;
}

interface AuditResult {
  jobId: string;
  fileName?: string;
  fileType?: 'epub' | 'pdf';
  epubVersion?: string;
  pdfVersion?: string;
  isValid: boolean;
  accessibilityScore: number;
  issuesSummary: {
    total: number;
    critical: number;
    serious: number;
    moderate: number;
    minor: number;
  };
  issues: AuditIssue[];
  summaryBySource?: SummaryBySourceData;
  publisherProfile?: PublisherProfile | null;
  stats?: {
    byFixType?: {
      auto: number;
      quickfix: number;
      manual: number;
    };
  };
}

interface EPUBAuditResultsProps {
  result: AuditResult;
  onCreateRemediationPlan?: () => void;
  onDownloadReport?: () => void;
  isCreatingPlan?: boolean;
  isDownloading?: boolean;
}

const SEVERITY_CONFIG: Record<Severity, { 
  icon: React.ReactNode; 
  color: string; 
  bgColor: string;
  variant: 'error' | 'warning' | 'info' | 'default';
}> = {
  critical: { 
    icon: <AlertCircle className="h-4 w-4" />, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    variant: 'error',
  },
  serious: { 
    icon: <AlertTriangle className="h-4 w-4" />, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    variant: 'warning',
  },
  moderate: { 
    icon: <Info className="h-4 w-4" />, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50',
    variant: 'warning',
  },
  minor: { 
    icon: <Info className="h-4 w-4" />, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    variant: 'info',
  },
};

// Codes that the JS Auditor detects but that require user input (quick-fix or manual).
// Must stay in sync with QUICK_FIXABLE_CODES in backend/src/constants/fix-classification.ts.
const QUICK_FIX_CODES = new Set([
  'EPUB-STRUCT-002', 'EPUB-SEM-003', 'LANDMARK-UNIQUE',
  'EPUB-TYPE-HAS-MATCHING-ROLE', 'EPUB-IMG-001', 'IMG-001', 'ACE-IMG-001',
]);

const isAutoFixable = (issue: AuditIssue): boolean => {
  return issue.source === 'js-auditor' && issue.code.startsWith('EPUB-') && !QUICK_FIX_CODES.has(issue.code);
};

const getScoreColor = (score: number): string => {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-yellow-600';
  return 'text-red-600';
};

const getScoreRingColor = (score: number): string => {
  if (score >= 85) return 'stroke-green-500';
  if (score >= 70) return 'stroke-yellow-500';
  return 'stroke-red-500';
};

interface ActionButtonsProps {
  jobId: string;
  issues: AuditIssue[];
  fileName?: string;
  onCreateRemediationPlan?: () => void;
  onDownloadReport?: () => void;
  isCreatingPlan?: boolean;
  isDownloading?: boolean;
}

function ActionButtons({
  jobId,
  issues,
  fileName,
  onCreateRemediationPlan,
  onDownloadReport,
  isCreatingPlan = false,
  isDownloading = false
}: ActionButtonsProps) {
  const navigate = useNavigate();
  const [isExportingAi, setIsExportingAi] = useState(false);
  const [aiExportMessage, setAiExportMessage] = useState<
    { kind: 'success' | 'error' | 'empty'; text: string } | null
  >(null);

  const handleExportAiAltText = async () => {
    if (!jobId) return;
    setIsExportingAi(true);
    setAiExportMessage(null);
    try {
      // The review queue already carries the raw AI output (shortAlt /
      // extendedAlt — never mutated) AND the operator-final approvedAlt
      // on each record, so we don't need a new BE endpoint. We just need
      // to repackage the data into the CSV format PRH will read.
      const queue = await altTextService.getReviewQueue(jobId);
      if (queue.items.length === 0) {
        setAiExportMessage({
          kind: 'empty',
          text: 'No AI alt-text records found for this job — nothing to export.',
        });
        return;
      }
      const csv = buildAiAltTextExportCsv(queue.items);
      const filename = buildAiAltTextExportFilename(fileName);
      downloadCSV(csv, filename);
      setAiExportMessage({
        kind: 'success',
        text: `Exported ${queue.items.length} AI alt-text record${queue.items.length === 1 ? '' : 's'} to ${filename}.`,
      });
    } catch (err) {
      console.error('AI alt-text export failed:', err);
      setAiExportMessage({
        kind: 'error',
        text:
          err instanceof Error
            ? `Failed to export AI alt-text: ${err.message}`
            : 'Failed to export AI alt-text.',
      });
    } finally {
      setIsExportingAi(false);
    }
  };

  const handleDownloadIssuesCSV = () => {
    const columns = [
      { key: 'code', header: 'Code' },
      { key: 'severity', header: 'Severity' },
      { key: 'message', header: 'Message' },
      { key: 'location', header: 'Location' },
      { key: 'filePath', header: 'FilePath' },
      { key: 'wcagCriteria', header: 'WCAG Criteria' },
      { key: 'source', header: 'Source' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
    ];

    const data = issues.map(issue => ({
      code: issue.code,
      severity: issue.severity,
      message: issue.message,
      location: issue.location || '',
      filePath: (issue as unknown as Record<string, unknown>).filePath || '',
      wcagCriteria: issue.wcagCriteria || '',
      source: issue.source,
      type: isAutoFixable(issue) ? 'Auto-fixable' : 'Manual',
      status: 'Pending',
    }));

    const baseName = fileName?.replace(/\.epub$/i, '') || 'epub';
    const csvContent = generateCSV(data, columns);
    downloadCSV(csvContent, `${baseName}-issues-${formatDate(new Date())}.csv`);
  };

  const isCompliant = issues.length === 0;

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
      {isCompliant ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm font-medium">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          EPUB is fully compliant — no remediation needed
        </div>
      ) : (
        <Button
          onClick={onCreateRemediationPlan}
          disabled={isCreatingPlan}
        >
          {isCreatingPlan ? (
            <>Creating Plan...</>
          ) : (
            <>
              <ClipboardList className="h-4 w-4 mr-2" />
              Create Remediation Plan
            </>
          )}
        </Button>
      )}
      <Button 
        variant="secondary"
        onClick={() => {
          const encodedFileName = encodeURIComponent(fileName || 'Untitled Document');
          navigate(`/acr/workflow?jobId=${jobId}&fileName=${encodedFileName}`);
        }}
      >
        <FileCheck className="h-4 w-4 mr-2" />
        Generate ACR Report
      </Button>
      <Button 
        variant="outline" 
        onClick={onDownloadReport}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <>Downloading...</>
        ) : (
          <>
            <FileDown className="h-4 w-4 mr-2" />
            Download Report
          </>
        )}
      </Button>
      <Button
        variant="outline"
        onClick={handleDownloadIssuesCSV}
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        Download Issues CSV
      </Button>
      <Button
        variant="outline"
        onClick={handleExportAiAltText}
        disabled={isExportingAi || !jobId}
        title="Download a CSV of raw AI image alt text alongside any human-reviewed versions — required as a separate deliverable by the PRH UK trial."
      >
        {isExportingAi ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
        ) : (
          <ImageIcon className="h-4 w-4 mr-2" aria-hidden="true" />
        )}
        {isExportingAi ? 'Exporting…' : 'Export AI Alt-Text'}
      </Button>
      {aiExportMessage && (
        <p
          role={aiExportMessage.kind === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={cn(
            'basis-full text-xs mt-1',
            aiExportMessage.kind === 'success' && 'text-green-700',
            aiExportMessage.kind === 'empty' && 'text-gray-600',
            aiExportMessage.kind === 'error' && 'text-red-700',
          )}
        >
          {aiExportMessage.text}
        </p>
      )}
    </div>
  );
}

export const EPUBAuditResults: React.FC<EPUBAuditResultsProps> = ({
  result,
  onCreateRemediationPlan,
  onDownloadReport,
  isCreatingPlan = false,
  isDownloading = false,
}) => {
  const [activeTab, setActiveTab] = useState('all');

  // Defensive data access with fallbacks
  const jobId = result?.jobId ?? '';
  const issues = useMemo(() => result?.issues ?? [], [result?.issues]);
  const isValid = result?.isValid ?? false;
  const fileType = result?.fileType || 'epub';
  const documentVersion = fileType === 'pdf'
    ? (result?.pdfVersion ?? 'Unknown')
    : (result?.epubVersion ?? 'Unknown');
  
  // Build issuesSummary with fallbacks - compute from issues if not provided
  const issuesSummary = useMemo(() => {
    if (result?.issuesSummary?.total !== undefined) {
      return result.issuesSummary;
    }
    // Compute from issues array if issuesSummary is missing
    const critical = issues.filter(i => i.severity === 'critical').length;
    const serious = issues.filter(i => i.severity === 'serious').length;
    const moderate = issues.filter(i => i.severity === 'moderate').length;
    const minor = issues.filter(i => i.severity === 'minor').length;
    return {
      total: issues.length,
      critical,
      serious,
      moderate,
      minor,
    };
  }, [result?.issuesSummary, issues]);

  const autoFixableCount = useMemo(() => 
    issues.filter(isAutoFixable).length, 
    [issues]
  );

  const summaryBySource = useMemo((): SummaryBySourceData => {
    if (result?.summaryBySource) {
      return result.summaryBySource;
    }
    const sources: FilterableSource[] = ['epubcheck', 'ace', 'js-auditor', 'prh-uk'];
    const summary: SummaryBySourceData = {};

    for (const source of sources) {
      const sourceIssues = issues.filter(i => i.source === source);
      // js-auditor always renders (even when empty) per existing UX; the
      // others (incl. PRH UK) only render when the source produced issues.
      if (sourceIssues.length > 0 || source === 'js-auditor') {
        // Compute autoFixable per-source (not global stats)
        const autoFixable = sourceIssues.filter(isAutoFixable).length;

        summary[source] = {
          critical: sourceIssues.filter(i => i.severity === 'critical').length,
          serious: sourceIssues.filter(i => i.severity === 'serious').length,
          moderate: sourceIssues.filter(i => i.severity === 'moderate').length,
          minor: sourceIssues.filter(i => i.severity === 'minor').length,
          total: sourceIssues.length,
          ...(source === 'js-auditor' || source === 'prh-uk' ? { autoFixable } : {}),
        };
      }
    }
    return summary;
  }, [result?.summaryBySource, issues]);

  const [sourceFilter, setSourceFilter] = useState<FilterableSource | null>(null);

  // ── Dismiss workflow ─────────────────────────────────────────────────
  const [showDismissed, setShowDismissed] = useState(true);
  const { data: dismissalsData } = useIssueDismissals(jobId);
  const createDismissal = useCreateDismissal(jobId ?? '');
  const deleteDismissal = useDeleteDismissal(jobId ?? '');
  // Build a lookup: `${code}::${location}` → dismissal (V1 match by
  // code+location; sufficient because the same rule rarely fires at
  // exactly the same location with different message text).
  const dismissalsByKey = useMemo(() => {
    const map = new Map<string, IssueDismissal>();
    if (!dismissalsData) return map;
    for (const d of dismissalsData) {
      map.set(`${d.code}::${d.location}`, d);
    }
    return map;
  }, [dismissalsData]);
  const [dismissDialogIssue, setDismissDialogIssue] = useState<{
    code: string;
    location: string;
    message: string;
  } | null>(null);

  const filteredIssues = useMemo(() => {
    let filtered = issues;
    
    if (sourceFilter) {
      filtered = filtered.filter(i => i.source === sourceFilter);
    }
    
    switch (activeTab) {
      case 'critical':
        return filtered.filter(i => i.severity === 'critical');
      case 'serious':
        return filtered.filter(i => i.severity === 'serious');
      case 'autofixable':
        return filtered.filter(isAutoFixable);
      default:
        return filtered;
    }
  }, [issues, activeTab, sourceFilter]);

  const handleSourceClick = (source: FilterableSource) => {
    setSourceFilter(prev => prev === source ? null : source);
  };

  // Remove dismissed issues from the render list when the operator hides
  // them — doing it here keeps counts and the empty-state check accurate.
  const visibleIssues = useMemo(() => {
    if (showDismissed) return filteredIssues;
    return filteredIssues.filter((issue) => {
      const dk = `${issue.code}::${issue.location ?? ''}`;
      return !dismissalsByKey.has(dk);
    });
  }, [filteredIssues, showDismissed, dismissalsByKey]);

  const scoreBreakdown = useMemo(() => calculateScoreBreakdown(issuesSummary), [issuesSummary]);
  
  const displayScore = scoreBreakdown.finalScore;
  const circumference = 2 * Math.PI * 45;
  const scoreOffset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="space-y-6">
      {result.publisherProfile && (
        <PublisherProfileBadge profile={result.publisherProfile} />
      )}
      <Card>
        <CardHeader>
          <CardTitle>Issues by Source</CardTitle>
        </CardHeader>
        <CardContent>
          <SummaryBySource
            summaryBySource={summaryBySource} 
            onSourceClick={handleSourceClick}
          />
          {sourceFilter && (
            <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
              <span>Filtering by:</span>
              <SourceBadge source={sourceFilter} />
              <button 
                onClick={() => setSourceFilter(null)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-1">
          <CardContent className="p-6 flex flex-col items-center justify-center">
            <ScoreTooltip breakdown={scoreBreakdown}>
              <div className="relative w-32 h-32">
                <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className="text-gray-200"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={scoreOffset}
                    className={cn('transition-all duration-1000', getScoreRingColor(displayScore))}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-3xl font-bold', getScoreColor(displayScore))}>
                    {displayScore}
                  </span>
                  <span className="text-xs text-gray-500">/ 100</span>
                </div>
              </div>
            </ScoreTooltip>
            <p className="mt-3 font-medium text-gray-900">Accessibility Score</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isValid ? 'success' : 'error'} size="sm">
                {isValid ? `Valid ${fileType.toUpperCase()}` : `Invalid ${fileType.toUpperCase()}`}
              </Badge>
              <Badge variant="info" size="sm">
                {documentVersion}
              </Badge>
            </div>
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500">Was this audit helpful?</span>
              <QuickRating 
                entityType="audit" 
                entityId={result.jobId}
                size="sm"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Issues Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <SummaryCard 
                label="Total" 
                value={issuesSummary.total} 
                bgColor="bg-gray-100" 
                textColor="text-gray-700"
              />
              <SummaryCard 
                label="Critical" 
                value={issuesSummary.critical} 
                bgColor="bg-red-100" 
                textColor="text-red-700"
              />
              <SummaryCard 
                label="Serious" 
                value={issuesSummary.serious} 
                bgColor="bg-orange-100" 
                textColor="text-orange-700"
              />
              <SummaryCard 
                label="Moderate" 
                value={issuesSummary.moderate} 
                bgColor="bg-yellow-100" 
                textColor="text-yellow-700"
              />
              <SummaryCard 
                label="Minor" 
                value={issuesSummary.minor} 
                bgColor="bg-blue-100" 
                textColor="text-blue-700"
              />
            </div>

            <ActionButtons 
              jobId={jobId}
              issues={issues}
              fileName={result?.fileName}
              onCreateRemediationPlan={onCreateRemediationPlan}
              onDownloadReport={onDownloadReport}
              isCreatingPlan={isCreatingPlan}
              isDownloading={isDownloading}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dismiss dialog — mounted at the audit-results level so it floats
          above everything regardless of which IssueCard triggered it. */}
      <DismissIssueDialog
        issueCode={dismissDialogIssue?.code ?? ''}
        isOpen={dismissDialogIssue !== null}
        isSubmitting={createDismissal.isPending}
        onClose={() => setDismissDialogIssue(null)}
        onSubmit={(reason) => {
          if (!dismissDialogIssue || !jobId) return;
          createDismissal.mutate(
            {
              code: dismissDialogIssue.code,
              location: dismissDialogIssue.location,
              message: dismissDialogIssue.message,
              reason: reason || undefined,
            },
            { onSuccess: () => setDismissDialogIssue(null) },
          );
        }}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle>Issues ({visibleIssues.length})</CardTitle>
              {dismissalsData && dismissalsData.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDismissed((v) => !v)}
                  className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
                >
                  {showDismissed
                    ? `Hide ${dismissalsData.length} dismissed`
                    : `Show ${dismissalsData.length} dismissed`}
                </button>
              )}
            </div>
            <Badge variant="success" size="sm">
              <Wrench className="h-3 w-3 mr-1" />
              {autoFixableCount} Auto-fixable
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({issues.length})
              </TabsTrigger>
              <TabsTrigger value="critical">
                Critical ({issuesSummary.critical})
              </TabsTrigger>
              <TabsTrigger value="serious">
                Serious ({issuesSummary.serious})
              </TabsTrigger>
              <TabsTrigger value="autofixable">
                Auto-fixable ({autoFixableCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {visibleIssues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p>{filteredIssues.length > 0 ? 'All issues in this category are dismissed.' : 'No issues found in this category'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {groupIssues(visibleIssues).map((entry) =>
                    entry.kind === 'group' ? (
                      <GroupedIssueRow
                        key={`group-${entry.code}`}
                        entry={entry}
                        renderIssue={(issue) => {
                          const dk = `${issue.code}::${issue.location ?? ''}`;
                          const dismissal = dismissalsByKey.get(dk);
                          return (
                            <IssueCard
                              issue={issue}
                              jobId={jobId}
                              dismissal={dismissal}
                              onDismiss={() => setDismissDialogIssue({ code: issue.code, location: issue.location ?? '', message: issue.message })}
                              onReenable={dismissal ? () => deleteDismissal.mutate(dismissal.id) : undefined}
                            />
                          );
                        }}
                      />
                    ) : (() => {
                        const issue = entry.issue;
                        const dk = `${issue.code}::${issue.location ?? ''}`;
                        const dismissal = dismissalsByKey.get(dk);
                        return (
                          <IssueCard
                            key={issue.id}
                            issue={issue}
                            jobId={jobId}
                            dismissal={dismissal}
                            onDismiss={() => setDismissDialogIssue({ code: issue.code, location: issue.location ?? '', message: issue.message })}
                            onReenable={dismissal ? () => deleteDismissal.mutate(dismissal.id) : undefined}
                          />
                        );
                      })(),
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const SummaryCard: React.FC<{
  label: string;
  value: number;
  bgColor: string;
  textColor: string;
}> = ({ label, value, bgColor, textColor }) => (
  <div className={cn('rounded-lg p-3 text-center', bgColor)}>
    <p className={cn('text-2xl font-bold', textColor)}>{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </div>
);

interface IssueExplanation {
  fixType: 'auto' | 'quickfix' | 'manual';
  reason: string;
  whatPlatformDid: string | null;
  whatUserMustDo: string | null;
  wcagGuidance: string;
  estimatedTime: string | null;
}

const IssueCard: React.FC<{
  issue: AuditIssue;
  jobId: string;
  dismissal?: IssueDismissal;
  onDismiss?: () => void;
  onReenable?: () => void;
}> = ({ issue, jobId, dismissal, onDismiss, onReenable }) => {
  const config = SEVERITY_CONFIG[issue.severity];
  const autoFix = isAutoFixable(issue);
  const isQuickFix = QUICK_FIX_CODES.has(issue.code);
  const isDismissed = !!dismissal;
  const [explanationOpen, setExplanationOpen] = useState(false);

  const { data: explanation, isLoading: explanationLoading, isError: explanationError } = useQuery<IssueExplanation>({
    queryKey: ['issue-explanation', jobId, issue.code],
    queryFn: async () => {
      const res = await api.get<{ data: IssueExplanation }>(
        `/jobs/${jobId}/issues/${encodeURIComponent(issue.code)}/explanation`
      );
      return res.data.data;
    },
    enabled: explanationOpen && !!jobId && !!issue.code,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className={cn('border rounded-lg p-4', config.bgColor, 'border-gray-200', isDismissed && 'opacity-50')}>
      <div className="flex items-start gap-3">
        <div className={cn('mt-0.5', config.color)}>
          {config.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Badge variant={config.variant} size="sm">
              {issue.code}
            </Badge>
            <Badge variant={config.variant} size="sm">
              {issue.severity}
            </Badge>
            {isHeuristicCode(issue.code) && <HeuristicMarker />}
            <SourceBadge source={issue.source} />
            {autoFix ? (
              <Badge variant="success" size="sm">
                <Wrench className="h-3 w-3 mr-1" />
                Auto-fixable
              </Badge>
            ) : isQuickFix ? (
              <Badge variant="info" size="sm">
                <Wrench className="h-3 w-3 mr-1" />
                Quick-fix
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                <Hand className="h-3 w-3 mr-1" />
                Manual
              </Badge>
            )}
            {issue.wcagCriteria && typeof issue.wcagCriteria === 'string' && (
              <a
                href={getWcagUrl(issue.wcagCriteria)}
                target="_blank"
                rel="noopener noreferrer"
                title={getWcagTooltip(issue.wcagCriteria)}
                className="inline-block"
              >
                <Badge variant="info" size="sm" className="hover:bg-blue-200 cursor-pointer transition-colors">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {formatWcagLabel(issue.wcagCriteria)}
                </Badge>
              </a>
            )}
          </div>
          
          <p className="text-sm text-gray-900 mb-1">{issue.message}</p>
          
          {issue.location && (
            <p className="text-xs text-gray-500 mb-1">
              <span className="font-medium">Location:</span> {issue.location}
            </p>
          )}
          
          {issue.suggestion && (
            isBoilerplateCode(issue.code) ? (
              <BoilerplateSuggestion code={issue.code} text={issue.suggestion} />
            ) : (
              <p className="text-xs text-gray-600 mt-2 p-2 bg-white/50 rounded">
                <span className="font-medium">Suggestion:</span> {issue.suggestion}
              </p>
            )
          )}

          {!autoFix && (
            <>
              <RemediationGuidance issueCode={issue.code} />
              {issue.location && (
                <div className="mt-2">
                  <ViewInContextButton
                    jobId={jobId}
                    location={issue.location}
                    issueCode={issue.code}
                    isManual={true}
                  />
                </div>
              )}
            </>
          )}

          {/* Explanation panel */}
          <div className="mt-2 border-t border-gray-200 pt-2">
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
              onClick={(e) => { e.stopPropagation(); setExplanationOpen(o => !o); }}
            >
              <HelpCircle size={13} />
              <span>{autoFix ? 'What was auto-fixed?' : isQuickFix ? 'Why quick-fix?' : 'Why manual?'}</span>
              {explanationOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {explanationOpen && (
              <div className="mt-2 text-xs space-y-2">
                {explanationLoading ? (
                  <div className="space-y-1.5 animate-pulse">
                    <div className="h-3 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-full" />
                    <div className="h-3 bg-gray-200 rounded w-2/3" />
                  </div>
                ) : explanationError ? (
                  <p className="text-gray-400 italic">Could not load explanation.</p>
                ) : explanation ? (
                  <>
                    <p className="text-gray-600 leading-relaxed">{explanation.reason}</p>
                    {explanation.whatPlatformDid && (
                      <div className="flex gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                        <Zap size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-blue-800">What was fixed: </span>
                          <span className="text-blue-700">{explanation.whatPlatformDid}</span>
                        </div>
                      </div>
                    )}
                    {explanation.whatUserMustDo && (
                      <div className="flex gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                        <User size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-medium text-amber-800">What to do: </span>
                          <span className="text-amber-700">{explanation.whatUserMustDo}</span>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-gray-400 pt-0.5">
                      <span>{explanation.wcagGuidance}</span>
                      {explanation.estimatedTime && <span>~{explanation.estimatedTime}</span>}
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Dismissed caption */}
          {isDismissed && (
            <p className="mt-2 text-xs text-gray-500 italic">
              Dismissed{dismissal.reason ? `: ${dismissal.reason}` : ''}
            </p>
          )}

          {/* Dismiss / re-enable action */}
          <div className="mt-2 pt-2 border-t border-gray-200 flex items-center gap-2">
            {isDismissed ? (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onReenable?.(); }}
                className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-3 w-3" />
                Re-enable issue
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDismiss?.(); }}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
              >
                <Ban className="h-3 w-3" />
                Mark as not an issue
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export type { AuditResult, AuditIssue, Severity };
