import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReportMetadataSection } from '../ReportMetadataSection';
import type { AcrJob } from '@/types/acr-report.types';

vi.mock('@/hooks/useAcrReport', () => ({
  useUpdateReportMetadata: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const baseJob: AcrJob = {
  id: 'acr-1',
  jobId: 'job-1',
  edition: 'VPAT2.5-INT',
  documentTitle: 'Sample Book.epub',
  status: 'in_review',
  executiveSummary: 'Summary text.',
  documentType: 'epub',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-10T00:00:00Z',
};

function renderWithClient(job: AcrJob) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ReportMetadataSection acrJob={job} />
    </QueryClientProvider>,
  );
}

describe('ReportMetadataSection — Certification block', () => {
  it('does not render the Certification block when publisherMetadata is absent', () => {
    renderWithClient(baseJob);
    expect(
      screen.queryByRole('heading', { name: /Certification/i }),
    ).not.toBeInTheDocument();
  });

  it('renders certifier, credential, conformance and statement links when present', () => {
    renderWithClient({
      ...baseJob,
      edition: 'VPAT2.5-PRH-UK',
      publisherMetadata: {
        certifiedBy: 'Penguin Random House UK',
        certifierCredential: 'Ace by DAISY OK',
        credentialUrl: 'https://daisy.github.io/ace',
        conformsTo: 'EPUB Accessibility 1.1 - WCAG 2.2 Level AA',
        accessibilitySummaryUrl: 'https://www.penguin.co.uk/accessibility',
        tdmReservationNote: 'Reserved per DSM Directive 2019/790 Article 4.',
      },
    });

    expect(
      screen.getByRole('heading', { name: /Certification/i }),
    ).toBeInTheDocument();
    expect(screen.getByText('Penguin Random House UK')).toBeInTheDocument();

    const credential = screen.getByRole('link', { name: /Ace by DAISY OK/i });
    expect(credential).toHaveAttribute('href', 'https://daisy.github.io/ace');
    expect(credential).toHaveAttribute('target', '_blank');

    expect(
      screen.getByText('EPUB Accessibility 1.1 - WCAG 2.2 Level AA'),
    ).toBeInTheDocument();

    const statement = screen.getByRole('link', {
      name: /penguin\.co\.uk\/accessibility/i,
    });
    expect(statement).toHaveAttribute(
      'href',
      'https://www.penguin.co.uk/accessibility',
    );
  });

  it('hides the TDM-reservation note behind an expandable toggle', async () => {
    renderWithClient({
      ...baseJob,
      publisherMetadata: {
        certifiedBy: 'Penguin Random House UK',
        certifierCredential: 'Ace by DAISY OK',
        credentialUrl: 'https://daisy.github.io/ace',
        conformsTo: 'EPUB Accessibility 1.1 - WCAG 2.2 Level AA',
        accessibilitySummaryUrl: 'https://www.penguin.co.uk/accessibility',
        tdmReservationNote: 'Reserved per DSM Directive 2019/790 Article 4.',
      },
    });

    expect(
      screen.queryByText(/Reserved per DSM Directive/i),
    ).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /Show TDM-reservation note/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByText(/Reserved per DSM Directive/i)).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent(/Hide TDM-reservation note/i);

    await userEvent.click(toggle);
    expect(
      screen.queryByText(/Reserved per DSM Directive/i),
    ).not.toBeInTheDocument();
  });

  it('omits the TDM toggle entirely when no note is supplied', () => {
    renderWithClient({
      ...baseJob,
      publisherMetadata: {
        certifiedBy: 'Penguin Random House UK',
        certifierCredential: 'Ace by DAISY OK',
        credentialUrl: 'https://daisy.github.io/ace',
        conformsTo: 'EPUB Accessibility 1.1 - WCAG 2.2 Level AA',
        accessibilitySummaryUrl: 'https://www.penguin.co.uk/accessibility',
      },
    });
    expect(screen.queryByRole('button', { name: /TDM-reservation/i })).not.toBeInTheDocument();
  });
});
