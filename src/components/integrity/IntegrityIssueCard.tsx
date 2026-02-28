/**
 * IntegrityIssueCard - individual issue with expected vs actual, fix, ignore, go-to
 */

import type { IntegrityIssue } from '@/types/integrity';
import { getCheckTypeLabel } from '@/types/integrity';
import { AlertCircle, AlertTriangle, Info, Check, X, MapPin } from 'lucide-react';

interface Props {
  issue: IntegrityIssue;
  onApplyFix: (issueId: string) => void;
  onApplyFixToEditor?: (originalText: string, fixText: string) => void;
  onIgnore: (issueId: string) => void;
  onGoToLocation: (issue: IntegrityIssue) => void;
  isFixing?: boolean;
  isIgnoring?: boolean;
}

const SEVERITY_CONFIG = {
  ERROR: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  SUGGESTION: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
} as const;

export function IntegrityIssueCard({ issue, onApplyFix, onApplyFixToEditor, onIgnore, onGoToLocation, isFixing, isIgnoring }: Props) {
  const sev = SEVERITY_CONFIG[issue.severity];
  const SevIcon = sev.icon;
  const isResolved = issue.status !== 'PENDING';
  const checkLabel = getCheckTypeLabel(issue.checkType);

  return (
    <div className={`border rounded-lg p-3 ${isResolved ? 'opacity-60 bg-gray-50' : sev.bg}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <SevIcon className={`w-4 h-4 flex-shrink-0 ${sev.color}`} />
          <span className="font-medium text-sm truncate">{issue.title}</span>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{checkLabel}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-2">{issue.description}</p>

      {/* Expected vs Actual */}
      {(issue.expectedValue || issue.actualValue) && (
        <div className="flex gap-3 text-xs mb-2">
          {issue.expectedValue && (
            <div className="flex-1 min-w-0">
              <span className="text-gray-500">Expected:</span>{' '}
              <span className="text-green-700 font-mono break-all">{issue.expectedValue}</span>
            </div>
          )}
          {issue.actualValue && (
            <div className="flex-1 min-w-0">
              <span className="text-gray-500">Actual:</span>{' '}
              <span className="text-red-700 font-mono break-all">{issue.actualValue}</span>
            </div>
          )}
        </div>
      )}

      {/* Suggested fix */}
      {issue.suggestedFix && (
        <div className="text-xs mb-2 bg-white bg-opacity-60 rounded px-2 py-1">
          <span className="text-gray-500">Fix:</span>{' '}
          <span className="text-gray-700">{issue.suggestedFix}</span>
        </div>
      )}

      {/* Context */}
      {issue.context && (
        <div className="text-xs text-gray-500 italic mb-2 truncate" title={issue.context}>
          ...{issue.context}...
        </div>
      )}

      {/* Status badge for resolved */}
      {isResolved && (
        <div className="text-xs mb-2">
          <span className={`px-1.5 py-0.5 rounded ${
            issue.status === 'FIXED' || issue.status === 'AUTO_FIXED'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-200 text-gray-600'
          }`}>
            {issue.status}
          </span>
          {issue.resolution && <span className="ml-2 text-gray-400">{issue.resolution}</span>}
        </div>
      )}

      {/* Actions */}
      {!isResolved && (
        <div className="flex items-center gap-2 mt-2">
          {issue.originalText && (
            <button type="button"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
              onClick={() => onGoToLocation(issue)}
              title="Go to location in document"
            >
              <MapPin className="w-3 h-3" /> Locate
            </button>
          )}
          {issue.suggestedFix && (
            <button type="button"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              onClick={() => {
                if (issue.actualValue && issue.expectedValue && onApplyFixToEditor) {
                  onApplyFixToEditor(issue.actualValue, issue.expectedValue);
                }
                onApplyFix(issue.id);
              }}
              disabled={isFixing}
            >
              <Check className="w-3 h-3" /> Fix
            </button>
          )}
          <button type="button"
            className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
            onClick={() => onIgnore(issue.id)}
            disabled={isIgnoring}
          >
            <X className="w-3 h-3" /> Ignore
          </button>
        </div>
      )}
    </div>
  );
}
