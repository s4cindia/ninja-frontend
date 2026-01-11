import { Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface IssueCardProps {
  issue: {
    id: string;
    code: string;
    message: string;
    severity: string;
    confidence?: number;
    fixType?: 'autofix' | 'quickfix' | 'manual';
    status: string;
    location?: string;
    filePath?: string;
  };
  className?: string;
  onClick?: () => void;
}

export function IssueCard({ issue, className, onClick }: IssueCardProps) {
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
            <span className="font-medium text-gray-900">{issue.code}</span>
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              issue.severity === 'critical' && 'bg-red-100 text-red-700',
              issue.severity === 'serious' && 'bg-orange-100 text-orange-700',
              issue.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
              issue.severity === 'minor' && 'bg-blue-100 text-blue-700'
            )}>
              {issue.severity}
            </span>
          </div>
          <h3 className="text-sm text-gray-700">{issue.message}</h3>
          {(issue.location || issue.filePath) && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {issue.location || issue.filePath}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          {getFixTypeBadge()}
          {getConfidenceBadge()}
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
