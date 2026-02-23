import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Clock } from 'lucide-react';
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

function toTitleCase(snake?: string | null): string {
  if (!snake) return 'Unknown';
  return snake
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTimestamp(ts?: string | null): string {
  if (!ts) return 'Unknown time';
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function WorkflowTimeline({ workflowId }: WorkflowTimelineProps) {
  const currentStateRef = useRef<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const latestEventRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['workflow-timeline', workflowId],
    queryFn: () => workflowService.getTimeline(workflowId),
    refetchInterval: () => {
      // With WebSocket, only poll every 30s as backup
      // WebSocket provides instant updates via workflow:state-change events
      return ACTIVE_STATES.has(currentStateRef.current) ? 30_000 : false;
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

  // Auto-scroll to show latest event (rightmost)
  useEffect(() => {
    if (latestEventRef.current && scrollContainerRef.current) {
      latestEventRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'end' // Scroll to the right end
      });
    }
  }, [data?.events.length]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error" title="Failed to load timeline">
            {getErrorMessage(error)}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const events = data?.events ?? [];

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Event Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 text-center py-4">No events recorded yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Horizontal timeline */}
        <div className="relative">
          <div ref={scrollContainerRef} className="overflow-x-auto pb-4">
            <div className="flex items-start min-w-max">
              {/* Oldest first for horizontal layout */}
              {[...events].reverse().map((event, idx) => {
                const isLast = idx === events.length - 1;

                return (
                  <div
                    key={event.id ?? idx}
                    ref={isLast ? latestEventRef : null}
                    className="flex items-center"
                  >
                    {/* Event card */}
                    <div className="flex flex-col items-center" style={{ minWidth: '180px' }}>
                      {/* Event dot */}
                      <div className="relative">
                        <span
                          className="flex h-3 w-3 rounded-full border-2 border-white bg-primary-500 shadow"
                          aria-hidden="true"
                        />
                      </div>

                      {/* Event content */}
                      <div className="mt-3 text-center px-2" style={{ maxWidth: '160px' }}>
                        <p className="text-xs font-medium text-gray-900 truncate">
                          {toTitleCase(event.type)}
                        </p>

                        {event.from && event.to && (
                          <div className="flex items-center justify-center gap-1 mt-1">
                            <span className="text-[10px] text-gray-500 truncate max-w-[60px]">
                              {toTitleCase(event.from)}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                            <span className="text-[10px] font-medium text-gray-700 truncate max-w-[60px]">
                              {toTitleCase(event.to)}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-center gap-1 mt-1">
                          <Clock className="w-2.5 h-2.5 text-gray-400" aria-hidden="true" />
                          <time
                            dateTime={event.timestamp}
                            className="text-[10px] text-gray-400"
                          >
                            {formatTimestamp(event.timestamp)}
                          </time>
                        </div>
                      </div>
                    </div>

                    {/* Connecting line */}
                    {!isLast && (
                      <div className="flex items-center" style={{ width: '60px', marginBottom: '80px' }}>
                        <div className="h-0.5 w-full bg-primary-200" aria-hidden="true" />
                        <ArrowRight className="w-3 h-3 text-primary-300 -ml-1.5" aria-hidden="true" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
