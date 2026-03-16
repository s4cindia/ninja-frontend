import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import AgreementRateChart from '../AgreementRateChart';

const mockUseCalibrationRuns = vi.fn();

vi.mock('@/hooks/useCalibration', () => ({
  useCalibrationRuns: (...args: unknown[]) => mockUseCalibrationRuns(...args),
}));

function makeRun(id: string, green: number, amber: number, red: number) {
  return {
    id,
    documentId: 'doc-1',
    runDate: '2026-03-01T00:00:00Z',
    greenCount: green,
    amberCount: amber,
    redCount: red,
  };
}

describe('AgreementRateChart', () => {
  it('shows spinner when loading', () => {
    mockUseCalibrationRuns.mockReturnValue({ data: undefined, isLoading: true });
    render(<AgreementRateChart />);
    expect(screen.getByTestId('agreement-spinner')).toBeInTheDocument();
  });

  it('shows empty message when no runs', () => {
    mockUseCalibrationRuns.mockReturnValue({
      data: { runs: [] },
      isLoading: false,
    });
    render(<AgreementRateChart />);
    expect(screen.getByText('No calibration runs yet.')).toBeInTheDocument();
  });

  it('computes agreement rate correctly: 8/10 = 80%', () => {
    mockUseCalibrationRuns.mockReturnValue({
      data: { runs: [makeRun('r1', 8, 2, 0)] },
      isLoading: false,
    });
    render(<AgreementRateChart />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('handles all zeros without crashing (rate = 0%)', () => {
    mockUseCalibrationRuns.mockReturnValue({
      data: { runs: [makeRun('r1', 0, 0, 0)] },
      isLoading: false,
    });
    // All zeros filtered out (0 total), so should show empty
    render(<AgreementRateChart />);
    // Should not crash — runs have counts but total=0 maps to 0%
    // Actually filter passes because greenCount!=null, so it renders 0%
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('renders table with valid data', () => {
    mockUseCalibrationRuns.mockReturnValue({
      data: {
        runs: [
          makeRun('r1', 8, 1, 1),
          makeRun('r2', 6, 3, 1),
        ],
      },
      isLoading: false,
    });
    render(<AgreementRateChart />);
    expect(screen.getByTestId('agreement-table')).toBeInTheDocument();
  });
});
