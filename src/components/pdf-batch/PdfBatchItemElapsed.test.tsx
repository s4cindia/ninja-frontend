import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PdfBatchItemElapsed } from './PdfBatchItemElapsed';
import type { PdfBatchItem } from '@/types/pdfBatch.types';

function item(overrides: Partial<PdfBatchItem>): PdfBatchItem {
  return {
    itemId: 'i1',
    fileName: 'a.pdf',
    originalName: 'a.pdf',
    fileSize: '1000',
    status: 'UPLOADED',
    uploadedAt: '2026-10-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('PdfBatchItemElapsed', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing for a status with no relevant start anchor (e.g. UPLOADED)', () => {
    const { container } = render(<PdfBatchItemElapsed item={item({ status: 'UPLOADED' })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for AUDITING if auditStartedAt is not present (pre-#678 item)', () => {
    const { container } = render(<PdfBatchItemElapsed item={item({ status: 'AUDITING', auditStartedAt: null })} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows elapsed time anchored on auditStartedAt while AUDITING', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:10.000Z'));

    render(<PdfBatchItemElapsed item={item({ status: 'AUDITING', auditStartedAt: '2026-10-01T12:00:00.000Z' })} />);

    expect(screen.getByTestId('pdf-batch-item-elapsed')).toHaveTextContent('10s');
  });

  it('shows elapsed time anchored on remediationStartedAt while REMEDIATING, ignoring auditStartedAt', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:01:00.000Z'));

    render(<PdfBatchItemElapsed item={item({
      status: 'REMEDIATING',
      auditStartedAt: '2026-10-01T11:00:00.000Z',
      remediationStartedAt: '2026-10-01T12:00:30.000Z',
    })} />);

    expect(screen.getByTestId('pdf-batch-item-elapsed')).toHaveTextContent('30s');
  });

  it('ticks forward every second', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-01T12:00:00.000Z'));

    render(<PdfBatchItemElapsed item={item({ status: 'AUDITING', auditStartedAt: '2026-10-01T12:00:00.000Z' })} />);
    expect(screen.getByTestId('pdf-batch-item-elapsed')).toHaveTextContent('0s');

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByTestId('pdf-batch-item-elapsed')).toHaveTextContent('3s');
  });
});
