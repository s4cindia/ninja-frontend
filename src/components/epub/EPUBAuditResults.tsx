import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertCircle, AlertTriangle, Info, CheckCircle, 
  Wrench, Hand, FileDown, ClipboardList, ExternalLink, FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { QuickRating } from '../feedback';
import { SourceBadge, SummaryBySource, ViewInContextButton, RemediationGuidance } from '../audit';
import type { SummaryBySourceData } from '../audit';
import { cn } from '@/utils/cn';

type Severity = 'critical' | 'serious' | 'moderate' | 'minor';
type IssueSource = 'js-auditor' | 'ace' | 'epubcheck' | 'manual';

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
  epubVersion: string;
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

const isAutoFixable = (issue: AuditIssue): boolean => {
  return issue.source === 'js-auditor' && issue.code.startsWith('EPUB-');
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
  onCreateRemediationPlan?: () => void;
  onDownloadReport?: () => void;
  isCreatingPlan?: boolean;
  isDownloading?: boolean;
}

function ActionButtons({ 
  jobId, 
  onCreateRemediationPlan, 
  onDownloadReport, 
  isCreatingPlan = false, 
  isDownloading = false 
}: ActionButtonsProps) {
  const navigate = useNavigate();

  return (
    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
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
      <Button 
        variant="secondary"
        onClick={() => navigate(`/acr/workflow?jobId=${jobId}`)}
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
  const issues = result?.issues ?? [];
  const accessibilityScore = result?.accessibilityScore ?? 0;
  const isValid = result?.isValid ?? false;
  const epubVersion = result?.epubVersion ?? 'Unknown';
  
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
    const sources: Array<'epubcheck' | 'ace' | 'js-auditor'> = ['epubcheck', 'ace', 'js-auditor'];
    const summary: SummaryBySourceData = {};
    
    for (const source of sources) {
      const sourceIssues = issues.filter(i => i.source === source);
      if (sourceIssues.length > 0 || source === 'js-auditor') {
        const autoFixable = sourceIssues.filter(isAutoFixable).length;
        summary[source] = {
          critical: sourceIssues.filter(i => i.severity === 'critical').length,
          serious: sourceIssues.filter(i => i.severity === 'serious').length,
          moderate: sourceIssues.filter(i => i.severity === 'moderate').length,
          minor: sourceIssues.filter(i => i.severity === 'minor').length,
          total: sourceIssues.length,
          ...(source === 'js-auditor' ? { autoFixable } : {}),
        };
      }
    }
    return summary;
  }, [result?.summaryBySource, issues]);

  const [sourceFilter, setSourceFilter] = useState<'epubcheck' | 'ace' | 'js-auditor' | null>(null);

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

  const handleSourceClick = (source: 'epubcheck' | 'ace' | 'js-auditor') => {
    setSourceFilter(prev => prev === source ? null : source);
  };

  const circumference = 2 * Math.PI * 45;
  const scoreOffset = circumference - (accessibilityScore / 100) * circumference;

  return (
    <div className="space-y-6">
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
                  className={cn('transition-all duration-1000', getScoreRingColor(accessibilityScore))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn('text-3xl font-bold', getScoreColor(accessibilityScore))}>
                  {accessibilityScore}
                </span>
                <span className="text-xs text-gray-500">/ 100</span>
              </div>
            </div>
            <p className="mt-3 font-medium text-gray-900">Accessibility Score</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isValid ? 'success' : 'error'} size="sm">
                {isValid ? 'Valid EPUB' : 'Invalid EPUB'}
              </Badge>
              <Badge variant="info" size="sm">
                {epubVersion}
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
              onCreateRemediationPlan={onCreateRemediationPlan}
              onDownloadReport={onDownloadReport}
              isCreatingPlan={isCreatingPlan}
              isDownloading={isDownloading}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Issues ({filteredIssues.length})</CardTitle>
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
              {filteredIssues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p>No issues found in this category</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} jobId={jobId} />
                  ))}
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

const IssueCard: React.FC<{ issue: AuditIssue; jobId: string }> = ({ issue, jobId }) => {
  const config = SEVERITY_CONFIG[issue.severity];
  const autoFix = isAutoFixable(issue);

  return (
    <div className={cn('border rounded-lg p-4', config.bgColor, 'border-gray-200')}>
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
            <SourceBadge source={issue.source} />
            {autoFix ? (
              <Badge variant="success" size="sm">
                <Wrench className="h-3 w-3 mr-1" />
                Auto-fixable
              </Badge>
            ) : (
              <Badge variant="default" size="sm">
                <Hand className="h-3 w-3 mr-1" />
                Manual
              </Badge>
            )}
            {issue.wcagCriteria && typeof issue.wcagCriteria === 'string' && (
              <a
                href={`https://www.w3.org/WAI/WCAG21/Understanding/${issue.wcagCriteria.toLowerCase().replace(/\./g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Badge variant="info" size="sm" className="hover:bg-blue-200 cursor-pointer transition-colors">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {issue.wcagCriteria}
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
            <p className="text-xs text-gray-600 mt-2 p-2 bg-white/50 rounded">
              <span className="font-medium">Suggestion:</span> {issue.suggestion}
            </p>
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
        </div>
      </div>
    </div>
  );
};

export type { AuditResult, AuditIssue, Severity };
