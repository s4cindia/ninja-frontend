import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import CorpusCompositionPanel from '../CorpusCompositionPanel';
import type { CorpusStats } from '@/services/calibration.service';

const mockUseCorpusStatsMetrics = vi.fn();

vi.mock('@/hooks/useMetrics', () => ({
  useCorpusStatsMetrics: () => mockUseCorpusStatsMetrics(),
}));

function makeStats(overrides: Partial<CorpusStats> = {}): CorpusStats {
  return {
    totalDocuments: 25,
    totalRuns: 10,
    totalConfirmedZones: 1200,
    averageAgreementRate: 0.742,
    byPublisher: { 'Penguin Random House': 12, HarperCollins: 8, Wiley: 5 },
    byContentType: { 'table-heavy': 10, 'figure-heavy': 6, mixed: 5, 'text-dominant': 4 },
    ...overrides,
  };
}

describe('CorpusCompositionPanel', () => {
  it('shows skeleton when loading', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<CorpusCompositionPanel />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('shows empty state when all stats are zero', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({
      data: makeStats({
        totalDocuments: 0,
        totalRuns: 0,
        totalConfirmedZones: 0,
        averageAgreementRate: 0,
        byPublisher: {},
        byContentType: {},
      }),
      isLoading: false,
    });
    render(<CorpusCompositionPanel />);
    expect(screen.getByText(/No corpus documents yet/)).toBeInTheDocument();
  });

  it('shows correct stat card values', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({
      data: makeStats(),
      isLoading: false,
    });
    render(<CorpusCompositionPanel />);
    expect(screen.getByTestId('total-docs').textContent).toBe('25');
    expect(screen.getByTestId('total-zones').textContent).toBe('1200');
  });

  it('renders publisher names', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({
      data: makeStats(),
      isLoading: false,
    });
    render(<CorpusCompositionPanel />);
    expect(screen.getByText('Penguin Random House')).toBeInTheDocument();
    expect(screen.getByText('HarperCollins')).toBeInTheDocument();
  });

  it('renders table-heavy with teal classes', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({
      data: makeStats(),
      isLoading: false,
    });
    render(<CorpusCompositionPanel />);
    const pill = screen.getByText('table-heavy').closest('span');
    expect(pill?.className).toContain('bg-teal-100');
    expect(pill?.className).toContain('text-teal-700');
  });

  it('formats averageAgreementRate as percentage: 0.742 → "74.2%"', () => {
    mockUseCorpusStatsMetrics.mockReturnValue({
      data: makeStats(),
      isLoading: false,
    });
    render(<CorpusCompositionPanel />);
    expect(screen.getByTestId('avg-agreement').textContent).toBe('74.2%');
  });
});
