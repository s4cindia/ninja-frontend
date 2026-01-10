import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Clock, Wrench, CheckCircle, AlertCircle, Zap, FileEdit, Settings, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { RemediationTaskCard, RemediationTask, TaskStatus } from './RemediationTaskCard';
import { RemediationProgress, FixResult } from './RemediationProgress';
import { hasQuickFixTemplate } from '@/data/quickFixTemplates';
import { FixTypeBadge } from '@/components/remediation/FixTypeBadge';
import { applyQuickFixToEpub } from '@/services/quickfix.service';
import { useRemediationConfig } from '@/hooks/useRemediationConfig';
import type { QuickFix } from '@/types/quickfix.types';

export interface RemediationPlan {
  jobId: string;
  epubFileName: string;
  tasks: RemediationTask[];
}

interface RemediationPlanViewProps {
  plan: RemediationPlan;
  isRunningRemediation: boolean;
  currentTask: string | null;
  completedFixes: FixResult[];
  totalAuditIssues?: number;
  onRunAutoRemediation: () => void;
  onCancelRemediation?: () => void;
  onMarkTaskFixed?: (taskId: string, notes?: string) => Promise<void>;
  onSkipTask?: (taskId: string, reason?: string) => Promise<void>;
  onRefreshPlan?: () => void;
}

export const RemediationPlanView: React.FC<RemediationPlanViewProps> = ({
  plan,
  isRunningRemediation,
  currentTask,
  completedFixes,
  totalAuditIssues,
  onRunAutoRemediation,
  onCancelRemediation,
  onMarkTaskFixed,
  onSkipTask,
  onRefreshPlan,
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const taskRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data: config } = useRemediationConfig();
  const colorContrastAutoFix = config?.colorContrastAutoFix ?? true;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleQuickFixApply = useCallback(async (taskId: string, fix: QuickFix) => {
    try {
      const mappedChanges = fix.changes.map(change => ({
        type: change.type,
        filePath: change.filePath,
        content: change.content,
        oldContent: change.oldContent,
        lineNumber: change.lineNumber,
        description: change.description,
      }));
      const result = await applyQuickFixToEpub(plan.jobId, taskId, mappedChanges);
      if (result.success) {
        await onMarkTaskFixed?.(taskId, `Quick fix applied to: ${result.modifiedFiles.join(', ')}`);

        const currentIndex = plan.tasks.findIndex(t => t.id === taskId);
        const nextPendingTask = plan.tasks.slice(currentIndex + 1).find(t =>
          t.status === 'pending' && (t.fixType === 'quickfix' || (t.type === 'manual' && hasQuickFixTemplate(t.code)))
        );

        if (nextPendingTask) {
          timeoutRef.current = setTimeout(() => {
            setExpandedTaskId(nextPendingTask.id);
            taskRefs.current[nextPendingTask.id]?.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }, 300);
        } else {
          setExpandedTaskId(null);
        }

        onRefreshPlan?.();
      }
    } catch (error) {
      console.error('Failed to apply quick fix:', error);
      throw error;
    }
  }, [plan.jobId, plan.tasks, onMarkTaskFixed, onRefreshPlan]);

  const getEffectiveFixType = (task: RemediationTask) => 
    task.fixType || (task.type === 'auto' ? 'auto' : hasQuickFixTemplate(task.code) ? 'quickfix' : 'manual');

  const totalTasks = plan.tasks.length;
  const autoTasks = plan.tasks.filter(t => getEffectiveFixType(t) === 'auto');
  const quickFixTasks = plan.tasks.filter(t => getEffectiveFixType(t) === 'quickfix');
  const pureManualTasks = plan.tasks.filter(t => getEffectiveFixType(t) === 'manual');
  const completedTasks = plan.tasks.filter(t => t.status === 'completed');
  const failedTasks = plan.tasks.filter(t => t.status === 'failed');
  const pendingAutoTasks = autoTasks.filter(t => t.status === 'pending');
  const pendingQuickFixTasks = quickFixTasks.filter(t => t.status === 'pending');
  const excludedIssues = totalAuditIssues !== undefined && totalAuditIssues > totalTasks 
    ? totalAuditIssues - totalTasks 
    : 0;

  const autoCompleted = autoTasks.filter(t => t.status === 'completed').length;
  const quickFixCompleted = quickFixTasks.filter(t => t.status === 'completed').length;
  const manualCompleted = pureManualTasks.filter(t => t.status === 'completed').length;

  const getCompletionStatus = (completed: number, total: number) => {
    if (total === 0) return 'empty';
    if (completed === total) return 'complete';
    if (completed === 0) return 'pending';
    return 'partial';
  };

  const getCompletionIcon = (status: string) => {
    switch (status) {
      case 'complete': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'partial': return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default: return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const completionPercent = totalTasks > 0 
    ? Math.round((completedTasks.length / totalTasks) * 100) 
    : 0;

  const estimatedTimeMinutes = Math.ceil(pendingAutoTasks.length * 0.5);

  const statusCounts: Record<TaskStatus, number> = {
    pending: plan.tasks.filter(t => t.status === 'pending').length,
    in_progress: plan.tasks.filter(t => t.status === 'in_progress').length,
    completed: completedTasks.length,
    failed: failedTasks.length,
    skipped: plan.tasks.filter(t => t.status === 'skipped').length,
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary-600" />
            Remediation Plan
          </CardTitle>
          <CardDescription>
            Review and fix accessibility issues in your EPUB
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <FileText className="h-8 w-8 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{plan.epubFileName}</p>
              <p className="text-sm text-gray-500">
                {totalTasks} issues to address
                {excludedIssues > 0 && (
                  <span className="text-amber-600 ml-1">
                    ({excludedIssues} issue{excludedIssues !== 1 ? 's' : ''} ha{excludedIssues !== 1 ? 've' : 's'} no automated fix)
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-700">Color Contrast:</span>
              {colorContrastAutoFix ? (
                <Badge variant="success" size="sm">Auto-Fix</Badge>
              ) : (
                <Badge variant="info" size="sm">Manual Review</Badge>
              )}
            </div>
            <Link
              to="/settings"
              className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
            >
              Change in Settings
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-700">{totalTasks}</p>
              <p className="text-xs text-gray-600">Total Tasks</p>
            </div>
            <div className={`text-center p-3 rounded-lg border ${
              getCompletionStatus(autoCompleted, autoTasks.length) === 'complete' 
                ? 'bg-green-100 border-green-300' 
                : 'bg-green-50 border-green-200'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                {getCompletionIcon(getCompletionStatus(autoCompleted, autoTasks.length))}
                <p className="text-2xl font-bold text-green-700">{autoTasks.length}</p>
              </div>
              <p className="text-xs text-green-600 flex items-center justify-center gap-1">
                <Zap className="h-3 w-3" />
                Auto-Fixable
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({autoCompleted}/{autoTasks.length} complete)
              </p>
            </div>
            <div className={`text-center p-3 rounded-lg border ${
              getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'complete' 
                ? 'bg-green-100 border-green-300' 
                : getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'partial'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                {getCompletionIcon(getCompletionStatus(quickFixCompleted, quickFixTasks.length))}
                <p className={`text-2xl font-bold ${
                  getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'complete'
                    ? 'text-green-700'
                    : getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'partial'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                }`}>{quickFixTasks.length}</p>
              </div>
              <p className={`text-xs flex items-center justify-center gap-1 ${
                getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'complete'
                  ? 'text-green-600'
                  : getCompletionStatus(quickFixCompleted, quickFixTasks.length) === 'partial'
                    ? 'text-yellow-600'
                    : 'text-blue-600'
              }`}>
                <Wrench className="h-3 w-3" />
                Quick Fix
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({quickFixCompleted}/{quickFixTasks.length} complete)
              </p>
            </div>
            <div className={`text-center p-3 rounded-lg border ${
              getCompletionStatus(manualCompleted, pureManualTasks.length) === 'complete' 
                ? 'bg-green-100 border-green-300' 
                : getCompletionStatus(manualCompleted, pureManualTasks.length) === 'partial'
                  ? 'bg-yellow-50 border-yellow-200'
                  : 'bg-yellow-50 border-yellow-200'
            }`}>
              <div className="flex items-center justify-center gap-1 mb-1">
                {getCompletionIcon(getCompletionStatus(manualCompleted, pureManualTasks.length))}
                <p className={`text-2xl font-bold ${
                  getCompletionStatus(manualCompleted, pureManualTasks.length) === 'complete'
                    ? 'text-green-700'
                    : 'text-yellow-700'
                }`}>{pureManualTasks.length}</p>
              </div>
              <p className={`text-xs flex items-center justify-center gap-1 ${
                getCompletionStatus(manualCompleted, pureManualTasks.length) === 'complete'
                  ? 'text-green-600'
                  : 'text-yellow-600'
              }`}>
                <FileEdit className="h-3 w-3" />
                Manual
              </p>
              <p className="text-xs text-gray-500 mt-1">
                ({manualCompleted}/{pureManualTasks.length} complete)
              </p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-2xl font-bold text-purple-700">{completionPercent}%</p>
              <p className="text-xs text-purple-600 flex items-center justify-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Complete
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overall Progress</span>
              <span className="font-medium">{completedTasks.length} / {totalTasks}</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>

          {estimatedTimeMinutes > 0 && pendingAutoTasks.length > 0 && !isRunningRemediation && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Estimated time: ~{estimatedTimeMinutes} minute{estimatedTimeMinutes !== 1 ? 's' : ''}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {statusCounts.completed > 0 && (
              <Badge variant="success" size="sm">
                <CheckCircle className="h-3 w-3 mr-1" />
                {statusCounts.completed} Fixed
              </Badge>
            )}
            {statusCounts.failed > 0 && (
              <Badge variant="error" size="sm">
                <AlertCircle className="h-3 w-3 mr-1" />
                {statusCounts.failed} Failed
              </Badge>
            )}
            {statusCounts.pending > 0 && (
              <Badge variant="default" size="sm">
                {statusCounts.pending} Pending
              </Badge>
            )}
          </div>

          {!isRunningRemediation && pendingAutoTasks.length > 0 && (
            <Button
              onClick={onRunAutoRemediation}
              className="w-full"
              size="lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              Run Auto-Remediation ({pendingAutoTasks.length} tasks)
            </Button>
          )}

          {!isRunningRemediation && pendingAutoTasks.length === 0 && pendingQuickFixTasks.length > 0 && (
            <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <Wrench className="h-4 w-4 inline mr-1" />
                No auto-fixable tasks remaining. Use the Quick Fix Panel below to resolve {pendingQuickFixTasks.length} issue{pendingQuickFixTasks.length !== 1 ? 's' : ''}.
              </p>
            </div>
          )}

          {pendingQuickFixTasks.length > 0 && (
            <p className="text-sm text-blue-600">
              <Wrench className="h-4 w-4 inline mr-1" />
              {pendingQuickFixTasks.length} issue{pendingQuickFixTasks.length !== 1 ? 's' : ''} can be fixed using the Quick Fix Panel (your input needed)
            </p>
          )}

          {pureManualTasks.filter(t => t.status === 'pending').length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-700">
                <FileEdit className="h-4 w-4" />
                <span className="font-medium text-sm">
                  {pureManualTasks.filter(t => t.status === 'pending').length} issue{pureManualTasks.filter(t => t.status === 'pending').length !== 1 ? 's' : ''} require manual editing
                </span>
              </div>
              <p className="text-xs text-yellow-600 mt-1 ml-6">
                These need to be fixed using Sigil or another EPUB editor.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-3 border-t">
            <div className="flex items-center gap-1">
              <FixTypeBadge fixType="auto" size="sm" />
              <span>= Fixed automatically</span>
            </div>
            <div className="flex items-center gap-1">
              <FixTypeBadge fixType="quickfix" size="sm" />
              <span>= Use in-app Quick Fix Panel</span>
            </div>
            <div className="flex items-center gap-1">
              <FixTypeBadge fixType="manual" size="sm" />
              <span>= Requires Sigil/external editor</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {isRunningRemediation && (
        <RemediationProgress
          currentTask={currentTask}
          tasksCompleted={completedFixes.length}
          tasksTotal={autoTasks.length}
          completedFixes={completedFixes}
          isRunning={isRunningRemediation}
          onCancel={onCancelRemediation}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Tasks ({totalTasks})</span>
            <div className="flex gap-2">
              <Badge variant="success" size="sm">
                <Zap className="h-3 w-3 mr-1" />
                {autoTasks.length} Auto
              </Badge>
              <Badge variant="info" size="sm">
                <Wrench className="h-3 w-3 mr-1" />
                {quickFixTasks.length} Quick Fix
              </Badge>
              <Badge variant="warning" size="sm">
                <FileEdit className="h-3 w-3 mr-1" />
                {pureManualTasks.length} Manual
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {plan.tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500" />
                <p className="font-medium">No issues to remediate!</p>
                <p className="text-sm">Your EPUB file is accessibility compliant.</p>
              </div>
            ) : (
              plan.tasks.map((task) => (
                <div
                  key={task.id}
                  ref={(el) => { taskRefs.current[task.id] = el; }}
                  id={`task-${task.id}`}
                >
                  <RemediationTaskCard
                    task={task}
                    jobId={plan.jobId}
                    isExpanded={expandedTaskId === task.id}
                    onToggleExpand={() => 
                      setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
                    }
                    onMarkFixed={onMarkTaskFixed}
                    onQuickFixApply={handleQuickFixApply}
                    onSkipTask={onSkipTask}
                    onFixApplied={onRefreshPlan}
                  />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
