import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CertificationSection } from '../CertificationSection';
import type { PublisherMetadata } from '@/types/acr.types';

const sampleMetadata: PublisherMetadata = {
  certifiedBy: 'Penguin Random House UK',
  certifierCredential: 'Ace by DAISY OK',
  credentialUrl: 'https://daisy.github.io/ace',
  conformsTo: 'EPUB Accessibility 1.1 - WCAG 2.2 Level AA',
  accessibilitySummaryUrl: 'https://www.penguin.co.uk/accessibility',
  tdmReservationNote: 'Reserved per DSM Directive 2019/790 Article 4.',
};

describe('CertificationSection', () => {
  it('renders certifier, credential, conformance and statement links', () => {
    render(<CertificationSection metadata={sampleMetadata} />);

    expect(
      screen.getByRole('heading', { level: 2, name: /Certification/i }),
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
    render(<CertificationSection metadata={sampleMetadata} />);

    expect(screen.queryByText(/Reserved per DSM Directive/i)).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: /Show TDM-reservation note/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(toggle);
    expect(screen.getByText(/Reserved per DSM Directive/i)).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(toggle).toHaveTextContent(/Hide TDM-reservation note/i);

    await userEvent.click(toggle);
    expect(screen.queryByText(/Reserved per DSM Directive/i)).not.toBeInTheDocument();
  });

  it('omits the TDM toggle entirely when no note is supplied', () => {
    const { tdmReservationNote, ...rest } = sampleMetadata;
    void tdmReservationNote;
    render(<CertificationSection metadata={rest} />);
    expect(
      screen.queryByRole('button', { name: /TDM-reservation/i }),
    ).not.toBeInTheDocument();
  });

  it('does not render a clickable link when credentialUrl uses an unsafe scheme', () => {
    render(
      <CertificationSection
        metadata={{
          ...sampleMetadata,
          credentialUrl: 'javascript:alert(1)',
        }}
      />,
    );
    // The credential label still renders, but as plain text — no anchor.
    expect(screen.getByText('Ace by DAISY OK')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Ace by DAISY OK/i }),
    ).not.toBeInTheDocument();
    // The accessibility statement link is still safe.
    expect(
      screen.getByRole('link', { name: /penguin\.co\.uk\/accessibility/i }),
    ).toBeInTheDocument();
  });

  it('falls back to "Not provided" when the accessibility statement URL is unsafe', () => {
    render(
      <CertificationSection
        metadata={{
          ...sampleMetadata,
          accessibilitySummaryUrl: 'not-a-url',
        }}
      />,
    );
    expect(screen.getByText(/Not provided/i)).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /accessibility/i }),
    ).not.toBeInTheDocument();
  });
});
