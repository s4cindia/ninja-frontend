import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfJobProgressPanel } from './PdfJobProgressPanel';
import type { JobData } from '@/hooks/useJobPolling';

function job(overrides?: Partial<JobData>): JobData {
  return {
    id: 'job-1',
    status: 'PROCESSING',
    type: 'PDF_ACCESSIBILITY',
    createdAt: '2026-08-01T10:00:00.000Z',
    startedAt: '2026-08-01T10:00:05.000Z',
    input: {},
    ...overrides,
  };
}

describe('PdfJobProgressPanel', () => {
  it('shows the "Page X of Y" extraction indicator while pages are still being extracted', () => {
    render(
      <PdfJobProgressPanel
        jobData={job({ input: { totalPages: 40 } })}
        progress={40}
      />
    );

    // progress=40 -> currentPage = round(((40-20)/68)*40) = 12
    expect(screen.getByText('Page 12 of 40')).toBeInTheDocument();
    // "Structure & Tags" still appears once, as a Timing-table row label — but the
    // step checklist itself (which would render it a second time) is not shown yet.
    expect(screen.getAllByText('Structure & Tags')).toHaveLength(1);
  });

  it('shows the validator step checklist once page extraction is done, with the next step spinning and the rest pending', () => {
    render(
      <PdfJobProgressPanel
        jobData={job({ input: { totalPages: 40, validatorProgress: [] } })}
        progress={95}
      />
    );

    // Each label now renders twice: once in the step checklist, once as a Timing-table row.
    expect(screen.getAllByText('Structure & Tags')).toHaveLength(2);
    expect(screen.getAllByText('Alt Text')).toHaveLength(2);
    expect(screen.getAllByText('Color Contrast')).toHaveLength(2);
    expect(screen.getAllByText('Tables')).toHaveLength(2);
  });

  it('marks completed validators done with their issue count, using singular/plural correctly', () => {
    const { container } = render(
      <PdfJobProgressPanel
        jobData={job({
          input: {
            totalPages: 40,
            validatorProgress: [
              { label: 'Structure & Tags', issuesFound: 3, startedAt: '2026-08-01T10:00:10.000Z', completedAt: '2026-08-01T10:00:20.000Z' },
              { label: 'Alt Text', issuesFound: 1, startedAt: '2026-08-01T10:00:20.000Z', completedAt: '2026-08-01T10:00:25.000Z' },
            ],
          },
        })}
        progress={97}
      />
    );

    expect(container.textContent).toContain('Structure & Tags');
    expect(container.textContent).toContain('3 issues');
    expect(container.textContent).toContain('Alt Text');
    expect(container.textContent).toContain('1 issue');
    expect(container.textContent).not.toContain('1 issues');
  });

  it('renders no checklist when totalPages is absent, but still renders the Timing table', () => {
    render(<PdfJobProgressPanel jobData={job({ input: {} })} progress={5} />);

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    // Only the Timing-table row remains — the step checklist itself doesn't render.
    expect(screen.getAllByText('Structure & Tags')).toHaveLength(1);
    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });

  it('includes an Upload row using uploadStart/uploadEnd when showUploadRow is set', () => {
    render(
      <PdfJobProgressPanel
        jobData={job()}
        progress={10}
        showUploadRow
        uploadStart={new Date('2026-08-01T09:59:50.000Z')}
        uploadEnd={new Date('2026-08-01T10:00:00.000Z')}
      />
    );

    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('omits the Upload row and anchors Queue to jobData.createdAt when showUploadRow is false (server-started jobs)', () => {
    render(<PdfJobProgressPanel jobData={job({ input: {} })} progress={5} />);

    expect(screen.queryByText('Upload')).not.toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });

  it('shows an Adobe AutoTag row with element-count detail when autoTagProgress is present and complete', () => {
    const { container } = render(
      <PdfJobProgressPanel
        jobData={job({
          input: {
            autoTagProgress: {
              startedAt: '2026-08-01T10:00:05.000Z',
              completedAt: '2026-08-01T10:00:15.000Z',
              status: 'complete',
              elementCounts: { figures: 2, tables: 1, headings: 5 },
            },
          },
        })}
        progress={15}
      />
    );

    expect(screen.getByText('Adobe AutoTag')).toBeInTheDocument();
    expect(container.textContent).toContain('2F');
    expect(container.textContent).toContain('1T');
    expect(container.textContent).toContain('5H');
  });

  it('labels the row "Seam-C (YOLO)" instead of "Adobe AutoTag" when that\'s the tagger that actually ran (regression: used to say Adobe unconditionally)', () => {
    render(
      <PdfJobProgressPanel
        jobData={job({
          input: { autoTagProgress: { startedAt: '2026-08-01T10:00:05.000Z', status: 'processing' } },
          output: { taggerSource: 'seam-c' },
        })}
        progress={15}
      />
    );

    expect(screen.getByText('Seam-C (YOLO)')).toBeInTheDocument();
    expect(screen.queryByText('Adobe AutoTag')).not.toBeInTheDocument();
  });

  it('handles a null jobData without crashing, rendering an empty Timing table', () => {
    render(<PdfJobProgressPanel jobData={null} progress={0} />);

    expect(screen.getByText('Timing')).toBeInTheDocument();
    expect(screen.getByText('Queue')).toBeInTheDocument();
  });
});
