import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import MAPAccuracyPanel from '../MAPAccuracyPanel';
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
});
