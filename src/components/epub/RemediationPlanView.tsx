import React, { useState } from 'react';
import { FileText, Clock, Wrench, Hand, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { RemediationTaskCard, RemediationTask, TaskStatus } from './RemediationTaskCard';
import { RemediationProgress, FixResult } from './RemediationProgress';

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
  onRunAutoRemediation: () => void;
  onCancelRemediation?: () => void;
  onMarkTaskFixed?: (taskId: string, notes?: string) => Promise<void>;
}

export const RemediationPlanView: React.FC<RemediationPlanViewProps> = ({
  plan,
  isRunningRemediation,
  currentTask,
  completedFixes,
  onRunAutoRemediation,
  onCancelRemediation,
  onMarkTaskFixed,
}) => {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const totalTasks = plan.tasks.length;
  const autoTasks = plan.tasks.filter(t => t.type === 'auto');
  const manualTasks = plan.tasks.filter(t => t.type === 'manual');
  const completedTasks = plan.tasks.filter(t => t.status === 'completed');
  const failedTasks = plan.tasks.filter(t => t.status === 'failed');
  const pendingAutoTasks = autoTasks.filter(t => t.status === 'pending');

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
              <p className="text-sm text-gray-500">{totalTasks} issues to address</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-700">{totalTasks}</p>
              <p className="text-xs text-blue-600">Total Tasks</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-700">{autoTasks.length}</p>
              <p className="text-xs text-green-600">Auto-Fixable</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-700">{manualTasks.length}</p>
              <p className="text-xs text-amber-600">Manual</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-700">{completionPercent}%</p>
              <p className="text-xs text-purple-600">Complete</p>
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
              <Wrench className="h-5 w-5 mr-2" />
              Run Auto-Remediation ({pendingAutoTasks.length} tasks)
            </Button>
          )}
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
                <Wrench className="h-3 w-3 mr-1" />
                {autoTasks.length} Auto
              </Badge>
              <Badge variant="info" size="sm">
                <Hand className="h-3 w-3 mr-1" />
                {manualTasks.length} Manual
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
                <RemediationTaskCard
                  key={task.id}
                  task={task}
                  isExpanded={expandedTaskId === task.id}
                  onToggleExpand={() => 
                    setExpandedTaskId(expandedTaskId === task.id ? null : task.id)
                  }
                  onMarkFixed={onMarkTaskFixed}
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
