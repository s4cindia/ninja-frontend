import { Zap, CheckCircle, AlertTriangle, FileText, ExternalLink } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Tooltip } from '../ui/Tooltip';
import type { PdfAuditIssue } from '@/types/pdf.types';

// EPUB/Generic Audit Issue
interface AuditIssue {
  id: string;
  code: string;
  message: string;
  severity: string;
  confidence?: number;
  fixType?: 'autofix' | 'quickfix' | 'manual';
  status: string;
  location?: string;
  filePath?: string;
  source?: string;
}

// Type guard to check if issue is a PDF issue
function isPdfIssue(issue: AuditIssue | PdfAuditIssue): issue is PdfAuditIssue {
  return 'matterhornCheckpoint' in issue || 'pageNumber' in issue || 'ruleId' in issue;
}

interface IssueCardProps {
  issue: AuditIssue | PdfAuditIssue;
  className?: string;
  onClick?: () => void;
  onPageClick?: (pageNumber: number) => void;
  showMatterhorn?: boolean;
}

export function IssueCard({
  issue,
  className,
  onClick,
  onPageClick,
  showMatterhorn = false,
}: IssueCardProps) {
  const isPdf = isPdfIssue(issue);
  const getConfidenceBadge = () => {
    if (!issue.confidence) return null;

    const percentage = Math.round(issue.confidence * 100);

    if (issue.confidence >= 0.95) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
          <CheckCircle size={12} />
          <span>{percentage}% confident</span>
        </div>
      );
    } else if (issue.confidence >= 0.70) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
          <AlertTriangle size={12} />
          <span>{percentage}% confident</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
          <span>{percentage}% confident</span>
        </div>
      );
    }
  };

  const getFixTypeBadge = () => {
    if (issue.status === 'fixed' && issue.fixType === 'autofix') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          <Zap size={12} />
          <span>Auto-Fixed</span>
        </div>
      );
    } else if (issue.fixType === 'autofix') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
          <Zap size={12} />
          <span>Auto-Fix</span>
        </div>
      );
    } else if (issue.fixType === 'quickfix') {
      return (
        <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
          Quick Fix
        </div>
      );
    } else {
      return (
        <div className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
          Manual
        </div>
      );
    }
  };

  const getSeverityStyles = () => {
    switch (issue.severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'serious':
        return 'border-orange-200 bg-orange-50';
      case 'moderate':
        return 'border-yellow-200 bg-yellow-50';
      case 'minor':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div
      className={cn(
        'border rounded-lg p-4 transition-colors',
        getSeverityStyles(),
        onClick && 'cursor-pointer hover:brightness-95',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isPdf && (
              <FileText className="h-4 w-4 text-red-600 flex-shrink-0" aria-label="PDF issue" />
            )}
            <span className="font-medium text-gray-900">
              {isPdf ? (issue as PdfAuditIssue).ruleId : (issue as AuditIssue).code}
            </span>
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              issue.severity === 'critical' && 'bg-red-100 text-red-700',
              issue.severity === 'serious' && 'bg-orange-100 text-orange-700',
              issue.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
              issue.severity === 'minor' && 'bg-blue-100 text-blue-700'
            )}>
              {issue.severity}
            </span>

            {/* Matterhorn Checkpoint Badge */}
            {isPdf && showMatterhorn && (issue as PdfAuditIssue).matterhornCheckpoint && (
              <Tooltip
                id={`matterhorn-${issue.id}`}
                content="Matterhorn Protocol Checkpoint"
                position="top"
              >
                <a
                  href={`https://www.pdfa.org/resource/the-matterhorn-protocol/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{(issue as PdfAuditIssue).matterhornCheckpoint}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Tooltip>
            )}

            {/* Page Number Badge */}
            {isPdf && (issue as PdfAuditIssue).pageNumber && (
              <button
                type="button"
                className={cn(
                  'px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium',
                  onPageClick && 'hover:bg-gray-200 transition-colors cursor-pointer',
                  !onPageClick && 'cursor-default'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPageClick && (issue as PdfAuditIssue).pageNumber) {
                    onPageClick((issue as PdfAuditIssue).pageNumber!);
                  }
                }}
                disabled={!onPageClick}
              >
                Page {(issue as PdfAuditIssue).pageNumber}
              </button>
            )}
          </div>
          <h3 className="text-sm text-gray-700">{issue.message}</h3>
          {!isPdf && ((issue as AuditIssue).location || (issue as AuditIssue).filePath) && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {(issue as AuditIssue).location || (issue as AuditIssue).filePath}
            </p>
          )}
          {isPdf && (issue as PdfAuditIssue).elementPath && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {(issue as PdfAuditIssue).elementPath}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          {!isPdf && getFixTypeBadge()}
          {!isPdf && getConfidenceBadge()}
        </div>
      </div>
    </div>
  );
}

interface AutoFixSummaryProps {
  applied: number;
  total?: number;
  className?: string;
}

export function AutoFixSummary({ applied, total, className }: AutoFixSummaryProps) {
  if (applied <= 0) return null;

  return (
    <div className={cn('bg-blue-50 border border-blue-200 rounded-lg p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="text-blue-600" size={20} />
        <h3 className="font-semibold text-blue-900">
          {applied} {total ? `of ${total} ` : ''}issues fixed automatically
        </h3>
      </div>
      <p className="text-sm text-blue-800">
        High-confidence issues (95%+) were automatically remediated without requiring your approval.
      </p>
    </div>
  );
}
