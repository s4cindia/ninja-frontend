import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PdfBatchResultsList } from './PdfBatchResultsList';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

vi.mock('@/components/pdf/DownloadRemediatedButton', () => ({
  DownloadRemediatedButton: ({ jobId, fileName }: { jobId: string; fileName: string }) => (
    <button type="button">Download {fileName} ({jobId})</button>
  ),
}));

function item(overrides: Partial<PdfBatchItem>): PdfBatchItem {
  return {
    itemId: 'i1',
    fileName: 'a.pdf',
    originalName: 'a.pdf',
    fileSize: '1000',
    status: 'REMEDIATED',
    uploadedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('PdfBatchResultsList', () => {
  it('renders a working download button when both remediatedFilePath and auditJobId are present (#678 live)', () => {
    render(<PdfBatchResultsList items={[item({ remediatedFilePath: 's3://x', auditJobId: 'job-1', originalName: 'report.pdf' })]} />);

    expect(screen.getByRole('button', { name: /Download report\.pdf \(job-1\)/ })).toBeInTheDocument();
  });

  it('falls back to a "pending" indicator when remediatedFilePath is present but auditJobId is not (pre-#678 item)', () => {
    render(<PdfBatchResultsList items={[item({ remediatedFilePath: 's3://x', auditJobId: null })]} />);

    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('shows a dash when there is no remediated file at all', () => {
    render(<PdfBatchResultsList items={[item({ remediatedFilePath: null, auditJobId: null, status: 'FAILED', error: 'boom' })]} />);

    expect(screen.queryByText('Pending')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders audit score, issues, auto-fixed, and guidance-only counts', () => {
    render(<PdfBatchResultsList items={[item({
      auditScore: 82,
      issuesFound: 14,
      issuesAutoFixed: 10,
      issuesGuidanceOnly: 4,
      pageCount: 23,
    })]} />);

    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('23 pages')).toBeInTheDocument();
  });

  it('shows a dash for each metric that is null rather than "0" or "undefined"', () => {
    render(<PdfBatchResultsList items={[item({ auditScore: null, issuesFound: null, issuesAutoFixed: null, issuesGuidanceOnly: null })]} />);

    expect(screen.getAllByText('—').length).toBeGreaterThanOrEqual(4);
  });
});
