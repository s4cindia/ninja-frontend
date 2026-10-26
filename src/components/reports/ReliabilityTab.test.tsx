import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReliabilityTab } from './ReliabilityTab';
import { reportsService } from '@/services/reports.service';
import type { ReliabilityReport } from '@/types/reports.types';

vi.mock('@/services/reports.service', () => ({
  reportsService: { getReliabilityReport: vi.fn() },
}));

const mockGetReliabilityReport = vi.mocked(reportsService.getReliabilityReport);

function mockReport(overrides?: Partial<ReliabilityReport>): ReliabilityReport {
  return {
    period: { from: '2026-09-26', to: '2026-10-26' },
    interruptionCount: 4,
    interruptionsByAction: { force_stopped: 3, orphan_reconciled: 1 },
    failureCount: 10,
    failuresByCategory: {
      SIZE_LIMIT_EXCEEDED: 2,
      TIMEOUT: 1,
      PARSE_ERROR: 0,
      VALIDATION_ERROR: 1,
      UNKNOWN: 6,
    },
    ...overrides,
  };
}

function summaryLineMatcher(expected: string) {
  return (_: string, el: Element | null) =>
    el?.tagName === 'P' && el.textContent?.replace(/\s+/g, ' ').trim() === expected;
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ReliabilityTab />
    </QueryClientProvider>
  );
}

describe('ReliabilityTab', () => {
  beforeEach(() => {
    mockGetReliabilityReport.mockReset();
  });

  it('renders the summary line and both breakdowns', async () => {
    mockGetReliabilityReport.mockResolvedValue(mockReport());

    renderTab();

    expect(
      await screen.findByText(summaryLineMatcher('4 interruptions · 10 failures in this period'))
    ).toBeInTheDocument();
    // Y-axis category labels are chart-internal SVG text recharts doesn't
    // render at jsdom's 0x0 container size, so assert on the card titles
    // (plain DOM) instead of the chart's own labels.
    expect(screen.getByText('Interruptions')).toBeInTheDocument();
    expect(screen.getByText('Failure Reasons')).toBeInTheDocument();
  });

  it('uses singular wording for a count of exactly 1', async () => {
    mockGetReliabilityReport.mockResolvedValue(mockReport({ interruptionCount: 1, failureCount: 1 }));

    renderTab();

    expect(
      await screen.findByText(summaryLineMatcher('1 interruption · 1 failure in this period'))
    ).toBeInTheDocument();
  });

  it('shows empty states when there is nothing in range', async () => {
    mockGetReliabilityReport.mockResolvedValue(
      mockReport({
        interruptionCount: 0,
        interruptionsByAction: {},
        failureCount: 0,
        failuresByCategory: {
          SIZE_LIMIT_EXCEEDED: 0,
          TIMEOUT: 0,
          PARSE_ERROR: 0,
          VALIDATION_ERROR: 0,
          UNKNOWN: 0,
        },
      })
    );

    renderTab();

    expect(await screen.findByText('No interruptions in this range.')).toBeInTheDocument();
    expect(screen.getByText('No failures in this range.')).toBeInTheDocument();
  });

  it('shows a retry-able error banner on failure', async () => {
    mockGetReliabilityReport.mockRejectedValue(new Error('Network error'));

    renderTab();

    expect(await screen.findByText('Failed to load reliability report')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
