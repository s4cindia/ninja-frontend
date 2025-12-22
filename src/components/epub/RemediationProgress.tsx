import React from 'react';
import { CheckCircle, XCircle, Loader2, Wrench } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export interface FixResult {
  taskId: string;
  code: string;
  message: string;
  success: boolean;
}

interface RemediationProgressProps {
  currentTask: string | null;
  tasksCompleted: number;
  tasksTotal: number;
  completedFixes: FixResult[];
  isRunning: boolean;
  onCancel?: () => void;
}

export const RemediationProgress: React.FC<RemediationProgressProps> = ({
  currentTask,
  tasksCompleted,
  tasksTotal,
  completedFixes,
  isRunning,
  onCancel,
}) => {
  const progressPercent = tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0;
  const tasksRemaining = tasksTotal - tasksCompleted;

  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wrench className="h-5 w-5 text-blue-600" />
          Auto-Remediation Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">
              {isRunning ? 'Fixing accessibility issues...' : 'Remediation complete'}
            </span>
            <span className="font-medium text-gray-900">{progressPercent}%</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{tasksCompleted} of {tasksTotal} tasks completed</span>
            {tasksRemaining > 0 && isRunning && (
              <span>{tasksRemaining} remaining</span>
            )}
          </div>
        </div>

        {currentTask && isRunning && (
          <div className="flex items-center gap-2 text-sm bg-white rounded-lg p-3 border">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 flex-shrink-0" />
            <span className="text-gray-700 truncate">
              Fixing: <span className="font-medium">{currentTask}</span>
            </span>
          </div>
        )}

        {completedFixes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Completed Fixes
            </h4>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {completedFixes.map((fix) => (
                <div
                  key={fix.taskId}
                  className={clsx(
                    'flex items-center gap-2 text-sm p-2 rounded',
                    fix.success ? 'bg-green-50' : 'bg-red-50'
                  )}
                >
                  {fix.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                  )}
                  <span className="text-gray-700 truncate">
                    <span className="font-mono text-xs">{fix.code}</span>
                    <span className="mx-1">-</span>
                    <span>{fix.message}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {onCancel && isRunning && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="w-full"
          >
            Cancel Remediation
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
