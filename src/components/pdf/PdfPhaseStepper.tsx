/**
 * PdfPhaseStepper
 *
 * Horizontal, at-a-glance header strip showing which of the 5 consolidated
 * phases (see src/utils/pdfPhaseStepper.ts) is running and how long each
 * phase is taking/took. Purely additive next to the existing, far more
 * detailed RemediationChecklist card — this is a summary, not a replacement.
 *
 * Presentational only: phases are computed by derivePhases and passed in
 * as a prop. The one piece of local state here is the per-second re-render
 * for whichever phase has a `liveSince` anchor (Auto Mode's current run) —
 * everything else is a pure function of props.
 */

import { Fragment } from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/duration';
import { useLiveTick } from '@/hooks/useLiveTick';
import type { Phase, PhaseStatus } from '@/utils/pdfPhaseStepper';

interface PdfPhaseStepperProps {
  phases: Phase[];
}

function StatusIcon({ status }: { status: PhaseStatus }) {
  switch (status) {
    case 'done':
      return <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />;
    case 'in-progress':
      return <Loader2 className="h-5 w-5 text-blue-600 shrink-0 animate-spin" />;
    default:
      return <Circle className="h-5 w-5 text-gray-300 shrink-0" />;
  }
}

const LABEL_COLOR: Record<PhaseStatus, string> = {
  done: 'text-gray-900',
  'in-progress': 'text-blue-700',
  'not-started': 'text-gray-400',
};

export function PdfPhaseStepper({ phases }: PdfPhaseStepperProps) {
  const hasLiveAnchor = phases.some(p => p.liveSince);
  const now = useLiveTick(hasLiveAnchor);

  return (
    <div
      className="flex items-center gap-1 px-6 py-3 bg-white border-b border-gray-200 overflow-x-auto"
      data-testid="pdf-phase-stepper"
    >
      {phases.map((phase, idx) => {
        const liveMs = phase.liveSince ? now - new Date(phase.liveSince).getTime() : undefined;
        const timeLabel = liveMs != null && liveMs >= 0
          ? formatDuration(liveMs)
          : phase.durationMs != null
            ? formatDuration(phase.durationMs)
            : undefined;

        return (
          <Fragment key={phase.id}>
            <div className="flex items-center gap-2 shrink-0" data-testid={`pdf-phase-${phase.id}`}>
              <StatusIcon status={phase.status} />
              <div className="flex flex-col leading-tight">
                <span className={cn('text-sm font-medium', LABEL_COLOR[phase.status])}>
                  {phase.label}
                </span>
                {(phase.detail || timeLabel) && (
                  <span className="text-xs text-gray-500">
                    {[phase.detail, timeLabel].filter(Boolean).join(' · ')}
                  </span>
                )}
              </div>
            </div>
            {idx < phases.length - 1 && (
              <div className={cn('h-px w-8 mx-1 shrink-0', phase.status === 'done' ? 'bg-green-300' : 'bg-gray-300')} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
