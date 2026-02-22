/**
 * ViolationCard Component
 *
 * Displays an individual style violation with fix/ignore actions
 */

import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Wand2,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { StyleViolation, StyleSeverity, ViolationStatus } from '@/types/style';

interface ViolationCardProps {
  violation: StyleViolation;
  onApplyFix?: (violation: StyleViolation, fixOption: string) => void;
  onIgnore?: (violationId: string, reason?: string) => void;
  onNavigate?: (violation: StyleViolation) => void;
  isApplying?: boolean;
  isIgnoring?: boolean;
}

const severityConfig: Record<
  StyleSeverity,
  {
    icon: React.ElementType;
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
  }
> = {
  ERROR: {
    icon: AlertCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    label: 'Error',
  },
  WARNING: {
    icon: AlertTriangle,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Warning',
  },
  SUGGESTION: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Suggestion',
  },
};

const statusConfig: Record<
  ViolationStatus,
  {
    icon: React.ElementType;
    color: string;
    label: string;
  }
> = {
  PENDING: {
    icon: AlertCircle,
    color: 'text-gray-500',
    label: 'Pending',
  },
  FIXED: {
    icon: CheckCircle,
    color: 'text-green-600',
    label: 'Fixed',
  },
  IGNORED: {
    icon: EyeOff,
    color: 'text-gray-400',
    label: 'Ignored',
  },
  WONT_FIX: {
    icon: XCircle,
    color: 'text-gray-400',
    label: "Won't Fix",
  },
  AUTO_FIXED: {
    icon: Wand2,
    color: 'text-purple-600',
    label: 'Auto-Fixed',
  },
};

export function ViolationCard({
  violation,
  onApplyFix,
  onIgnore,
  onNavigate,
  isApplying = false,
  isIgnoring = false,
}: ViolationCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [ignoreReason, setIgnoreReason] = useState('');
  const [showIgnoreInput, setShowIgnoreInput] = useState(false);

  const severityInfo = severityConfig[violation.severity];
  const statusInfo = statusConfig[violation.status];
  const SeverityIcon = severityInfo.icon;
  const StatusIcon = statusInfo.icon;

  const isResolved = violation.status !== 'PENDING';

  const handleApplyFix = () => {
    if (onApplyFix && violation.suggestedText) {
      onApplyFix(violation, violation.suggestedText);
    }
  };

  const handleIgnore = () => {
    if (showIgnoreInput) {
      onIgnore?.(violation.id, ignoreReason || undefined);
      setShowIgnoreInput(false);
      setIgnoreReason('');
    } else {
      setShowIgnoreInput(true);
    }
  };

  const handleNavigate = () => {
    onNavigate?.(violation);
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all',
        severityInfo.bgColor,
        severityInfo.borderColor,
        isResolved && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <SeverityIcon
            className={cn('h-5 w-5 mt-0.5 flex-shrink-0', severityInfo.color)}
            aria-hidden="true"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-medium text-gray-900">{violation.title}</h4>
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium',
                  statusInfo.color,
                  'bg-white/50'
                )}
              >
                <StatusIcon className="h-3 w-3" />
                {statusInfo.label}
              </span>
            </div>
            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{violation.description}</p>

            {/* Location info */}
            {(violation.pageNumber || violation.paragraphIndex !== undefined) && (
              <p className="text-xs text-gray-500 mt-1">
                {violation.pageNumber && `Page ${violation.pageNumber}`}
                {violation.pageNumber && violation.paragraphIndex !== undefined && ' • '}
                {violation.paragraphIndex !== undefined && `Para ${violation.paragraphIndex + 1}`}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Original and suggested text preview */}
      <div className="mt-3 space-y-2">
        <div className="rounded bg-white/70 p-2">
          <p className="text-xs text-gray-500 mb-1">Original:</p>
          <p className="text-sm text-gray-900 font-mono line-through decoration-red-400">
            {violation.originalText}
          </p>
        </div>
        {violation.suggestedText && (
          <div className="rounded bg-white/70 p-2">
            <p className="text-xs text-gray-500 mb-1">Suggested:</p>
            <p className="text-sm text-green-700 font-mono">{violation.suggestedText}</p>
          </div>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-white/50 space-y-3">
          {violation.ruleReference && (
            <div>
              <p className="text-xs font-medium text-gray-700">Rule Reference</p>
              <p className="text-xs text-gray-600">{violation.ruleReference}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-medium text-gray-700">Category</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-white/50 rounded text-xs text-gray-600">
              {violation.category}
            </span>
          </div>
          <div>
            <p className="text-xs font-medium text-gray-700">Style Guide</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-white/50 rounded text-xs text-gray-600">
              {violation.styleGuide}
            </span>
          </div>
          {violation.appliedFix && (
            <div>
              <p className="text-xs font-medium text-gray-700">Applied Fix</p>
              <p className="text-xs text-gray-600 font-mono">{violation.appliedFix}</p>
            </div>
          )}
          {violation.ignoredReason && (
            <div>
              <p className="text-xs font-medium text-gray-700">Ignore Reason</p>
              <p className="text-xs text-gray-600">{violation.ignoredReason}</p>
            </div>
          )}
        </div>
      )}

      {/* Ignore reason input */}
      {showIgnoreInput && (
        <div className="mt-3 space-y-2">
          <input
            type="text"
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
            placeholder="Reason for ignoring (optional)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowIgnoreInput(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={handleIgnore} isLoading={isIgnoring}>
              Confirm Ignore
            </Button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isResolved && !showIgnoreInput && (
        <div className="mt-4 flex items-center gap-2">
          {onNavigate && (
            <Button size="sm" variant="outline" onClick={handleNavigate}>
              Go to Location
            </Button>
          )}
          {violation.suggestedText && onApplyFix && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleApplyFix}
              isLoading={isApplying}
              leftIcon={<Wand2 className="h-4 w-4" />}
            >
              Apply Fix
            </Button>
          )}
          {onIgnore && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleIgnore}
              leftIcon={<EyeOff className="h-4 w-4" />}
            >
              Ignore
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

export default ViolationCard;
