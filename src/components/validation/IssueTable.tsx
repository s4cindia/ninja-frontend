import { useState } from 'react';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  ExternalLink 
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { getWcagUrl } from '@/utils/wcag';
import type { AccessibilityIssue, IssueSeverity, IssueStatus } from '@/services/accessibility.service';

interface IssueTableProps {
  issues: AccessibilityIssue[];
  isLoading?: boolean;
  onStatusChange?: (issueId: string, status: IssueStatus) => void;
  isUpdating?: boolean;
}

const severityConfig: Record<IssueSeverity, { 
  icon: React.ElementType; 
  color: string; 
  bgColor: string;
  label: string;
}> = {
  critical: { 
    icon: AlertCircle, 
    color: 'text-red-600', 
    bgColor: 'bg-red-50',
    label: 'Critical' 
  },
  major: { 
    icon: AlertTriangle, 
    color: 'text-orange-600', 
    bgColor: 'bg-orange-50',
    label: 'Major' 
  },
  minor: { 
    icon: AlertTriangle, 
    color: 'text-yellow-600', 
    bgColor: 'bg-yellow-50',
    label: 'Minor' 
  },
  info: { 
    icon: Info, 
    color: 'text-blue-600', 
    bgColor: 'bg-blue-50',
    label: 'Info' 
  },
};

const statusConfig: Record<IssueStatus, {
  variant: 'default' | 'success' | 'warning' | 'error' | 'info';
  label: string;
}> = {
  open: { variant: 'error', label: 'Open' },
  fixed: { variant: 'success', label: 'Fixed' },
  ignored: { variant: 'default', label: 'Ignored' },
};

function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.bgColor,
      config.color
    )}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function IssueRow({ 
  issue, 
  onStatusChange,
  isUpdating 
}: { 
  issue: AccessibilityIssue;
  onStatusChange?: (issueId: string, status: IssueStatus) => void;
  isUpdating?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const statusInfo = statusConfig[issue.status];

  return (
    <>
      <tr className={cn(
        'hover:bg-gray-50 transition-colors',
        issue.status === 'fixed' && 'opacity-60',
        issue.status === 'ignored' && 'opacity-50'
      )}>
        <td className="px-6 py-4 whitespace-nowrap">
          <SeverityBadge severity={issue.severity} />
        </td>
        <td className="px-6 py-4">
          <div className="max-w-md">
            <p className="text-sm font-medium text-gray-900">{issue.ruleName}</p>
            <p className="text-xs text-gray-500 mt-1 truncate">{issue.description}</p>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex flex-wrap gap-1">
            {issue.wcagCriteria.slice(0, 2).map((criteria) => (
              <span 
                key={criteria}
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
              >
                {criteria}
              </span>
            ))}
            {issue.wcagCriteria.length > 2 && (
              <span className="text-xs text-gray-500">
                +{issue.wcagCriteria.length - 2}
              </span>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <Badge variant={statusInfo.variant} size="sm">
            {statusInfo.label}
          </Badge>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <div className="flex items-center justify-end gap-2">
            {onStatusChange && issue.status === 'open' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusChange(issue.id, 'fixed')}
                  disabled={isUpdating}
                  aria-label="Mark as fixed"
                  title="Mark as fixed"
                >
                  <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onStatusChange(issue.id, 'ignored')}
                  disabled={isUpdating}
                  aria-label="Ignore issue"
                  title="Ignore issue"
                >
                  <EyeOff className="h-4 w-4 text-gray-600" aria-hidden="true" />
                </Button>
              </>
            )}
            {onStatusChange && issue.status !== 'open' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onStatusChange(issue.id, 'open')}
                disabled={isUpdating}
                aria-label="Reopen issue"
                title="Reopen issue"
              >
                <AlertCircle className="h-4 w-4 text-orange-600" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              )}
            </Button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Element</h4>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded block overflow-x-auto">
                  {issue.element}
                </code>
              </div>
              {issue.location.page && (
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-1">Location</h4>
                  <p className="text-sm text-gray-600">Page {issue.location.page}</p>
                </div>
              )}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">Recommendation</h4>
                <p className="text-sm text-gray-600">{issue.recommendation}</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-1">WCAG Criteria</h4>
                <div className="flex flex-wrap gap-2">
                  {issue.wcagCriteria.map((criteria) => (
                    <a
                      key={criteria}
                      href={getWcagUrl(criteria)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                    >
                      {criteria}
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export function IssueTable({ 
  issues, 
  isLoading = false,
  onStatusChange,
  isUpdating = false,
}: IssueTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        <span className="sr-only">Loading issues...</span>
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="mx-auto h-12 w-12 text-green-400" aria-hidden="true" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">No Issues Found</h3>
        <p className="mt-2 text-sm text-gray-500">
          Great! This document passed all accessibility checks.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Severity
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Issue
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              WCAG
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {issues.map((issue) => (
            <IssueRow 
              key={issue.id} 
              issue={issue} 
              onStatusChange={onStatusChange}
              isUpdating={isUpdating}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
