import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CorpusTimesheetTab } from '../CorpusTimesheetTab';
import type {
  DateRange,
  PerTitleEntry,
  TimesheetSummaryResponse,
} from '@/types/corpus-summary.types';

// The tab reads data only through this hook; mocking it lets us drive every
// render branch without a network layer.
const useTimesheetSummary = vi.fn();
vi.mock('@/hooks/useCorpusSummary', () => ({
  useTimesheetSummary: (range: DateRange) => useTimesheetSummary(range),
}));

// The export handlers are click-only; stub the service so the module import
// resolves without pulling the real API client.
vi.mock('@/services/corpus-summary.service', () => ({
  corpusSummaryService: {
    downloadTimesheetPerOperatorCsv: vi.fn(),
    downloadTimesheetPerTitleCsv: vi.fn(),
    downloadTimesheetPdf: vi.fn(),
  },
}));

const RANGE: DateRange = { from: '2026-05-04', to: '2026-05-10' };

function perTitle(over: Partial<PerTitleEntry>): PerTitleEntry {
  return {
    runId: 'run-1',
    documentName: 'Gold_Bookmarked_c860_v3_input.pdf',
    pages: 120,
    activeHours: 14.58,
    zonesReviewed: 800,
    zonesPerHour: 54.9,
    costInr: 5832,
    issuesCount: 3,
    completedAt: '2026-05-09T10:00:00Z',
    ...over,
  };
}

function response(over: Partial<TimesheetSummaryResponse> = {}): TimesheetSummaryResponse {
  return {
    range: RANGE,
    runsIncluded: 1,
    totals: {
      wallClockHours: 16,
      activeHours: 14.58,
      idleHours: 1.42,
      zonesReviewed: 800,
      zonesPerHour: 54.9,
      annotatorCostInr: 5832,
    },
    perOperator: [],
    perTitle: [perTitle({})],
    perZoneType: [],
    throughputTrend: [],
    ...over,
  };
}

describe('CorpusTimesheetTab — activity-date filter semantics', () => {
  beforeEach(() => {
    useTimesheetSummary.mockReset();
  });

  it('renders the activity-based caption explaining the filter semantics', () => {
    useTimesheetSummary.mockReturnValue({ data: response(), isLoading: false, error: null });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(
      screen.getByText(/runs? with annotation activity in 2026-05-04 . 2026-05-10/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Filtered by session activity date/i),
    ).toBeInTheDocument();
  });

  it('shows "Completed {date}" for a run that has a completedAt', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({ perTitle: [perTitle({ completedAt: '2026-05-09T10:00:00Z' })] }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText(/^Completed /)).toBeInTheDocument();
  });

  it('shows "In progress" for a run that has activity but no completedAt', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({
        perTitle: [perTitle({ runId: 'run-wip', completedAt: null })],
      }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
    // The "Run status" column header reflects that rows are no longer always
    // a completion date.
    expect(screen.getByText('Run status')).toBeInTheDocument();
  });

  it('uses activity-based wording for the empty state', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({ runsIncluded: 0, perTitle: [] }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(
      screen.getByText('No annotation activity in this date range.'),
    ).toBeInTheDocument();
  });

  it('singularises the run count for exactly one run, pluralises otherwise', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({ runsIncluded: 1 }),
      isLoading: false,
      error: null,
    });
    const { rerender } = render(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText(/^run with annotation activity in/i)).toBeInTheDocument();

    useTimesheetSummary.mockReturnValue({
      data: response({ runsIncluded: 3 }),
      isLoading: false,
      error: null,
    });
    rerender(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText(/^runs with annotation activity in/i)).toBeInTheDocument();
  });
});
