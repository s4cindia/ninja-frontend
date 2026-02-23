import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Check, Circle, Clock, Loader2, Pause, X } from 'lucide-react';
import { workflowService, type WorkflowStatus } from '@/services/workflowService';
import { useWorkflowSocket } from '@/hooks/useWorkflowSocket';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/services/api';

interface WorkflowStep {
  state: string;
  label: string;
  shortLabel: string;
  isHITL: boolean;
}

interface WorkflowStepperProps {
  workflowId: string;
}

// Ordered list of all workflow states
const WORKFLOW_STEPS: WorkflowStep[] = [
  { state: 'UPLOAD_RECEIVED', label: 'Upload Received', shortLabel: 'Upload', isHITL: false },
  { state: 'PREPROCESSING', label: 'Preprocessing', shortLabel: 'Preprocess', isHITL: false },
  { state: 'RUNNING_EPUBCHECK', label: 'EPUB Validation', shortLabel: 'Validate', isHITL: false },
  { state: 'RUNNING_ACE', label: 'Accessibility Audit', shortLabel: 'Audit', isHITL: false },
  { state: 'RUNNING_AI_ANALYSIS', label: 'AI Analysis', shortLabel: 'AI Analysis', isHITL: false },
  { state: 'AWAITING_AI_REVIEW', label: 'AI Review', shortLabel: 'AI Review', isHITL: true },
  { state: 'AUTO_REMEDIATION', label: 'Auto-Remediation', shortLabel: 'Auto-Fix', isHITL: false },
  { state: 'AWAITING_REMEDIATION_REVIEW', label: 'Remediation Review', shortLabel: 'Review Fix', isHITL: true },
  { state: 'VERIFICATION_AUDIT', label: 'Verification Audit', shortLabel: 'Verify', isHITL: false },
  { state: 'CONFORMANCE_MAPPING', label: 'Conformance Mapping', shortLabel: 'Conform', isHITL: false },
  { state: 'AWAITING_CONFORMANCE_REVIEW', label: 'Conformance Review', shortLabel: 'Review', isHITL: true },
  { state: 'ACR_GENERATION', label: 'ACR Generation', shortLabel: 'ACR Gen', isHITL: false },
  { state: 'AWAITING_ACR_SIGNOFF', label: 'ACR Sign-off', shortLabel: 'Sign-off', isHITL: true },
  { state: 'COMPLETED', label: 'Completed', shortLabel: 'Done', isHITL: false },
];

function getStepStatus(
  step: WorkflowStep,
  currentState: string,
  completedStates: string[]
): 'completed' | 'current' | 'pending' {
  if (completedStates.includes(step.state)) {
    return 'completed';
  }
  if (step.state === currentState) {
    return 'current';
  }
  return 'pending';
}

function getStepTimestamp(
  state: string,
  timeline?: { to?: string; from?: string; timestamp?: string }[]
): string | null {
  if (!timeline) return null;

  // Find the event that transitioned TO this state
  const event = timeline.find((e) => e.to?.toUpperCase() === state);
  if (event?.timestamp) {
    return new Date(event.timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  return null;
}

export function WorkflowStepper({ workflowId }: WorkflowStepperProps) {
  const [localStatus, setLocalStatus] = useState<WorkflowStatus | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const currentStepRef = useRef<HTMLDivElement>(null);

  // WebSocket for real-time updates
  const { stateChange } = useWorkflowSocket(workflowId);

  // Fetch workflow status (fallback polling)
  const { data: status, isLoading: statusLoading, error: statusError } = useQuery({
    queryKey: ['workflow-status', workflowId],
    queryFn: () => workflowService.getWorkflowStatus(workflowId),
    refetchInterval: 30_000, // Slower polling since WebSocket provides instant updates
  });

  // Fetch timeline to get completed states (fallback polling)
  const { data: timelineData, isLoading: timelineLoading, refetch: refetchTimeline } = useQuery({
    queryKey: ['workflow-timeline', workflowId],
    queryFn: () => workflowService.getTimeline(workflowId),
    refetchInterval: 30_000,
  });

  // Update local status when API data changes
  useEffect(() => {
    if (status) {
      setLocalStatus(status);
    }
  }, [status]);

  // Handle WebSocket state changes for instant updates
  useEffect(() => {
    if (!stateChange) return;

    // Update local state immediately
    setLocalStatus((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentState: stateChange.to,
        phase: stateChange.phase,
      };
    });

    // Also refetch timeline to get the new event with timestamp
    refetchTimeline();
  }, [stateChange, refetchTimeline]);

  // Auto-scroll to show current step
  useEffect(() => {
    if (currentStepRef.current && scrollContainerRef.current) {
      currentStepRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center'
      });
    }
  }, [localStatus?.currentState]);

  if (statusLoading || timelineLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (statusError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error" title="Failed to load workflow status">
            {getErrorMessage(statusError)}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Use local status (updated by WebSocket) or fallback to API status
  const currentStatus = localStatus || status;
  if (!currentStatus) return null;

  const currentStateUpper = currentStatus.currentState.toUpperCase();
  const isFailed = currentStateUpper === 'FAILED';
  const isCancelled = currentStateUpper === 'CANCELLED';

  // Derive completed states from timeline events
  // All states that have been transitioned FROM are completed
  const completedStates = new Set<string>();
  timelineData?.events.forEach((event: { from?: string; to?: string }) => {
    if (event.from) {
      completedStates.add(event.from.toUpperCase());
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Horizontal stepper */}
        <div className="relative">
          <div ref={scrollContainerRef} className="overflow-x-auto pb-2">
            <div className="flex items-start min-w-max gap-0">
              {WORKFLOW_STEPS.map((step, idx) => {
                const stepStatus = getStepStatus(step, currentStateUpper, Array.from(completedStates));
                const isLast = idx === WORKFLOW_STEPS.length - 1;
                const timestamp = getStepTimestamp(step.state, timelineData?.events);
                const isCurrent = stepStatus === 'current';

                return (
                  <div
                    key={step.state}
                    ref={isCurrent ? currentStepRef : null}
                    className="flex items-start"
                    style={{ minWidth: '120px' }}
                  >
                    {/* Step container */}
                    <div className="flex flex-col items-center">
                      {/* Step indicator */}
                      <div className="relative z-10 flex-shrink-0">
                        {stepStatus === 'completed' ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 shadow-md">
                            <Check className="h-5 w-5 text-white" aria-hidden="true" />
                          </div>
                        ) : stepStatus === 'current' ? (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500 shadow-md">
                            {step.isHITL ? (
                              <Pause className="h-5 w-5 text-white" aria-hidden="true" />
                            ) : (
                              <Loader2 className="h-5 w-5 text-white animate-spin" aria-hidden="true" />
                            )}
                          </div>
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 shadow-sm">
                            <Circle className="h-4 w-4 text-gray-400" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {/* Step label */}
                      <div className="mt-2 text-center" style={{ width: '110px' }}>
                        <p
                          className={`text-xs font-medium ${
                            stepStatus === 'completed'
                              ? 'text-gray-900'
                              : stepStatus === 'current'
                              ? 'text-blue-700'
                              : 'text-gray-400'
                          }`}
                        >
                          {step.shortLabel}
                        </p>

                        {step.isHITL && stepStatus !== 'completed' && stepStatus === 'current' && (
                          <span className="inline-flex items-center gap-1 mt-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                            <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                            Review
                          </span>
                        )}

                        {stepStatus === 'completed' && timestamp && (
                          <p className="text-[10px] text-gray-500 mt-0.5">
                            {timestamp}
                          </p>
                        )}

                        {stepStatus === 'current' && (
                          <p className="text-[10px] text-blue-600 mt-0.5">
                            {step.isHITL ? 'Waiting' : 'Running'}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Connecting line */}
                    {!isLast && (
                      <div className="flex items-center" style={{ marginTop: '20px', width: '40px' }}>
                        <div
                          className={`h-0.5 w-full ${
                            stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                          }`}
                          aria-hidden="true"
                        />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Failed/Cancelled state */}
              {(isFailed || isCancelled) && (
                <>
                  <div className="flex items-center" style={{ marginTop: '20px', width: '40px' }}>
                    <div className="h-0.5 w-full bg-red-300" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col items-center" style={{ minWidth: '120px' }}>
                    <div className="relative z-10 flex-shrink-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500 shadow-md">
                        <X className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                    </div>
                    <div className="mt-2 text-center" style={{ width: '110px' }}>
                      <p className="text-xs font-medium text-red-700">
                        {isFailed ? 'Failed' : 'Cancelled'}
                      </p>
                      <p className="text-[10px] text-red-600 mt-0.5">
                        Stopped
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
