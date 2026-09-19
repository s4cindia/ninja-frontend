import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PacReportModal } from './PacReportModal';
import { getPacReport } from '../../services/pac-report.service';
import type { PacReport } from '../../services/pac-report.service';

vi.mock('../../services/pac-report.service', async () => {
  const actual = await vi.importActual<typeof import('../../services/pac-report.service')>(
    '../../services/pac-report.service'
  );
  return { ...actual, getPacReport: vi.fn() };
});

const mockGetPacReport = getPacReport as unknown as ReturnType<typeof vi.fn>;

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

describe('PacReportModal', () => {
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
});
