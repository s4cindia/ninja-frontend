/**
 * ViolationCard Component
 *
 * Displays an individual style violation with fix/ignore actions.
 * Compact design matching IntegrityIssueCard (p-3, inline buttons).
 */

import { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  MapPin,
  EyeOff,
} from 'lucide-react';
import { cn } from '@/utils/cn';
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
  { icon: React.ElementType; color: string; bg: string }
> = {
  ERROR: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  SUGGESTION: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
};

const statusLabels: Record<ViolationStatus, string> = {
  PENDING: 'Pending',
  FIXED: 'FIXED',
  IGNORED: 'IGNORED',
  WONT_FIX: "WON'T FIX",
  AUTO_FIXED: 'AUTO_FIXED',
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

  const sev = severityConfig[violation.severity];
  const SevIcon = sev.icon;
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

  return (
    <div className={cn('border rounded-lg p-3 transition-all', isResolved ? 'opacity-60 bg-gray-50' : sev.bg)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <SevIcon className={cn('w-4 h-4 flex-shrink-0', sev.color)} />
          <span className="font-medium text-sm truncate">{violation.title}</span>
          {violation.confidence !== null && violation.confidence !== undefined && (
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0', {
              'bg-green-100 text-green-700': violation.confidence >= 90,
              'bg-yellow-100 text-yellow-700': violation.confidence >= 60 && violation.confidence < 90,
              'bg-orange-100 text-orange-700': violation.confidence < 60,
            })}>
              {violation.confidence}%
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex-shrink-0 p-0.5 rounded hover:bg-white/50"
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-500" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-500" />}
        </button>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-2 line-clamp-2">{violation.description}</p>

      {/* Original vs Suggested */}
      {(violation.originalText || violation.suggestedText) && (
        <div className="flex gap-3 text-xs mb-2">
          {violation.originalText && (
            <div className="flex-1 min-w-0">
              <span className="text-gray-500">Original:</span>{' '}
              <span className="text-red-700 font-mono break-all line-through decoration-red-400">{violation.originalText}</span>
            </div>
          )}
          {violation.suggestedText && (
            <div className="flex-1 min-w-0">
              <span className="text-gray-500">Suggested:</span>{' '}
              <span className="text-green-700 font-mono break-all">{violation.suggestedText}</span>
            </div>
          )}
        </div>
      )}

      {/* Status badge for resolved */}
      {isResolved && (
        <div className="text-xs mb-2">
          <span className={cn('px-1.5 py-0.5 rounded', {
            'bg-green-100 text-green-700': violation.status === 'FIXED' || violation.status === 'AUTO_FIXED',
            'bg-gray-200 text-gray-600': violation.status !== 'FIXED' && violation.status !== 'AUTO_FIXED',
          })}>
            {statusLabels[violation.status]}
          </span>
          {violation.ignoredReason && <span className="ml-2 text-gray-400">{violation.ignoredReason}</span>}
        </div>
      )}

      {/* Expanded details */}
      {isExpanded && (
        <div className="text-xs mb-2 bg-white bg-opacity-60 rounded px-2 py-1.5 space-y-1.5">
          {violation.ruleReference && (
            <div>
              <span className="text-gray-500 font-medium">Rule:</span>{' '}
              <span className="text-gray-700">{violation.ruleReference}</span>
            </div>
          )}
          <div>
            <span className="text-gray-500 font-medium">Category:</span>{' '}
            <span className="text-gray-700">{violation.category}</span>
          </div>
          <div>
            <span className="text-gray-500 font-medium">Style Guide:</span>{' '}
            <span className="text-gray-700">{violation.styleGuide}</span>
          </div>
          {violation.confidence !== null && violation.confidence !== undefined && (
            <div>
              <span className="text-gray-500 font-medium">Confidence:</span>{' '}
              <span className="text-gray-700">{violation.confidence}%{' '}
                ({violation.confidence >= 90 ? 'High' : violation.confidence >= 60 ? 'Medium' : 'Low'})
              </span>
            </div>
          )}
          {violation.appliedFix && (
            <div>
              <span className="text-gray-500 font-medium">Applied Fix:</span>{' '}
              <span className="text-gray-700 font-mono">{violation.appliedFix}</span>
            </div>
          )}
          {(violation.pageNumber || violation.paragraphIndex !== undefined) && (
            <div>
              <span className="text-gray-500 font-medium">Location:</span>{' '}
              <span className="text-gray-700">
                {violation.pageNumber && `Page ${violation.pageNumber}`}
                {violation.pageNumber && violation.paragraphIndex !== undefined && ' \u00B7 '}
                {violation.paragraphIndex !== undefined && `Para ${violation.paragraphIndex + 1}`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Ignore reason input */}
      {showIgnoreInput && (
        <div className="mb-2 space-y-1.5">
          <input
            type="text"
            value={ignoreReason}
            onChange={(e) => setIgnoreReason(e.target.value)}
            placeholder="Reason for ignoring (optional)"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <div className="flex gap-1.5">
            <button
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => setShowIgnoreInput(false)}
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              onClick={handleIgnore}
              disabled={isIgnoring}
            >
              <EyeOff className="w-3 h-3" /> Confirm Ignore
            </button>
          </div>
        </div>
      )}

      {/* Actions */}
      {!isResolved && !showIgnoreInput && (
        <div className="flex items-center gap-2 mt-2">
          {onNavigate && violation.originalText && (
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => onNavigate(violation)}
              title="Go to location in document"
            >
              <MapPin className="w-3 h-3" /> Locate
            </button>
          )}
          {violation.suggestedText && onApplyFix && (
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              onClick={handleApplyFix}
              disabled={isApplying}
            >
              <Check className="w-3 h-3" /> Fix
            </button>
          )}
          {onIgnore && (
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              onClick={handleIgnore}
              disabled={isIgnoring}
            >
              <X className="w-3 h-3" /> Ignore
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default ViolationCard;
