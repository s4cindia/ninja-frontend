import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MAPAccuracyPanel from '../MAPAccuracyPanel';
import { pickBestInWindow } from '../mapAccuracySelection';
import type { MAPSnapshot } from '@/services/metrics.service';

function makeSnapshot(overrides: Partial<MAPSnapshot> = {}): MAPSnapshot {
  return {
    runId: 'run-1',
    runDate: '2026-03-01T00:00:00Z',
    overallMAP: 0.732,
    perClass: [
      { zoneType: 'paragraph', ap: 0.88, groundTruthCount: 50, predictionCount: 45, insufficientData: false },
      { zoneType: 'section-header', ap: 0.72, groundTruthCount: 30, predictionCount: 28, insufficientData: false },
      { zoneType: 'table', ap: 0.65, groundTruthCount: 20, predictionCount: 18, insufficientData: false },
      { zoneType: 'figure', ap: 0.80, groundTruthCount: 15, predictionCount: 14, insufficientData: false },
      { zoneType: 'caption', ap: 0.55, groundTruthCount: 10, predictionCount: 8, insufficientData: false },
      { zoneType: 'footnote', ap: 0.40, groundTruthCount: 3, predictionCount: 5, insufficientData: true },
      { zoneType: 'header', ap: 0.90, groundTruthCount: 25, predictionCount: 24, insufficientData: false },
      { zoneType: 'footer', ap: 0.85, groundTruthCount: 22, predictionCount: 20, insufficientData: false },
    ],
    ...overrides,
  };
}

const mockUseMAPHistory = vi.fn();

vi.mock('@/hooks/useMetrics', () => ({
  useMAPHistory: () => mockUseMAPHistory(),
}));

describe('MAPAccuracyPanel', () => {
  it('shows skeleton when loading', () => {
    mockUseMAPHistory.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<MAPAccuracyPanel />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    mockUseMAPHistory.mockReturnValue({ data: [], isLoading: false });
    render(<MAPAccuracyPanel />);
    expect(screen.getByText('No calibration runs completed yet.')).toBeInTheDocument();
  });

  it('shows green colour for overall mAP >= 75%', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot({ overallMAP: 0.80 })],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    const headline = screen.getByTestId('overall-map');
    expect(headline.textContent).toBe('80.0%');
    expect(headline.className).toContain('text-green-600');
  });

  it('shows amber colour for overall mAP 60-74%', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot({ overallMAP: 0.68 })],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    const headline = screen.getByTestId('overall-map');
    expect(headline.textContent).toBe('68.0%');
    expect(headline.className).toContain('text-amber-600');
  });

  it('shows red colour for overall mAP < 60%', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot({ overallMAP: 0.45 })],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    const headline = screen.getByTestId('overall-map');
    expect(headline.textContent).toBe('45.0%');
    expect(headline.className).toContain('text-red-600');
  });

  it('renders a row for each of the 8 zone types', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot()],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    const rows = screen.getAllByRole('row');
    // 1 header row + 8 data rows
    expect(rows.length).toBe(9);
  });

  it('shows "Insufficient data" pill for insufficientData=true', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot()],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    expect(screen.getByText('Insufficient data')).toBeInTheDocument();
  });

  it('renders section-header as "Heading"', () => {
    mockUseMAPHistory.mockReturnValue({
      data: [makeSnapshot()],
      isLoading: false,
    });
    render(<MAPAccuracyPanel />);
    expect(screen.getByText('Heading')).toBeInTheDocument();
  });

  describe('best-of-window selection', () => {
    it('picks the BEST run within the window, not the latest', () => {
      // History ordered completedAt-asc; latest run has worse mAP than a
      // recent prior one. C1 phase-gate logic picks the best — panel must
      // mirror that.
      mockUseMAPHistory.mockReturnValue({
        data: [
          makeSnapshot({ runId: 'oldest', overallMAP: 0.50 }),
          makeSnapshot({ runId: 'best',   overallMAP: 0.80 }),
          makeSnapshot({ runId: 'latest', overallMAP: 0.36 }),
        ],
        isLoading: false,
      });
      render(<MAPAccuracyPanel />);
      expect(screen.getByTestId('overall-map').textContent).toBe('80.0%');
    });

    it('subtitle shows window size when history has multiple runs', () => {
      mockUseMAPHistory.mockReturnValue({
        data: [
          makeSnapshot({ overallMAP: 0.50 }),
          makeSnapshot({ overallMAP: 0.80 }),
        ],
        isLoading: false,
      });
      render(<MAPAccuracyPanel />);
      expect(screen.getByText(/best of last 2 runs/)).toBeInTheDocument();
    });
  });
});

describe('pickBestInWindow', () => {
  function snap(runId: string, overallMAP: number): MAPSnapshot {
    return {
      runId,
      runDate: '2026-03-01T00:00:00Z',
      overallMAP,
      perClass: [],
    };
  }

  it('returns undefined for empty/undefined history', () => {
    expect(pickBestInWindow(undefined)).toBeUndefined();
    expect(pickBestInWindow([])).toBeUndefined();
  });

  it('returns the single snapshot when only one exists', () => {
    const only = snap('only', 0.42);
    expect(pickBestInWindow([only])).toBe(only);
  });

  it('returns the snapshot with the highest overallMAP', () => {
    const best = snap('b', 0.80);
    const result = pickBestInWindow([
      snap('a', 0.50),
      best,
      snap('c', 0.65),
    ]);
    expect(result?.runId).toBe('b');
  });

  it('restricts to the last N entries when history exceeds the window', () => {
    // The very first run is the best in absolute terms, but it's outside
    // the window — pickBestInWindow should ignore it.
    const history: MAPSnapshot[] = [
      snap('ancient', 0.95), // outside window
      ...Array.from({ length: 14 }, (_, i) => snap(`recent-${i}`, 0.40 + i * 0.01)),
    ];
    const result = pickBestInWindow(history, 14);
    expect(result?.runId).toBe('recent-13'); // last entry, mAP=0.53 — best within the window
    expect(result?.runId).not.toBe('ancient');
  });

  it('uses the default window of 14', () => {
    const ancient = snap('ancient', 0.99);
    const window = Array.from({ length: 14 }, (_, i) => snap(`r${i}`, 0.30));
    const result = pickBestInWindow([ancient, ...window]);
    expect(result?.overallMAP).toBe(0.30); // ancient is outside default window
  });
});
