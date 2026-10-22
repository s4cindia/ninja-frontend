import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PdfPhaseStepper } from './PdfPhaseStepper';
import type { Phase } from '@/utils/pdfPhaseStepper';

function phase(overrides: Partial<Phase> & Pick<Phase, 'id' | 'label' | 'status'>): Phase {
  return { ...overrides };
}

const FIVE_PHASES: Phase[] = [
  phase({ id: 'audit', label: 'Audit', status: 'done', durationMs: 120_000 }),
  phase({ id: 'ai-analysis', label: 'AI Analysis', status: 'not-started' }),
  phase({ id: 'remediation', label: 'Remediation', status: 'not-started' }),
  phase({ id: 'verification', label: 'Verification', status: 'not-started' }),
  phase({ id: 'compliance', label: 'Compliance', status: 'not-started' }),
];

describe('PdfPhaseStepper', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders all 5 phases in order with their labels', () => {
    render(<PdfPhaseStepper phases={FIVE_PHASES} />);

    const container = screen.getByTestId('pdf-phase-stepper');
    expect(container).toHaveTextContent('Audit');
    expect(container).toHaveTextContent('AI Analysis');
    expect(container).toHaveTextContent('Remediation');
    expect(container).toHaveTextContent('Verification');
    expect(container).toHaveTextContent('Compliance');
  });

  it('shows a formatted duration for a done phase', () => {
    render(<PdfPhaseStepper phases={FIVE_PHASES} />);

    expect(screen.getByTestId('pdf-phase-audit')).toHaveTextContent('2m 0s');
  });

  it('shows a detail string for an in-progress phase (e.g. Round N) without a liveSince anchor', () => {
    const phases = FIVE_PHASES.map(p => p.id === 'remediation' ? { ...p, status: 'in-progress' as const, detail: 'Round 3' } : p);
    render(<PdfPhaseStepper phases={phases} />);

    expect(screen.getByTestId('pdf-phase-remediation')).toHaveTextContent('Round 3');
  });

  it('combines detail and a live-ticking duration for a phase with a liveSince anchor', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:10.000Z'));
    const phases = FIVE_PHASES.map(p => p.id === 'remediation'
      ? { ...p, status: 'in-progress' as const, detail: 'Round 1', liveSince: '2026-10-01T12:00:00.000Z' }
      : p
    );

    render(<PdfPhaseStepper phases={phases} />);

    const remediation = screen.getByTestId('pdf-phase-remediation');
    expect(remediation).toHaveTextContent('Round 1');
    expect(remediation).toHaveTextContent('10s');
  });

  it('ticks the live duration forward every second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
    const phases = FIVE_PHASES.map(p => p.id === 'remediation'
      ? { ...p, status: 'in-progress' as const, liveSince: '2026-10-01T12:00:00.000Z' }
      : p
    );

    render(<PdfPhaseStepper phases={phases} />);
    expect(screen.getByTestId('pdf-phase-remediation')).toHaveTextContent('0s');

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.getByTestId('pdf-phase-remediation')).toHaveTextContent('5s');
  });

  it('does not show a duration/detail line for a not-started phase with neither', () => {
    render(<PdfPhaseStepper phases={FIVE_PHASES} />);

    const aiAnalysis = screen.getByTestId('pdf-phase-ai-analysis');
    // Only the label text, nothing else below it.
    expect(aiAnalysis.textContent).toBe('AI Analysis');
  });

  it('does not run a ticking interval at all when no phase has a liveSince anchor', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    render(<PdfPhaseStepper phases={FIVE_PHASES} />);

    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  describe('total-time indicator', () => {
    it('renders nothing when pipelineStartedAt is omitted', () => {
      render(<PdfPhaseStepper phases={FIVE_PHASES} />);

      expect(screen.queryByTestId('pdf-phase-stepper-total')).not.toBeInTheDocument();
    });

    it('regression (CodeRabbit): hides the total when the pipeline is ALREADY complete on the very first render, rather than guessing from Date.now() -- opening an already-finished job must not silently count however long ago it actually finished', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-01T15:00:00.000Z')); // hours after pipelineStartedAt
      const allDone = FIVE_PHASES.map(p => ({ ...p, status: 'done' as const }));

      render(<PdfPhaseStepper phases={allDone} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);

      expect(screen.queryByTestId('pdf-phase-stepper-total')).not.toBeInTheDocument();
    });

    it('ticks live while the last phase in the array is not done', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

      render(<PdfPhaseStepper phases={FIVE_PHASES} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 0s');

      act(() => {
        vi.advanceTimersByTime(90_000);
      });

      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 1m 30s');
    });

    it('freezes once the last phase becomes done and does not resume ticking afterward', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

      const { rerender } = render(<PdfPhaseStepper phases={FIVE_PHASES} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);

      act(() => {
        vi.advanceTimersByTime(90_000);
      });
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 1m 30s');

      const allDone = FIVE_PHASES.map(p => ({ ...p, status: 'done' as const }));
      rerender(<PdfPhaseStepper phases={allDone} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 1m 30s');

      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      // Still 1m 30s -- frozen, not 2m 30s.
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 1m 30s');
    });

    it('follows whichever phase is actually last in the array, not a hardcoded Compliance check -- the PDF Batch item view only passes 3 phases', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));
      const threePhases: Phase[] = [
        phase({ id: 'audit', label: 'Audit', status: 'done', durationMs: 60_000 }),
        phase({ id: 'ai-analysis', label: 'AI Analysis', status: 'done', durationMs: 120_000 }),
        phase({ id: 'remediation', label: 'Remediation', status: 'in-progress', detail: 'Round 1' }),
      ];

      const { rerender } = render(<PdfPhaseStepper phases={threePhases} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);
      act(() => {
        vi.advanceTimersByTime(30_000);
      });
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 30s');

      const allDone = threePhases.map(p => ({ ...p, status: 'done' as const }));
      rerender(<PdfPhaseStepper phases={allDone} pipelineStartedAt="2026-10-01T12:00:00.000Z" />);
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      // Froze at Remediation's own completion, not stuck waiting for a
      // Verification/Compliance phase that was never passed in.
      expect(screen.getByTestId('pdf-phase-stepper-total')).toHaveTextContent('Total: 30s');
    });
  });
});
