import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PhaseGatePanel from '../PhaseGatePanel';
import type {
  PhaseGateStatus,
  PhaseGateCriterion,
} from '@/services/metrics.service';

function makeCriterion(
  id: string,
  status: 'GREEN' | 'AMBER' | 'RED',
  overrides: Partial<PhaseGateCriterion> = {}
): PhaseGateCriterion {
  return {
    id,
    label: `Criterion ${id}`,
    status,
    currentValue: '72%',
    threshold: '≥75%',
    tooltip: `Tooltip for ${id}`,
    ...overrides,
  };
}

function makeStatus(
  overrides: Partial<PhaseGateStatus> = {}
): PhaseGateStatus {
  return {
    criteria: [
      makeCriterion('c1', 'AMBER'),
      makeCriterion('c2', 'AMBER'),
      makeCriterion('c3', 'AMBER'),
      makeCriterion('c4', 'AMBER'),
      makeCriterion('c5', 'AMBER'),
    ],
    overallStatus: 'AMBER',
    readyForPhase2: false,
    ...overrides,
  };
}

const mockRefetch = vi.fn();
const mockUsePhaseGate = vi.fn();

vi.mock('@/hooks/useMetrics', () => ({
  usePhaseGate: () => mockUsePhaseGate(),
}));

describe('PhaseGatePanel', () => {
  it('shows 5 skeleton rows when loading', () => {
    mockUsePhaseGate.mockReturnValue({
      data: undefined,
      isLoading: true,
      refetch: mockRefetch,
      isFetching: false,
    });
    const { container } = render(<PhaseGatePanel />);
    const pulses = container.querySelectorAll('.animate-pulse');
    expect(pulses.length).toBe(5);
  });

  it('shows Phase 1 Complete banner when readyForPhase2=true', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({
        readyForPhase2: true,
        overallStatus: 'GREEN',
        criteria: [
          makeCriterion('c1', 'GREEN'),
          makeCriterion('c2', 'GREEN'),
          makeCriterion('c3', 'GREEN'),
          makeCriterion('c4', 'GREEN'),
          makeCriterion('c5', 'GREEN'),
        ],
      }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    render(<PhaseGatePanel />);
    expect(screen.getByText('Phase 1 Complete')).toBeInTheDocument();
  });

  it('does NOT show banner when readyForPhase2=false', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({ readyForPhase2: false }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    render(<PhaseGatePanel />);
    expect(screen.queryByText('Phase 1 Complete')).not.toBeInTheDocument();
  });

  it('GREEN criterion has bg-green-500 traffic light', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({
        criteria: [
          makeCriterion('c1', 'GREEN'),
          makeCriterion('c2', 'AMBER'),
          makeCriterion('c3', 'AMBER'),
          makeCriterion('c4', 'AMBER'),
          makeCriterion('c5', 'AMBER'),
        ],
      }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    const { container } = render(<PhaseGatePanel />);
    const greenLight = container.querySelector('.bg-green-500');
    expect(greenLight).toBeInTheDocument();
  });

  it('AMBER criterion has bg-amber-400 traffic light', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({
        criteria: [makeCriterion('c1', 'AMBER')],
      }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    const { container } = render(<PhaseGatePanel />);
    const amberLight = container.querySelector('.bg-amber-400');
    expect(amberLight).toBeInTheDocument();
  });

  it('RED criterion has bg-red-500 traffic light', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({
        criteria: [makeCriterion('c1', 'RED')],
      }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    const { container } = render(<PhaseGatePanel />);
    const redLight = container.querySelector('.bg-red-500');
    expect(redLight).toBeInTheDocument();
  });

  it('renders currentValue for each criterion', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({
        criteria: [
          makeCriterion('c1', 'GREEN', { currentValue: '88%' }),
          makeCriterion('c2', 'AMBER', { currentValue: '65%' }),
          makeCriterion('c3', 'RED', { currentValue: '40%' }),
          makeCriterion('c4', 'GREEN', { currentValue: '90%' }),
          makeCriterion('c5', 'AMBER', { currentValue: '70%' }),
        ],
      }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    render(<PhaseGatePanel />);
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText('65%')).toBeInTheDocument();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('Refresh button calls refetch when clicked', () => {
    const refetch = vi.fn();
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus(),
      isLoading: false,
      refetch,
      isFetching: false,
    });
    render(<PhaseGatePanel />);
    fireEvent.click(screen.getByLabelText('Refresh phase gate status'));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders all 5 criteria rows', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus(),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    const { container } = render(<PhaseGatePanel />);
    const amberBorders = container.querySelectorAll('.border-amber-200');
    expect(amberBorders.length).toBe(5);
  });

  it('shows overall status pill in footer', () => {
    mockUsePhaseGate.mockReturnValue({
      data: makeStatus({ overallStatus: 'AMBER' }),
      isLoading: false,
      refetch: mockRefetch,
      isFetching: false,
    });
    render(<PhaseGatePanel />);
    const pill = screen.getByTestId('overall-status-pill');
    expect(pill.textContent).toBe('AMBER');
    expect(pill.className).toContain('bg-amber-100');
  });
});
