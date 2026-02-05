import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, XCircle, Download, Eye, Plus, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { AuditCoverageDisplay } from './AuditCoverageDisplay';
import { IssuesList } from './IssuesList';
import { clsx } from 'clsx';
import type { AuditCoverage, IssueWithNewFlag } from '@/types/remediation.types';

interface RemediationSummaryProps {
  contentType: 'pdf' | 'epub';
  originalIssueCount: number;
  fixedIssueCount: number;
  remainingIssues: number;
  newIssues?: number;
  auditCoverage?: AuditCoverage;
  remainingIssuesList?: IssueWithNewFlag[];
  jobId: string;
  onViewDetails?: () => void;
  onDownload?: () => void;
  onStartNew?: () => void;
  onRunRemediationAgain?: () => void;
  className?: string;
}

export const RemediationSummary: React.FC<RemediationSummaryProps> = ({
  contentType,
  originalIssueCount,
  fixedIssueCount,
  remainingIssues,
  newIssues = 0,
  auditCoverage,
  remainingIssuesList = [],
  onViewDetails,
  onDownload,
  onStartNew,
  onRunRemediationAgain,
  className,
}) => {
  const fixRate = originalIssueCount > 0
    ? Math.round((fixedIssueCount / originalIssueCount) * 100)
    : 0;

  const allOriginalFixed = originalIssueCount > 0 && fixedIssueCount === originalIssueCount;
  const isFullyCompliant = remainingIssues === 0;
  const hasNewIssues = newIssues > 0;

  const getFixRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'stroke-green-500';
    if (rate >= 50) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (fixRate / 100) * circumference;

  return (
    <div className="space-y-6">
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Remediation Summary
            </CardTitle>
            <Badge variant={contentType === 'epub' ? 'info' : 'default'}>
              {contentType.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Status Alert */}
          {isFullyCompliant && (
            <Alert variant="success" className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <div className="ml-2">
                <div className="font-semibold">Fully Compliant!</div>
                <div>All accessibility issues have been resolved. No remaining issues detected.</div>
              </div>
            </Alert>
          )}

          {!isFullyCompliant && allOriginalFixed && hasNewIssues && (
            <Alert variant="warning" className="mb-6">
              <AlertTriangle className="h-4 w-4" />
              <div className="ml-2">
                <div className="font-semibold">New Issues Detected</div>
                <div>
                  All original issues were fixed, but {newIssues} new issue{newIssues !== 1 ? 's' : ''} {newIssues !== 1 ? 'were' : 'was'} found during re-audit.
                  Consider running remediation again.
                </div>
              </div>
            </Alert>
          )}

          {!isFullyCompliant && !allOriginalFixed && (
            <Alert variant="error" className="mb-6">
              <XCircle className="h-4 w-4" />
              <div className="ml-2">
                <div className="font-semibold">Remediation Incomplete</div>
                <div>
                  {remainingIssues} issue{remainingIssues !== 1 ? 's' : ''} remaining.
                  {hasNewIssues && ` This includes ${newIssues} new issue${newIssues !== 1 ? 's' : ''} discovered during re-audit.`}
                </div>
              </div>
            </Alert>
          )}
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
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
                  strokeDashoffset={strokeDashoffset}
                  className={clsx('transition-all duration-500', getProgressColor(fixRate))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx('text-3xl font-bold', getFixRateColor(fixRate))}>
                  {fixRate}%
                </span>
                <span className="text-xs text-gray-500">Fix Rate</span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Original</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{originalIssueCount}</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Fixed</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{fixedIssueCount}</p>
            </div>

            <div className="p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center gap-2 text-orange-600 mb-1">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">New</span>
              </div>
              <p className="text-2xl font-bold text-orange-700">{newIssues}</p>
            </div>

            <div className="p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-2 text-red-600 mb-1">
                <XCircle className="h-4 w-4" />
                <span className="text-xs">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-red-700">{remainingIssues}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
          {onViewDetails && (
            <Button variant="outline" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          {onDownload && (
            <Button variant="primary" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {onRunRemediationAgain && !isFullyCompliant && (
            <Button variant="outline" onClick={onRunRemediationAgain}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Run Remediation Again
            </Button>
          )}
          {onStartNew && (
            <Button variant="ghost" onClick={onStartNew}>
              <Plus className="h-4 w-4 mr-2" />
              Start New
            </Button>
          )}
        </div>
      </CardContent>
    </Card>

    {/* Audit Coverage Display */}
    {auditCoverage && (
      <AuditCoverageDisplay coverage={auditCoverage} />
    )}

    {/* Remaining Issues List */}
    {remainingIssuesList.length > 0 && (
      <IssuesList issues={remainingIssuesList} />
    )}
  </div>
  );
};
