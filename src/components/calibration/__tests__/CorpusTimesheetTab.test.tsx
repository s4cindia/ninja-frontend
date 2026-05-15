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

describe('CorpusTimesheetTab — nullable completedAt (forward-compat for Option A backend)', () => {
  beforeEach(() => {
    useTimesheetSummary.mockReset();
  });

  it('renders the run count + date range in the header', () => {
    useTimesheetSummary.mockReturnValue({ data: response(), isLoading: false, error: null });
    render(<CorpusTimesheetTab range={RANGE} />);
    // The count line uses the original wording until the backend ships
    // the activity-date-filter change (Option A).
    expect(screen.getByText(/runs included/i)).toBeInTheDocument();
    expect(screen.getByText(/2026-05-04/)).toBeInTheDocument();
  });

  it('renders the completion date when completedAt is a string', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({ perTitle: [perTitle({ completedAt: '2026-05-09T10:00:00Z' })] }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    // The cell renders the locale date string; just confirm it's not "In progress"
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
  });

  it('renders "In progress" for a run whose completedAt is null (BE Option A forward-compat)', () => {
    // Before the backend ships the activity-date filter, completedAt is
    // always non-null, so this branch is dead code with the current API.
    // The type is string | null so the FE is ready for when the backend
    // starts returning in-progress runs.
    useTimesheetSummary.mockReturnValue({
      data: response({
        perTitle: [perTitle({ runId: 'run-wip', completedAt: null })],
      }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText('In progress')).toBeInTheDocument();
  });

  it('shows the empty-state message when no runs are in the range', () => {
    useTimesheetSummary.mockReturnValue({
      data: response({ runsIncluded: 0, perTitle: [] }),
      isLoading: false,
      error: null,
    });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(
      screen.getByText('No completed runs in this date range.'),
    ).toBeInTheDocument();
  });

  it('renders the "Completed" column header', () => {
    useTimesheetSummary.mockReturnValue({ data: response(), isLoading: false, error: null });
    render(<CorpusTimesheetTab range={RANGE} />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });
});
