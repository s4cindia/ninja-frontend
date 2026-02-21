import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight } from 'lucide-react';
import { workflowService } from '@/services/workflowService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/services/api';

interface WorkflowTimelineProps {
  workflowId: string;
}

const ACTIVE_STATES = new Set([
  'UPLOAD_RECEIVED',
  'PREPROCESSING',
  'RUNNING_EPUBCHECK',
  'RUNNING_ACE',
  'RUNNING_AI_ANALYSIS',
  'AWAITING_AI_REVIEW',
  'AUTO_REMEDIATION',
  'AWAITING_REMEDIATION_REVIEW',
  'VERIFICATION_AUDIT',
  'CONFORMANCE_MAPPING',
  'AWAITING_CONFORMANCE_REVIEW',
  'ACR_GENERATION',
  'AWAITING_ACR_SIGNOFF',
  'PAUSED',
]);

function toTitleCase(snake: string): string {
  return snake
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimestamp(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function WorkflowTimeline({ workflowId }: WorkflowTimelineProps) {
  const currentStateRef = useRef<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflow-timeline', workflowId],
    queryFn: () => workflowService.getTimeline(workflowId),
    refetchInterval: () => {
      // Keep polling while the workflow is still active
      return ACTIVE_STATES.has(currentStateRef.current) ? 10_000 : false;
    },
  });

  // Track the latest state from timeline events to decide polling interval
  useEffect(() => {
    if (!data?.events.length) return;
    const latest = data.events[0];
    if (latest?.to) {
      currentStateRef.current = latest.to.toUpperCase();
    }
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="error" title="Failed to load timeline">
        {getErrorMessage(error)}
      </Alert>
    );
  }

  const events = data?.events ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No events recorded yet.</p>
        ) : (
          <ol className="relative border-l border-gray-200 space-y-6 pl-6">
            {/* Newest first */}
            {[...events].reverse().map((event, idx) => (
              <li key={event.id ?? idx} className="relative">
                {/* Timeline dot */}
                <span
                  className="absolute -left-[25px] top-1 w-3 h-3 rounded-full border-2 border-white bg-primary-500 shadow"
                  aria-hidden="true"
                />

                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toTitleCase(event.type)}
                  </p>

                  {event.from && event.to && (
                    <p className="flex items-center gap-1 text-xs text-gray-500">
                      <span>{toTitleCase(event.from)}</span>
                      <ArrowRight className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      <span className="font-medium text-gray-700">{toTitleCase(event.to)}</span>
                    </p>
                  )}

                  <time
                    dateTime={event.timestamp}
                    className="text-xs text-gray-400"
                  >
                    {formatTimestamp(event.timestamp)}
                  </time>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
