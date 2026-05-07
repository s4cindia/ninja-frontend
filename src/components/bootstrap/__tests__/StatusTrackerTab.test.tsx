import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusTrackerTab } from '../StatusTrackerTab';
import type {
  CorpusStatusResponse,
  CorpusStatusRow,
} from '@/services/corpus-status.service';

vi.mock('@/hooks/useCorpusStatus', () => ({
  useCorpusStatus: vi.fn(),
  useUpdateCorpusStatus: vi.fn(),
}));

vi.mock('@/lib/csv-export', () => ({
  downloadCsv: vi.fn(),
}));

const { useCorpusStatus, useUpdateCorpusStatus } = await import(
  '@/hooks/useCorpusStatus'
);
const { downloadCsv } = await import('@/lib/csv-export');

const mockUseCorpusStatus = vi.mocked(useCorpusStatus);
const mockUseUpdateCorpusStatus = vi.mocked(useUpdateCorpusStatus);
const mockDownloadCsv = vi.mocked(downloadCsv);

function makeRow(overrides: Partial<CorpusStatusRow> = {}): CorpusStatusRow {
  return {
    serialNumber: 1,
    documentId: 'doc-1',
    filename: 'Aulakh.pdf',
    pageCount: 295,
    pagesAnnotated: 295,
    status: 'COMPLETED',
    statusOverride: null,
    primaryAnnotator: {
      userId: 'u1',
      displayName: 'Poornakala U',
      email: 'p@example.com',
    },
    otherAnnotatorCount: 0,
    hoursSpent: 5.5,
    lastUpdatedAt: '2026-04-29T10:00:00Z',
    statusNote: null,
    ...overrides,
  };
}

function makeResponse(rows: CorpusStatusRow[]): CorpusStatusResponse {
  return { rows, generatedAt: '2026-05-08T12:00:00Z' };
}

function renderTab() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <StatusTrackerTab />
    </QueryClientProvider>,
  );
}

describe('StatusTrackerTab', () => {
  let mutate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mutate = vi.fn();
    mockUseUpdateCorpusStatus.mockReturnValue({
      mutate,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateCorpusStatus>);
  });

  it('renders a loading state', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: true,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    expect(screen.getByText(/loading corpus status/i)).toBeInTheDocument();
  });

  it('renders an error state with retry', () => {
    const refetch = vi.fn();
    mockUseCorpusStatus.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error('Network down'),
      refetch,
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    expect(screen.getByText(/failed to load corpus status/i)).toBeInTheDocument();
    expect(screen.getByText(/network down/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('renders the empty state when there are no rows', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    expect(screen.getByText(/no documents in the corpus yet/i)).toBeInTheDocument();
  });

  it('renders rows with all key columns visible', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([
        makeRow(),
        makeRow({
          serialNumber: 2,
          documentId: 'doc-2',
          filename: 'Acharya.pdf',
          status: 'IN_PROGRESS',
          pagesAnnotated: 50,
          hoursSpent: 2.3,
          primaryAnnotator: {
            userId: 'u2',
            displayName: 'Nambi T',
            email: 'n@example.com',
          },
        }),
      ]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    const { container } = renderTab();
    expect(screen.getByText('Aulakh.pdf')).toBeInTheDocument();
    expect(screen.getByText('Acharya.pdf')).toBeInTheDocument();
    expect(screen.getByText(/295 \/ 295/)).toBeInTheDocument();
    expect(screen.getByText(/50 \/ 295/)).toBeInTheDocument();
    // Annotator names appear in both the dropdown filter AND the row cells; assert
    // at least once each rather than getByText (which fails on >1 match).
    expect(screen.getAllByText('Poornakala U').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nambi T').length).toBeGreaterThan(0);
    expect(screen.getByText(/Showing 2 of 2 titles/)).toBeInTheDocument();
    // Confirm both names appear inside the table specifically
    const tbody = container.querySelector('tbody');
    expect(tbody?.textContent).toContain('Poornakala U');
    expect(tbody?.textContent).toContain('Nambi T');
  });

  it('filters rows by status', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([
        makeRow({ filename: 'Done.pdf', status: 'COMPLETED' }),
        makeRow({
          serialNumber: 2,
          documentId: 'doc-2',
          filename: 'WIP.pdf',
          status: 'IN_PROGRESS',
        }),
      ]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    fireEvent.change(screen.getByLabelText(/filter by status/i), {
      target: { value: 'COMPLETED' },
    });
    expect(screen.getByText('Done.pdf')).toBeInTheDocument();
    expect(screen.queryByText('WIP.pdf')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 1 of 2 titles/)).toBeInTheDocument();
  });

  it('filters rows by title search (case-insensitive)', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([
        makeRow({ filename: 'Aulakh.pdf' }),
        makeRow({
          serialNumber: 2,
          documentId: 'doc-2',
          filename: 'Boyd-Hamill.pdf',
        }),
      ]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    fireEvent.change(screen.getByLabelText(/search title/i), {
      target: { value: 'BOYD' },
    });
    expect(screen.getByText('Boyd-Hamill.pdf')).toBeInTheDocument();
    expect(screen.queryByText('Aulakh.pdf')).not.toBeInTheDocument();
  });

  it('triggers status mutation on pill change', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([makeRow({ status: 'IN_PROGRESS' })]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    // Open the pill drop-down
    fireEvent.click(screen.getByRole('button', { name: /status: in progress/i }));
    // Select the BLOCKED option from the dropdown (plain buttons, not role="menuitem")
    fireEvent.click(screen.getByRole('button', { name: /^Blocked$/i }));

    expect(mutate).toHaveBeenCalledWith(
      {
        documentId: 'doc-1',
        payload: { statusOverride: 'BLOCKED' },
      },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('saves a note via inline edit on blur', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([makeRow({ statusNote: null })]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    // Click the empty notes cell to enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /add notes/i }));
    const textarea = screen.getByRole('textbox', { name: /notes/i });
    fireEvent.change(textarea, { target: { value: 'Re-extraction needed' } });
    fireEvent.blur(textarea);

    expect(mutate).toHaveBeenCalledWith(
      {
        documentId: 'doc-1',
        payload: { statusNote: 'Re-extraction needed' },
      },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it('downloads CSV with the visible (filtered) rows', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([
        makeRow({ filename: 'Aulakh.pdf', status: 'COMPLETED' }),
        makeRow({
          serialNumber: 2,
          documentId: 'doc-2',
          filename: 'WIP.pdf',
          status: 'IN_PROGRESS',
        }),
      ]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    renderTab();
    // Filter to COMPLETED only
    fireEvent.change(screen.getByLabelText(/filter by status/i), {
      target: { value: 'COMPLETED' },
    });
    // Click download
    fireEvent.click(screen.getByRole('button', { name: /download csv/i }));

    expect(mockDownloadCsv).toHaveBeenCalledTimes(1);
    const args = mockDownloadCsv.mock.calls[0][0] as unknown as {
      filename: string;
      rows: CorpusStatusRow[];
    };
    expect(args.filename).toMatch(/^annotation-status-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(args.rows.length).toBe(1);
    expect(args.rows[0].filename).toBe('Aulakh.pdf');
  });

  it('toggles sort direction when the same column header is clicked twice', () => {
    mockUseCorpusStatus.mockReturnValue({
      data: makeResponse([
        makeRow({ filename: 'Aaaa.pdf' }),
        makeRow({
          serialNumber: 2,
          documentId: 'doc-2',
          filename: 'Zzzz.pdf',
        }),
      ]),
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
      isFetching: false,
    } as unknown as ReturnType<typeof useCorpusStatus>);

    const { container } = renderTab();
    // Initially serialNumber asc → row order Aaaa, Zzzz
    let rows = container.querySelectorAll('tbody tr');
    expect(within(rows[0] as HTMLElement).getByText('Aaaa.pdf')).toBeInTheDocument();

    // Click Title twice to reverse sort
    fireEvent.click(screen.getByRole('button', { name: /^Title/ }));
    fireEvent.click(screen.getByRole('button', { name: /^Title/ }));
    rows = container.querySelectorAll('tbody tr');
    expect(within(rows[0] as HTMLElement).getByText('Zzzz.pdf')).toBeInTheDocument();
  });
});
