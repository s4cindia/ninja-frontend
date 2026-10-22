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

import { Fragment, useRef } from 'react';
import { CheckCircle, Circle, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatDuration } from '@/utils/duration';
import { useLiveTick } from '@/hooks/useLiveTick';
import type { Phase, PhaseStatus } from '@/utils/pdfPhaseStepper';

interface PdfPhaseStepperProps {
  phases: Phase[];
  /**
   * Pipeline's own start anchor -- the same timestamp the caller already
   * passes as auditResult.createdAt/jobData.createdAt into derivePhases.
   * Drives a live "Total: Xm Ys" indicator after the last phase, ticking
   * until the last phase in `phases` reports done, then freezing. Omit to
   * hide the indicator entirely (nothing to anchor from yet).
   */
  pipelineStartedAt?: string | null;
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

export function PdfPhaseStepper({ phases, pipelineStartedAt }: PdfPhaseStepperProps) {
  const isPipelineComplete = phases.length > 0 && phases[phases.length - 1].status === 'done';
  const hasLiveAnchor = phases.some(p => p.liveSince) || (!!pipelineStartedAt && !isPipelineComplete);
  const now = useLiveTick(hasLiveAnchor);

  // There's no backend timestamp for "the last phase finished" (e.g.
  // Compliance's own ACR/PAC generation times aren't tracked) -- this
  // captures the moment the frontend first OBSERVES completion and freezes
  // there (accurate to within one poll interval), the same kind of
  // approximation every other timing signal in this component already
  // makes. Resets whenever pipelineStartedAt itself changes (this
  // component is reused across job/batch navigations without unmounting),
  // so a stale freeze from a previous job can't leak into a new one.
  const completedAtRef = useRef<number | null>(null);
  const prevStartRef = useRef(pipelineStartedAt);
  if (prevStartRef.current !== pipelineStartedAt) {
    prevStartRef.current = pipelineStartedAt;
    completedAtRef.current = null;
  }
  if (isPipelineComplete) {
    if (completedAtRef.current === null) completedAtRef.current = Date.now();
  } else {
    completedAtRef.current = null;
  }

  const pipelineElapsedMs = pipelineStartedAt
    ? (completedAtRef.current ?? now) - new Date(pipelineStartedAt).getTime()
    : undefined;
  const totalLabel = pipelineElapsedMs != null && pipelineElapsedMs >= 0
    ? formatDuration(pipelineElapsedMs)
    : undefined;

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
      {totalLabel && (
        <span
          className="ml-4 pl-4 border-l border-gray-200 text-xs text-gray-500 shrink-0 whitespace-nowrap"
          data-testid="pdf-phase-stepper-total"
        >
          Total: {totalLabel}
        </span>
      )}
    </div>
  );
}
