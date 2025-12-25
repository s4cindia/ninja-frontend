import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, Loader2, Clock, AlertTriangle, Wrench, Hand } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { clsx } from 'clsx';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
export type TaskType = 'auto' | 'manual';

export interface RemediationTask {
  id: string;
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  location?: string;
  suggestion?: string;
  type: TaskType;
  status: TaskStatus;
  notes?: string;
  completionMethod?: 'auto' | 'manual';
}

interface RemediationTaskCardProps {
  task: RemediationTask;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  onMarkFixed?: (taskId: string, notes?: string) => Promise<void>;
}

const statusConfig: Record<TaskStatus, { icon: React.ReactNode; bgColor: string; textColor: string; label: string }> = {
  pending: {
    icon: <Clock className="h-4 w-4" />,
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    label: 'Pending',
  },
  in_progress: {
    icon: <Loader2 className="h-4 w-4 animate-spin" />,
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    label: 'In Progress',
  },
  completed: {
    icon: <CheckCircle className="h-4 w-4" />,
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    label: 'Completed',
  },
  failed: {
    icon: <XCircle className="h-4 w-4" />,
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    label: 'Failed',
  },
  skipped: {
    icon: <AlertTriangle className="h-4 w-4" />,
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-600',
    label: 'Skipped',
  },
};

const severityConfig: Record<string, { variant: 'error' | 'warning' | 'info' | 'default' }> = {
  critical: { variant: 'error' },
  serious: { variant: 'error' },
  moderate: { variant: 'warning' },
  minor: { variant: 'info' },
};

export const RemediationTaskCard: React.FC<RemediationTaskCardProps> = ({
  task,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onMarkFixed,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isExpanded = controlledExpanded ?? internalExpanded;
  
  const handleToggle = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const handleMarkFixed = async () => {
    if (!onMarkFixed) return;
    setIsSubmitting(true);
    try {
      await onMarkFixed(task.id, notes || undefined);
      setShowNotes(false);
      setNotes('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const status = statusConfig[task.status];
  const severity = severityConfig[task.severity] || { variant: 'default' as const };

  return (
    <div
      className={clsx(
        'border rounded-lg transition-all',
        status.bgColor,
        'hover:shadow-sm'
      )}
    >
      <button
        onClick={handleToggle}
        className="w-full p-4 flex items-start gap-3 text-left"
        aria-expanded={isExpanded}
      >
        <div className={clsx('mt-0.5 flex-shrink-0', status.textColor)}>
          {status.icon}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <Badge variant="default" size="sm">{task.code}</Badge>
            <Badge variant={severity.variant} size="sm">{task.severity}</Badge>
            <Badge 
              variant={task.type === 'auto' ? 'success' : 'info'} 
              size="sm"
            >
              {task.type === 'auto' ? (
                <>
                  <Wrench className="h-3 w-3 mr-1" />
                  Auto
                </>
              ) : (
                <>
                  <Hand className="h-3 w-3 mr-1" />
                  Manual
                </>
              )}
            </Badge>
            <span className={clsx('text-xs font-medium ml-auto', status.textColor)}>
              {status.label}
            </span>
          </div>
          
          <p className="text-sm text-gray-800 line-clamp-2">{task.message}</p>
          
          {task.location && !isExpanded && (
            <p className="text-xs text-gray-500 mt-1 truncate">{task.location}</p>
          )}
        </div>
        
        <div className="flex-shrink-0 text-gray-400">
          {isExpanded ? (
            <ChevronUp className="h-5 w-5" />
          ) : (
            <ChevronDown className="h-5 w-5" />
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-200 bg-white/50">
          <dl className="space-y-2 text-sm">
            {task.location && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Location</dt>
                <dd className="text-gray-700 font-mono text-xs mt-0.5">{task.location}</dd>
              </div>
            )}
            
            {task.suggestion && (
              <div>
                <dt className="text-xs font-medium text-gray-500">Suggestion</dt>
                <dd className="text-gray-700 mt-0.5">{task.suggestion}</dd>
              </div>
            )}
            
            {task.type === 'manual' && task.status === 'completed' && task.notes && (
              <div className="flex items-start gap-2 text-green-700 bg-green-50 p-2 rounded mt-2">
                <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="text-xs font-medium">Fixed manually</span>
                  <p className="text-xs text-green-600 mt-0.5">{task.notes}</p>
                </div>
              </div>
            )}
            
            {task.type === 'manual' && task.status === 'pending' && onMarkFixed && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                {!showNotes ? (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowNotes(true);
                    }}
                    size="sm"
                    className="w-full"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Manually Fixed
                  </Button>
                ) : (
                  <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Describe what was fixed (optional)..."
                      className="w-full p-2 border rounded text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      rows={2}
                      aria-label="Notes about fix"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleMarkFixed}
                        disabled={isSubmitting}
                        size="sm"
                      >
                        {isSubmitting ? 'Saving...' : 'Confirm Fixed'}
                      </Button>
                      <Button
                        onClick={() => {
                          setShowNotes(false);
                          setNotes('');
                        }}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {task.type === 'manual' && task.status === 'pending' && !onMarkFixed && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded mt-2">
                <Hand className="h-4 w-4" />
                <span className="text-xs font-medium">This issue requires manual intervention</span>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  );
};
