import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoModeStatusCard } from './AutoModeStatusCard';
import type { AutoModeStatusResponse } from '@/types/pdfAutoMode.types';
import type { AutoModeRound } from '@/hooks/useAutoMode';

function status(overrides?: Partial<AutoModeStatusResponse>): AutoModeStatusResponse {
  return {
    mode: 'auto',
    autoStatus: 'running',
    autoStopReason: null,
    autoRoundsCompleted: 3,
    autoMaxRounds: 10,
    autoCostSpentUsd: 0.42,
    autoCostLimitUsd: 2,
    autoColorContrastMode: null,
    ...overrides,
  };
}

function renderCard(
  overrides?: Partial<AutoModeStatusResponse>,
  props?: { isStopping?: boolean; stopError?: unknown; stopSucceeded?: boolean; rounds?: AutoModeRound[] }
) {
  const onStop = vi.fn();
  const utils = render(
    <AutoModeStatusCard
      status={status(overrides)}
      onStop={onStop}
      isStopping={props?.isStopping ?? false}
      stopError={props?.stopError}
      stopSucceeded={props?.stopSucceeded}
      rounds={props?.rounds ?? []}
    />
  );
  return { onStop, ...utils };
}

describe('AutoModeStatusCard', () => {
  it('renders nothing before a run has ever started (autoStatus null) — the header Start button is the entry point, not this card', () => {
    const { container } = renderCard({ autoStatus: null });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows round progress, cost spent, and a Stop button while running', () => {
    renderCard({ autoRoundsCompleted: 3, autoMaxRounds: 10, autoCostSpentUsd: 0.42, autoCostLimitUsd: 2 });

    expect(screen.getByText(/round 4 in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/\$0\.42 of \$2\.00 spent/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
  });

  it('regression: labels round 1 as "in progress" while running, not "round 0 of N" — a raw autoRoundsCompleted of 0 (no round finished yet) reads as stuck otherwise', () => {
    renderCard({ autoRoundsCompleted: 0, autoMaxRounds: 10 });

    expect(screen.getByText(/round 1 in progress/i)).toBeInTheDocument();
    expect(screen.queryByText(/round 0 of/i)).not.toBeInTheDocument();
  });

  it.each([
    ['guidance-only' as const, /contrast: guidance only/i],
    ['disabled' as const, /contrast: disabled/i],
    ['apply-to-pdf' as const, /contrast: auto-apply/i],
    [null, /contrast: inherited/i],
  ])('labels an explicit autoColorContrastMode of %s correctly while running', (mode, expectedText) => {
    renderCard({ autoColorContrastMode: mode });

    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });

  it('shows the contrast label on the terminal (stopped) summary too', () => {
    renderCard({ autoStatus: 'stopped', autoStopReason: 'converged', autoColorContrastMode: 'apply-to-pdf' });

    expect(screen.getByText(/contrast: auto-apply/i)).toBeInTheDocument();
  });

  it('calls onStop when Stop is clicked', () => {
    const { onStop } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /stop/i }));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('disables Stop and shows a stopping label while isStopping is true', () => {
    renderCard(undefined, { isStopping: true });

    const stopButton = screen.getByRole('button', { name: /stopping/i });
    expect(stopButton).toBeDisabled();
  });

  it('shows the stop error message when stopError is set', () => {
    renderCard(undefined, { stopError: new Error('boom') });

    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('shows a success-styled alert when stopped due to convergence', () => {
    renderCard({ autoStatus: 'stopped', autoStopReason: 'converged', autoRoundsCompleted: 4 });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/no more ai-actionable fixes remain/i);
    expect(alert.className).toMatch(/green/);
  });

  it('shows a warning-styled alert when stopped due to the round limit', () => {
    renderCard({ autoStatus: 'stopped', autoStopReason: 'round_limit' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/reached the maximum number of rounds/i);
    expect(alert.className).toMatch(/yellow/);
  });

  it('shows an error-styled alert when stopped manually', () => {
    renderCard({ autoStatus: 'stopped', autoStopReason: 'manual_stop' });

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/stopped by the operator/i);
    expect(alert.className).toMatch(/red/);
  });

  it('renders the round-by-round history while running when rounds are provided', () => {
    renderCard(undefined, {
      rounds: [
        { round: 1, applied: 12, failed: 0, resolved: 10, remaining: 40, regressions: 0, resolutionRate: 20, completedAt: null },
      ],
    });

    expect(screen.getByText('Round-by-round')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Round' })).toBeInTheDocument();
  });

  it('renders the round-by-round history on the terminal (stopped) summary too', () => {
    renderCard(
      { autoStatus: 'stopped', autoStopReason: 'converged' },
      { rounds: [{ round: 1, applied: 12, failed: 0, resolved: 10, remaining: 40, regressions: 0, resolutionRate: 20, completedAt: null }] }
    );

    expect(screen.getByText('Round-by-round')).toBeInTheDocument();
  });

  it('does not render the round history section when no rounds have completed yet', () => {
    renderCard();

    expect(screen.queryByText('Round-by-round')).not.toBeInTheDocument();
  });
});
