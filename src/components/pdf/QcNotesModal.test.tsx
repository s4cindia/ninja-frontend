import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QcNotesModal } from './QcNotesModal';
import { api } from '@/services/api';
import type { FeedbackItem } from '@/types/feedback.types';

vi.mock('@/services/api', () => ({
  api: { get: vi.fn() },
}));

const addRow = vi.fn();
const getRow = vi.fn(() => ({ font: undefined }));
const eachCell = vi.fn();
const writeBuffer = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));

vi.mock('exceljs', () => {
  class MockWorksheet {
    addRow = addRow;
    getRow = getRow;
    columns: Array<{ width?: number; eachCell?: typeof eachCell }> = [{ eachCell }, { eachCell }, { eachCell }, { eachCell }, { eachCell }, { eachCell }, { eachCell }];
  }
  class MockWorkbook {
    xlsx = { writeBuffer };
    addWorksheet = vi.fn(() => new MockWorksheet());
  }
  return { default: { Workbook: MockWorkbook } };
});

const mockGet = vi.mocked(api.get);

function buildItem(overrides?: Partial<FeedbackItem>): FeedbackItem {
  return {
    id: 'fb-1',
    type: 'FULL_QC_REVIEW',
    status: 'NEW',
    severity: 'MEDIUM',
    comment: 'Ambiguous call -- could be Sect instead of Art.',
    context: { pageNumber: 4, elementPath: '12-0' },
    createdAt: '2026-11-18T05:00:00.000Z',
    userEmail: 'operator@example.com',
    ...overrides,
  };
}

describe('QcNotesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(global, { URL: { ...URL, createObjectURL: vi.fn(() => 'blob:mock'), revokeObjectURL: vi.fn() } });
  });

  it('does not fetch while closed', () => {
    render(<QcNotesModal isOpen={false} onClose={vi.fn()} jobId="job-1" />);
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches scoped to this job and type=FULL_QC_REVIEW when opened', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [], total: 0, page: 1, totalPages: 1 } } });
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    await waitFor(() => expect(mockGet).toHaveBeenCalledWith('/feedback', {
      params: { jobId: 'job-1', type: 'FULL_QC_REVIEW', limit: 100 },
    }));
  });

  it('shows a loading state while the fetch is in flight', async () => {
    let resolve!: (v: unknown) => void;
    mockGet.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText('Loading…')).toBeInTheDocument();
    resolve({ data: { data: { items: [] } } });
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
  });

  it('shows an error message instead of crashing when the fetch fails', async () => {
    mockGet.mockRejectedValue(new Error('network blip'));
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText('network blip')).toBeInTheDocument();
  });

  it('shows a plain empty state when there are no notes yet', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [] } } });
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText(/no qc notes have been flagged/i)).toBeInTheDocument();
  });

  it('renders page, element, severity, comment, status, and submitter for each note', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [buildItem()] } } });
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText('Page 4')).toBeInTheDocument();
    expect(screen.getByText('12-0')).toBeInTheDocument();
    expect(screen.getByText('MEDIUM')).toBeInTheDocument();
    expect(screen.getByText('Ambiguous call -- could be Sect instead of Art.')).toBeInTheDocument();
    expect(screen.getByText(/operator@example.com/)).toBeInTheDocument();
  });

  it('keeps the Download as Excel button disabled when there are no notes', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [] } } });
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    await screen.findByText(/no qc notes have been flagged/i);
    expect(screen.getByRole('button', { name: /download as excel/i })).toBeDisabled();
  });

  it('builds and downloads a workbook from the real notes when Download as Excel is clicked', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [buildItem()] } } });
    render(<QcNotesModal isOpen onClose={vi.fn()} jobId="job-1" />);

    await screen.findByText('Page 4');
    fireEvent.click(screen.getByRole('button', { name: /download as excel/i }));

    await waitFor(() => expect(writeBuffer).toHaveBeenCalled());
    expect(addRow).toHaveBeenCalledWith(['Page', 'Element', 'Severity', 'Comment', 'Status', 'Submitted By', 'Date']);
    expect(addRow).toHaveBeenCalledWith([
      '4', '12-0', 'MEDIUM', 'Ambiguous call -- could be Sect instead of Art.', 'NEW', 'operator@example.com',
      new Date('2026-11-18T05:00:00.000Z').toLocaleString(),
    ]);
  });

  it('calls onClose when Close is clicked', async () => {
    mockGet.mockResolvedValue({ data: { data: { items: [] } } });
    const onClose = vi.fn();
    render(<QcNotesModal isOpen onClose={onClose} jobId="job-1" />);

    await screen.findByText(/no qc notes have been flagged/i);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });
});
