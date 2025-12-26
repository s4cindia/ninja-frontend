import React, { useState, useCallback } from 'react';
import {
  CheckCircle,
  SkipForward,
  Clock,
  Filter,
  SortAsc
} from 'lucide-react';
import { RemediationTaskCard } from './RemediationTaskCard';
import { applyQuickFixToEpub } from '@/services/quickfix.service';
import { hasQuickFixTemplate } from '@/data/quickFixTemplates';
import type { RemediationTask, QuickFixResult, RemediationSession } from '@/types/remediation.types';
import type { AccessibilityIssue } from '@/types/accessibility.types';

interface RemediationSessionViewProps {
  jobId: string;
  issues: AccessibilityIssue[];
  onComplete?: (session: RemediationSession) => void;
}

type FilterType = 'all' | 'pending' | 'quickfixable';
type SortType = 'severity' | 'type';

export const RemediationSessionView: React.FC<RemediationSessionViewProps> = ({
  jobId,
  issues,
  onComplete,
}) => {
  const [tasks, setTasks] = useState<RemediationTask[]>(() =>
    issues.map((issue, index) => ({
      id: `task-${index}`,
      issue,
      status: 'pending',
    }))
  );
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('severity');

  const stats = {
    total: tasks.length,
    fixed: tasks.filter(t => t.status === 'fixed').length,
    skipped: tasks.filter(t => t.status === 'skipped').length,
    pending: tasks.filter(t => t.status === 'pending').length,
  };

  const handleApplyFix = useCallback(async (taskId: string, result: QuickFixResult) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    try {
      await applyQuickFixToEpub(jobId, task.issue.id || taskId, result.changes);

      setTasks(prev => prev.map(t =>
        t.id === taskId
          ? {
              ...t,
              status: 'fixed',
              fixApplied: result,
              fixedAt: new Date().toISOString(),
              fixedBy: 'quickfix',
            }
          : t
      ));

      const nextPending = tasks.find(t => t.id !== taskId && t.status === 'pending');
      setExpandedTaskId(nextPending?.id || null);
    } catch (error) {
      console.error('Failed to apply fix:', error);
      throw error;
    }
  }, [jobId, tasks]);

  const handleSkip = useCallback((taskId: string, reason?: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'skipped', notes: reason }
        : t
    ));

    const nextPending = tasks.find(t => t.id !== taskId && t.status === 'pending');
    setExpandedTaskId(nextPending?.id || null);
  }, [tasks]);

  const handleEditManually = useCallback((taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, status: 'manual_required' }
        : t
    ));
  }, []);

  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'pending') return task.status === 'pending';
      if (filter === 'quickfixable') {
        return task.status === 'pending' && hasQuickFixTemplate(task.issue.code);
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const severityOrder: Record<string, number> = { critical: 0, serious: 1, moderate: 2, minor: 3 };
        return (severityOrder[a.issue.severity] || 3) - (severityOrder[b.issue.severity] || 3);
      }
      return a.issue.code.localeCompare(b.issue.code);
    });

  const isComplete = stats.pending === 0;
  const progressPercentage = stats.total > 0 ? Math.round(((stats.fixed + stats.skipped) / stats.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Remediation Session</h2>
          <p className="text-sm text-gray-600 mt-1">
            Fix accessibility issues in your EPUB
          </p>
        </div>

        {isComplete && (
          <button
            onClick={() => onComplete?.({
              id: `session-${Date.now()}`,
              jobId,
              epubId: jobId,
              tasks,
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              stats,
            })}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Complete Session
          </button>
        )}
      </div>

      <div className="flex items-center gap-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <span className="text-sm text-gray-600">{stats.pending} pending</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500" />
          <span className="text-sm text-gray-600">{stats.fixed} fixed</span>
        </div>
        <div className="flex items-center gap-2">
          <SkipForward className="h-5 w-5 text-yellow-500" />
          <span className="text-sm text-gray-600">{stats.skipped} skipped</span>
        </div>
        <div className="flex-1" />
        <div className="h-2 w-48 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {progressPercentage}%
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterType)}
            className="text-sm border rounded-md px-2 py-1"
            aria-label="Filter issues"
          >
            <option value="all">All Issues ({tasks.length})</option>
            <option value="pending">Pending ({stats.pending})</option>
            <option value="quickfixable">Quick Fixable</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <SortAsc className="h-4 w-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortType)}
            className="text-sm border rounded-md px-2 py-1"
            aria-label="Sort issues"
          >
            <option value="severity">By Severity</option>
            <option value="type">By Type</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredTasks.map((task) => (
          <RemediationTaskCard
            key={task.id}
            task={task}
            jobId={jobId}
            onApplyFix={handleApplyFix}
            onSkip={handleSkip}
            onEditManually={handleEditManually}
            isExpanded={expandedTaskId === task.id}
            onToggleExpand={() => setExpandedTaskId(
              expandedTaskId === task.id ? null : task.id
            )}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">
            {filter === 'pending' ? 'All issues addressed!' : 'No matching issues'}
          </h3>
          <p className="text-sm text-gray-600">
            {filter === 'pending'
              ? 'You have addressed all accessibility issues in this session.'
              : 'Try changing your filter to see more issues.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default RemediationSessionView;
