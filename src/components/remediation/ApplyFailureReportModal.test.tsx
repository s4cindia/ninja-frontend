import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ApplyFailureReportModal } from './ApplyFailureReportModal';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import type { ApplyFailureReport } from '@/types/pdf-remediation.types';

vi.mock('@/services/pdf-remediation.service', async () => {
  const actual = await vi.importActual<typeof import('@/services/pdf-remediation.service')>(
    '@/services/pdf-remediation.service'
  );
  return {
    ...actual,
    pdfRemediationService: {
      ...actual.pdfRemediationService,
      getApplyFailureReport: vi.fn(),
    },
  };
});

const mockGetApplyFailureReport = pdfRemediationService.getApplyFailureReport as unknown as ReturnType<typeof vi.fn>;

function buildReport(overrides?: Partial<ApplyFailureReport>): ApplyFailureReport {
  return {
    totalFailed: 3,
    groups: [
      {
        suggestionType: 'color-contrast-fix',
        reason: 'Fix did not verify even after escalating to #000000 (measured ratio 1.06:1, needs 4.5:1)',
        category: 'needs_investigation',
        categoryLabel: 'Needs investigation -- contrast verification',
        explanation: 'Contrast verification explanation.',
        count: 1,
        issueIds: ['issue-3'],
      },
      {
        suggestionType: 'table-row-reattach-fix',
        reason: "Row already has a /P, but it does not match this row's own natural reattachment point -- declining rather than guessing",
        category: 'correctly_skipped',
        categoryLabel: 'Correctly skipped',
        explanation: 'Correctly-skipped explanation.',
        count: 2,
        issueIds: ['issue-1', 'issue-2'],
      },
    ],
    ...overrides,
  };
}

describe('ApplyFailureReportModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not fetch while closed', () => {
    render(<ApplyFailureReportModal isOpen={false} onClose={vi.fn()} jobId="job-1" />);
    expect(mockGetApplyFailureReport).not.toHaveBeenCalled();
  });

  it('fetches on open and renders a group per (suggestionType, reason), expanding needs_investigation groups by default', async () => {
    mockGetApplyFailureReport.mockResolvedValue(buildReport());

    render(<ApplyFailureReportModal isOpen onClose={vi.fn()} jobId="job-1" />);

    await waitFor(() => expect(mockGetApplyFailureReport).toHaveBeenCalledWith('job-1'));
    await screen.findByText('color-contrast-fix');
    expect(screen.getByText('table-row-reattach-fix')).toBeInTheDocument();

    // needs_investigation is expanded by default -- its explanation is visible immediately.
    expect(screen.getByText('Contrast verification explanation.')).toBeInTheDocument();
    // correctly_skipped is collapsed by default -- its explanation is not yet rendered.
    expect(screen.queryByText('Correctly-skipped explanation.')).not.toBeInTheDocument();
  });

  it('expands a collapsed group on click, revealing its explanation, reason text, and affected issue IDs', async () => {
    mockGetApplyFailureReport.mockResolvedValue(buildReport());
    render(<ApplyFailureReportModal isOpen onClose={vi.fn()} jobId="job-1" />);

    const groupButton = await screen.findByRole('button', { name: /table-row-reattach-fix/ });
    fireEvent.click(groupButton);

    expect(await screen.findByText('Correctly-skipped explanation.')).toBeInTheDocument();
    expect(screen.getByText(/issue-1, issue-2/)).toBeInTheDocument();
  });

  it('shows a loading state while the fetch is in flight', async () => {
    let resolve!: (v: ApplyFailureReport) => void;
    mockGetApplyFailureReport.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<ApplyFailureReportModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(screen.getByText('Loading…')).toBeInTheDocument();

    resolve(buildReport({ totalFailed: 0, groups: [] }));
    await waitFor(() => expect(screen.queryByText('Loading…')).not.toBeInTheDocument());
  });

  it('shows an empty state when nothing has permanently failed', async () => {
    mockGetApplyFailureReport.mockResolvedValue(buildReport({ totalFailed: 0, groups: [] }));

    render(<ApplyFailureReportModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText('Nothing has permanently failed on this job.')).toBeInTheDocument();
  });

  it('shows an error message instead of crashing when the fetch fails', async () => {
    mockGetApplyFailureReport.mockRejectedValue(new Error('network blip'));

    render(<ApplyFailureReportModal isOpen onClose={vi.fn()} jobId="job-1" />);

    expect(await screen.findByText('network blip')).toBeInTheDocument();
  });

  it('calls onClose when Close is clicked', async () => {
    mockGetApplyFailureReport.mockResolvedValue(buildReport({ totalFailed: 0, groups: [] }));
    const onClose = vi.fn();
    render(<ApplyFailureReportModal isOpen onClose={onClose} jobId="job-1" />);

    await screen.findByText('Nothing has permanently failed on this job.');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });
});
