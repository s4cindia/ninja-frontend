import { clsx } from 'clsx';
import { Progress } from '@/components/ui/Progress';
import { Clock } from 'lucide-react';

interface WorkflowProgressBarProps {
  currentState: string;
  phase: string;
  progress: number;
}

const PHASE_LABELS: Record<string, string> = {
  ingest: 'Ingest',
  audit: 'Audit',
  remediate: 'Remediate',
  certify: 'Certify',
  complete: 'Complete',
  failed: 'Failed',
};

function toTitleCase(snake: string): string {
  return snake
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function isAwaitingState(state: string): boolean {
  return state.toUpperCase().startsWith('AWAITING_');
}

function getProgressVariant(
  phase: string,
  state: string
): 'default' | 'success' | 'warning' | 'error' {
  const upper = state.toUpperCase();
  if (upper === 'FAILED' || upper === 'CANCELLED') return 'error';
  if (upper === 'COMPLETED') return 'success';
  if (isAwaitingState(state)) return 'warning';
  if (phase.toLowerCase() === 'failed') return 'error';
  return 'default';
}

export function WorkflowProgressBar({ currentState, phase, progress }: WorkflowProgressBarProps) {
  const phaseLabel = PHASE_LABELS[phase.toLowerCase()] ?? toTitleCase(phase);
  const stateLabel = toTitleCase(currentState);
  const awaiting = isAwaitingState(currentState);
  const variant = getProgressVariant(phase, currentState);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
              variant === 'error' && 'bg-red-100 text-red-700',
              variant === 'success' && 'bg-green-100 text-green-700',
              variant === 'warning' && 'bg-yellow-100 text-yellow-700',
              variant === 'default' && 'bg-blue-100 text-blue-700'
            )}
          >
            {phaseLabel}
          </span>
          <span className="text-gray-700 font-medium">{stateLabel}</span>
        </div>
        <span className="text-gray-500 tabular-nums">{Math.round(progress)}%</span>
      </div>

      <Progress value={progress} size="lg" variant={variant} />

      {awaiting && (
        <div className="flex items-center gap-1.5 text-xs text-yellow-700">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Waiting for human review</span>
        </div>
      )}
    </div>
  );
}
