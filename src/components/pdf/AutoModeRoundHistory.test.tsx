import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AutoModeRoundHistory } from './AutoModeRoundHistory';
import type { AutoModeRound } from '@/hooks/useAutoMode';

const STORAGE_KEY = 'ninja:auto-mode-round-view';

function round(overrides: Partial<AutoModeRound> & { round: number }): AutoModeRound {
  return {
    applied: null,
    failed: null,
    resolved: null,
    remaining: null,
    regressions: null,
    resolutionRate: null,
    completedAt: null,
    ...overrides,
  };
}

describe('AutoModeRoundHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders nothing with 0 completed rounds', () => {
    const { container } = render(<AutoModeRoundHistory rounds={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('defaults to table view and shows one row per round', () => {
    render(
      <AutoModeRoundHistory
        rounds={[
          round({ round: 1, applied: 12, resolved: 10, remaining: 40, regressions: 0 }),
          round({ round: 2, applied: 8, resolved: 6, remaining: 34, regressions: 2 }),
        ]}
      />
    );

    expect(screen.getByRole('button', { name: 'Table view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('columnheader', { name: 'Round' })).toBeInTheDocument();
    const rows = screen.getAllByRole('row');
    // header row + 2 data rows
    expect(rows).toHaveLength(3);
  });

  it('shows a green down-arrow when remaining decreased from the previous round', () => {
    render(
      <AutoModeRoundHistory
        rounds={[
          round({ round: 1, remaining: 40 }),
          round({ round: 2, remaining: 30 }),
        ]}
      />
    );

    expect(screen.getByLabelText('decreased from previous round')).toBeInTheDocument();
  });

  it('shows a red up-arrow when remaining increased from the previous round', () => {
    render(
      <AutoModeRoundHistory
        rounds={[
          round({ round: 1, remaining: 20 }),
          round({ round: 2, remaining: 25 }),
        ]}
      />
    );

    expect(screen.getByLabelText('increased from previous round')).toBeInTheDocument();
  });

  it('shows a gray flat-arrow when remaining is unchanged, and no arrow at all for the first round', () => {
    render(
      <AutoModeRoundHistory
        rounds={[
          round({ round: 1, remaining: 20 }),
          round({ round: 2, remaining: 20 }),
        ]}
      />
    );

    expect(screen.getByLabelText('unchanged from previous round')).toBeInTheDocument();
    expect(screen.queryByLabelText('decreased from previous round')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('increased from previous round')).not.toBeInTheDocument();
  });

  it('renders a warning badge with the count when regressions > 0, and a dash for 0', () => {
    render(
      <AutoModeRoundHistory
        rounds={[
          round({ round: 1, regressions: 0 }),
          round({ round: 2, regressions: 3 }),
        ]}
      />
    );

    expect(screen.getByText('3')).toBeInTheDocument();
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders "—" for null applied/resolved/remaining values instead of blank cells', () => {
    render(<AutoModeRoundHistory rounds={[round({ round: 1 })]} />);

    // applied, resolved, remaining, regressions all null/0 -> four dashes
    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(3);
  });

  it('switches to chart view on toggle and renders one polyline point per round, without hiding the toggle', () => {
    const rounds = [
      round({ round: 1, remaining: 40 }),
      round({ round: 2, remaining: 30 }),
      round({ round: 3, remaining: 25 }),
    ];
    const { container } = render(<AutoModeRoundHistory rounds={rounds} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chart view' }));

    expect(screen.getByRole('button', { name: 'Chart view' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('columnheader', { name: 'Round' })).not.toBeInTheDocument();
    const polyline = container.querySelector('polyline');
    expect(polyline).not.toBeNull();
    expect(polyline!.getAttribute('points')!.trim().split(/\s+/)).toHaveLength(3);
  });

  it('marks only the rounds with regressions > 0 as chart dots', () => {
    const rounds = [
      round({ round: 1, remaining: 40, regressions: 0 }),
      round({ round: 2, remaining: 30, regressions: 2 }),
      round({ round: 3, remaining: 25, regressions: 0 }),
    ];
    const { container } = render(<AutoModeRoundHistory rounds={rounds} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chart view' }));

    expect(container.querySelectorAll('circle')).toHaveLength(1);
  });

  it('toggling views never re-derives from a different data source — both read the same rounds prop (no network/loading state to speak of)', () => {
    const rounds = [round({ round: 1, remaining: 10 }), round({ round: 2, remaining: 5 })];
    render(<AutoModeRoundHistory rounds={rounds} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chart view' }));
    fireEvent.click(screen.getByRole('button', { name: 'Table view' }));

    // Back in table view, the same two rows are still there — nothing lost.
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(3);
  });

  it('persists the selected view to localStorage and restores it on next render', () => {
    const rounds = [round({ round: 1, remaining: 10 })];
    const { unmount } = render(<AutoModeRoundHistory rounds={rounds} />);

    fireEvent.click(screen.getByRole('button', { name: 'Chart view' }));
    expect(localStorage.getItem(STORAGE_KEY)).toBe('chart');
    unmount();

    render(<AutoModeRoundHistory rounds={rounds} />);
    expect(screen.getByRole('button', { name: 'Chart view' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('regression: an invalid/corrupted stored value falls back to table view instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, 'not-a-real-view');

    render(<AutoModeRoundHistory rounds={[round({ round: 1, remaining: 10 })]} />);

    expect(screen.getByRole('button', { name: 'Table view' })).toHaveAttribute('aria-pressed', 'true');
  });
});
