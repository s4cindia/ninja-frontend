import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfStatsCards, type AutoTagInfo } from './PdfStatsCards';
import type { PdfAuditResult } from '@/types/pdf.types';

const mockAuditResult = { issues: [] } as unknown as PdfAuditResult;

function renderCard(autoTagInfo: AutoTagInfo | null) {
  return render(
    <PdfStatsCards
      autoTagInfo={autoTagInfo}
      auditResult={mockAuditResult}
      aiSuggestions={new Map()}
      aiStats={null}
      matterhornIssueCount={0}
      isAnalyzingAi={false}
      aiProgress={null}
      onViewAutoTagReport={vi.fn()}
      onRetryAutoTag={vi.fn()}
      isRetryingAutoTag={false}
      jobId="job-1"
    />
  );
}

function collapseAutoTagCard() {
  fireEvent.click(screen.getByRole('button', { name: /Auto Tag/ }));
}

describe('PdfStatsCards — Auto Tag card status display', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows an informational, non-alarming message with no Retry button for already-tagged skips', () => {
    renderCard({ status: 'skipped', skipReason: 'already-tagged' });

    expect(screen.getByText('Document already tagged — audited existing structure')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('Auto-tagging failed')).not.toBeInTheDocument();

    collapseAutoTagCard();
    expect(screen.getByText('Document already tagged')).toBeInTheDocument();
  });

  it('keeps the no-tagger-configured skip low-key with no Retry button', () => {
    renderCard({ status: 'skipped', skipReason: 'no-tagger-configured' });

    expect(screen.getByText('No tagger available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
    expect(screen.queryByText('Auto-tagging failed')).not.toBeInTheDocument();
  });

  it('still shows the failed state with a Retry button for a real failure', () => {
    renderCard({ status: 'failed', error: 'Adobe API timeout' });

    // The Auto Tag card is expanded by default, so the detail section
    // (with Retry) is already visible without collapsing first.
    expect(screen.getByText('Auto-tagging failed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('still shows the complete state unaffected', () => {
    renderCard({ status: 'complete', taggerSource: 'seam-c', elementCounts: { figure: 2 } });

    collapseAutoTagCard();
    expect(screen.getByText(/Seam-C \(YOLO\)/)).toBeInTheDocument();
  });
});
