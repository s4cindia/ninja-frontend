import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Wrench,
  Code,
  Eye,
  SkipForward,
  FileCode,
  Zap
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { QuickFixPanel } from '@/components/quickfix/QuickFixPanel';
import { CodePreview } from './CodePreview';
import { hasQuickFixTemplate } from '@/data/quickFixTemplates';
import type { RemediationTask, RemediationMode } from '@/types/remediation.types';
import type { QuickFix } from '@/types/quickfix.types';

interface RemediationTaskCardProps {
  task: RemediationTask;
  jobId?: string;
  onQuickFixApply?: (taskId: string, fix: QuickFix) => Promise<void>;
  onSkipTask?: (taskId: string, reason?: string) => Promise<void>;
  onMarkFixed?: (taskId: string, notes?: string) => Promise<void>;
  onEditManually?: (taskId: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
    badge: 'bg-red-100 text-red-700'
  },
  serious: {
    icon: AlertTriangle,
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    badge: 'bg-orange-100 text-orange-700'
  },
  moderate: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    badge: 'bg-yellow-100 text-yellow-700'
  },
  minor: {
    icon: Info,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    badge: 'bg-blue-100 text-blue-700'
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-gray-100 text-gray-700' },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700' },
  fixed: { label: 'Fixed', className: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  skipped: { label: 'Skipped', className: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
  manual_required: { label: 'Manual Fix Required', className: 'bg-red-100 text-red-700' },
};

export const RemediationTaskCard: React.FC<RemediationTaskCardProps> = ({
  task,
  jobId,
  onQuickFixApply,
  onSkipTask,
  onMarkFixed: _onMarkFixed,
  onEditManually,
  isExpanded = false,
  onToggleExpand,
}) => {
  const [mode, setMode] = useState<RemediationMode>('quickfix');
  const [_isApplying, setIsApplying] = useState(false);
  const [previewContent] = useState<string | null>(null);

  const { issue, status } = task;
  const severity = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.minor;
  const statusConfig = STATUS_CONFIG[status];
  const SeverityIcon = severity.icon;

  const hasTemplate = hasQuickFixTemplate(issue.code);

  const handleApplyFix = async (fix: QuickFix) => {
    if (!onQuickFixApply) return;
    setIsApplying(true);
    try {
      await onQuickFixApply(task.id, fix);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSkip = async () => {
    if (onSkipTask) {
      await onSkipTask(task.id, 'Skipped by user');
    }
  };

  const isCompleted = status === 'fixed' || status === 'skipped';

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all',
        severity.border,
        isCompleted && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'flex items-start gap-3 p-4 cursor-pointer',
          severity.bg,
          'hover:brightness-95 transition-all'
        )}
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand?.();
          }
        }}
        aria-expanded={isExpanded}
      >
        <SeverityIcon className={cn('h-5 w-5 mt-0.5 flex-shrink-0', severity.color)} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-gray-900">{issue.code}</h4>
            <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', severity.badge)}>
              {issue.severity}
            </span>
            <span className={cn('inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full', statusConfig.className)}>
              {statusConfig.label}
            </span>
            {hasTemplate && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                <Wrench className="h-3 w-3" />
                Quick Fix Available
              </span>
            )}
            {status === 'fixed' && task.fixedBy === 'auto' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                <Zap className="h-3 w-3" />
                Auto-Fixed
              </span>
            )}
            {issue.confidence !== undefined && issue.confidence > 0 && (
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                issue.confidence >= 0.95 ? 'bg-green-100 text-green-800' :
                issue.confidence >= 0.70 ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-700'
              )}>
                {issue.confidence >= 0.95 ? <CheckCircle className="h-3 w-3" /> :
                 issue.confidence >= 0.70 ? <AlertTriangle className="h-3 w-3" /> : null}
                {Math.round(issue.confidence * 100)}%
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {issue.message}
          </p>

          {issue.location && (
            <p className="text-xs text-gray-500 mt-1 font-mono flex items-center gap-1">
              <FileCode className="h-3 w-3" />
              {issue.location}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {!isCompleted && hasTemplate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand?.();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <Wrench className="h-4 w-4" />
              Quick Fix
            </button>
          )}

          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-400" />
          )}
        </div>
      </div>

      {isExpanded && !isCompleted && (
        <div className="border-t">
          <div className="flex border-b bg-gray-50">
            <button
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                mode === 'quickfix'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setMode('quickfix')}
              disabled={!hasTemplate}
            >
              <Wrench className="h-4 w-4" />
              Quick Fix
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                mode === 'preview'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setMode('preview')}
            >
              <Eye className="h-4 w-4" />
              Code Preview
            </button>
            <button
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                mode === 'editor'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-white'
                  : 'text-gray-600 hover:text-gray-900'
              )}
              onClick={() => setMode('editor')}
            >
              <Code className="h-4 w-4" />
              Edit Code
            </button>
          </div>

          <div className="p-4">
            {mode === 'quickfix' && hasTemplate && (
              <QuickFixPanel
                issue={{
                  id: issue.id,
                  code: issue.code,
                  message: issue.message,
                  location: issue.location,
                  filePath: issue.filePath,
                  currentContent: issue.currentContent,
                  lineNumber: issue.lineNumber,
                }}
                jobId={jobId}
                onApplyFix={handleApplyFix}
                onEditManually={() => setMode('editor')}
                onSkip={handleSkip}
              />
            )}

            {mode === 'quickfix' && !hasTemplate && (
              <div className="text-center py-8">
                <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No Quick Fix Template</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This issue type requires manual code editing to fix.
                </p>
                <button
                  onClick={() => setMode('editor')}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <Code className="h-4 w-4" />
                  Edit Code Manually
                </button>
              </div>
            )}

            {mode === 'preview' && (
              <CodePreview
                issue={issue}
                previewContent={previewContent}
                onEditManually={() => setMode('editor')}
              />
            )}

            {mode === 'editor' && (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Code className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">Monaco Editor</h3>
                <p className="text-sm text-gray-600 mb-4">
                  The Monaco code editor will be implemented in Phase 2.
                </p>
                <button
                  onClick={() => onEditManually?.(task.id)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Open in External Editor
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-4 py-3 bg-gray-50 border-t">
            <button
              onClick={handleSkip}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              <SkipForward className="h-4 w-4" />
              Skip Issue
            </button>
          </div>
        </div>
      )}

      {isExpanded && isCompleted && (
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            {status === 'fixed' ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm text-gray-600">
                  Fixed {task.fixedAt ? `on ${new Date(task.fixedAt).toLocaleString()}` : ''}
                  {task.fixedBy && ` (${task.fixedBy})`}
                </span>
              </>
            ) : (
              <>
                <SkipForward className="h-5 w-5 text-yellow-500" />
                <span className="text-sm text-gray-600">
                  Skipped{task.notes && `: ${task.notes}`}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RemediationTaskCard;
