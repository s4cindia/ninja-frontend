import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PacReportModal } from './PacReportModal';
import { getPacReport, runLivePacCheck, getAxes4QuotaStatus } from '../../services/pac-report.service';
import type { PacReport, Axes4LiveResult, Axes4QuotaStatus } from '../../services/pac-report.service';

vi.mock('../../services/pac-report.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/pac-report.service')>(
    '../../services/pac-report.service'
  );
  return {
    ...actual,
    getPacReport: vi.fn(),
    runLivePacCheck: vi.fn(),
    getAxes4QuotaStatus: vi.fn(),
  };
});

const mockGetPacReport = getPacReport as unknown as ReturnType<typeof vi.fn>;
const mockRunLivePacCheck = runLivePacCheck as unknown as ReturnType<typeof vi.fn>;
const mockGetAxes4QuotaStatus = getAxes4QuotaStatus as unknown as ReturnType<typeof vi.fn>;

function buildReport(source?: 'ninja' | 'verapdf' | 'pdfa11y'): PacReport {
  return {
    jobId: 'job-1',
    fileName: 'report.pdf',
    generatedAt: '2024-01-15T10:00:00Z',
    ninjaVersion: '1.0.0',
    isTagged: true,
    summary: { total: 1, pass: 0, fail: 1, untested: 0, humanRequired: 0, notApplicable: 0 },
    checkpoints: [
      {
        id: '01',
        title: 'Real Content',
        status: 'FAIL',
        conditions: [
          {
            id: '01-001',
            description: 'Content shall be marked as either Real or Artifact.',
            how: 'M',
            status: 'FAIL',
            issueIds: ['issue-1'],
            source,
          },
        ],
      },
    ],
  };
}

function buildQuota(overrides?: Partial<Axes4QuotaStatus>): Axes4QuotaStatus {
  return {
    configured: true,
    pagesUsedThisPeriod: 10,
    pagesLimitThisPeriod: 100,
    periodResetAt: '2026-11-01T12:00:00Z',
    ...overrides,
  };
}

function buildLiveResult(overrides?: Partial<Axes4LiveResult>): Axes4LiveResult {
  return {
    ran: true,
    uaIndex: 48.73,
    configured: true,
    source: 'original',
    failures: [
      { checkId: 'FontsAreEmbedded', description: 'Font not embedded', pageNumber: 1, count: 1 },
      { checkId: 'ValidLanguageCheck', description: 'Document language metadata contains a syntax error', count: 1 },
    ],
    ...overrides,
  };
}

describe('PacReportModal', () => {
  beforeEach(() => {
    mockGetPacReport.mockReset();
    mockRunLivePacCheck.mockReset();
    mockGetAxes4QuotaStatus.mockReset().mockResolvedValue(buildQuota({ configured: false }));
  });

  it('shows a provenance badge on a failing condition when the backend attributes a source', async () => {
    mockGetPacReport.mockResolvedValue(buildReport('verapdf'));

    render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('veraPDF')).toBeInTheDocument());
  });

  it('renders the newer pdfa11y source correctly', async () => {
    mockGetPacReport.mockResolvedValue(buildReport('pdfa11y'));

    render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('pdfa11y')).toBeInTheDocument());
  });

  it('does not show a provenance badge when the condition has no source (older reports)', async () => {
    mockGetPacReport.mockResolvedValue(buildReport(undefined));

    render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

    await waitFor(() => expect(screen.getByText('01-001')).toBeInTheDocument());
    expect(screen.queryByText('Ninja')).not.toBeInTheDocument();
    expect(screen.queryByText('veraPDF')).not.toBeInTheDocument();
    expect(screen.queryByText('pdfa11y')).not.toBeInTheDocument();
  });

  describe('axes4 Live Check tab', () => {
    it('hides the tab entirely when axes4 is not configured in this environment', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota({ configured: false }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      await waitFor(() => expect(mockGetAxes4QuotaStatus).toHaveBeenCalled());
      expect(screen.queryByRole('tab', { name: 'axes4 Live Check' })).not.toBeInTheDocument();
    });

    it('shows the tab and the quota line when configured', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota({ pagesUsedThisPeriod: 42, pagesLimitThisPeriod: 500 }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));

      expect(await screen.findByText(/42 of 500 pages used this period/)).toBeInTheDocument();
      expect(screen.getByText(/resets Nov 1, 2026/)).toBeInTheDocument();
    });

    it('disables Run Live Check once the page quota is exhausted', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota({ pagesUsedThisPeriod: 100, pagesLimitThisPeriod: 100 }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));

      const runButton = await screen.findByRole('button', { name: 'Run Live Check' });
      expect(runButton).toBeDisabled();
      expect(runButton).toHaveAttribute('title', expect.stringMatching(/quota exhausted/i));
    });

    it('shows distinct loading copy while the live check is running, not the free report\'s "Generating report…"', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      let resolveRun!: (v: Axes4LiveResult) => void;
      mockRunLivePacCheck.mockImplementation(() => new Promise((resolve) => { resolveRun = resolve; }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Run Live Check' }));

      expect(await screen.findByText(/Running live axes4 PAC Cloud check — this can take a minute or two…/)).toBeInTheDocument();
      expect(screen.queryByText('Generating report…')).not.toBeInTheDocument();

      resolveRun(buildLiveResult({ ran: false }));
      await screen.findByText(/This check could not complete/);
    });

    it('renders the uaIndex and the flat failure list on a successful run, including a document-level failure with no pageNumber', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      mockRunLivePacCheck.mockResolvedValue(buildLiveResult());

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Run Live Check' }));

      expect(await screen.findByText('48.7')).toBeInTheDocument();
      expect(screen.getByText('FontsAreEmbedded')).toBeInTheDocument();
      expect(screen.getByText('Page 1')).toBeInTheDocument();
      expect(screen.getByText('ValidLanguageCheck')).toBeInTheDocument();
      expect(screen.getByText('Document-level')).toBeInTheDocument();
    });

    it('shows the failure count multiplier only when greater than 1', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      mockRunLivePacCheck.mockResolvedValue(buildLiveResult({
        failures: [{ checkId: 'RepeatedCheck', description: 'Happens a lot', count: 3 }],
      }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Run Live Check' }));

      expect(await screen.findByText('×3')).toBeInTheDocument();
    });

    it('shows a neutral (non-error-styled) message when ran is false, since it is an expected outcome not a failure', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      mockRunLivePacCheck.mockResolvedValue(buildLiveResult({ ran: false, uaIndex: undefined, failures: [] }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Run Live Check' }));

      const message = await screen.findByText(/This check could not complete/);
      expect(message).toBeInTheDocument();
      expect(message.className).not.toMatch(/text-red/);
    });

    it('shows a rate-limit-specific message on a 429, not a generic error', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      mockRunLivePacCheck.mockRejectedValue({
        isAxiosError: true,
        message: 'Request failed with status code 429',
        response: { status: 429, data: {} },
      });

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      fireEvent.click(await screen.findByRole('button', { name: 'Run Live Check' }));

      expect(await screen.findByText(/axes4 live check rate limit reached — try again in about a minute/)).toBeInTheDocument();
    });

    it('refetches quota after a successful run so the used/limit line updates without reopening the modal', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus
        .mockResolvedValueOnce(buildQuota({ pagesUsedThisPeriod: 10, pagesLimitThisPeriod: 100 }))
        .mockResolvedValueOnce(buildQuota({ pagesUsedThisPeriod: 15, pagesLimitThisPeriod: 100 }));
      mockRunLivePacCheck.mockResolvedValue(buildLiveResult());

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      expect(await screen.findByText(/10 of 100 pages used this period/)).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Run Live Check' }));

      expect(await screen.findByText(/15 of 100 pages used this period/)).toBeInTheDocument();
      expect(mockGetAxes4QuotaStatus).toHaveBeenCalledTimes(2);
    });

    it('does not refetch quota after a run that did not complete (ran: false) — nothing was billed', async () => {
      mockGetPacReport.mockResolvedValue(buildReport());
      mockGetAxes4QuotaStatus.mockResolvedValue(buildQuota());
      mockRunLivePacCheck.mockResolvedValue(buildLiveResult({ ran: false, uaIndex: undefined, failures: [] }));

      render(<PacReportModal isOpen jobId="job-1" onClose={() => {}} />);

      fireEvent.click(await screen.findByRole('tab', { name: 'axes4 Live Check' }));
      await waitFor(() => expect(mockGetAxes4QuotaStatus).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole('button', { name: 'Run Live Check' }));
      await screen.findByText(/This check could not complete/);

      expect(mockGetAxes4QuotaStatus).toHaveBeenCalledTimes(1);
    });
  });
});
