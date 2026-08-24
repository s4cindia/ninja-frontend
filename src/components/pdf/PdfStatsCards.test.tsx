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

describe('PdfStatsCards — AI Analysis card color-contrast re-analysis link', () => {
  const emptyAiStats = {
    gemini: { totalTokens: 0, estimatedCostUsd: 0 },
    claude: { totalTokens: 0, estimatedCostUsd: 0 },
    totalTokens: 0,
    totalCostUsd: 0,
  };

  function renderAiCard(overrides?: {
    isAnalyzingAi?: boolean;
    onRerunWithColorContrastFix?: () => void;
    isRerunningColorContrastFix?: boolean;
  }) {
    return render(
      <PdfStatsCards
        autoTagInfo={null}
        auditResult={mockAuditResult}
        aiSuggestions={new Map()}
        aiStats={emptyAiStats}
        matterhornIssueCount={0}
        isAnalyzingAi={overrides?.isAnalyzingAi ?? false}
        aiProgress={null}
        onViewAutoTagReport={vi.fn()}
        onRetryAutoTag={vi.fn()}
        isRetryingAutoTag={false}
        onRerunWithColorContrastFix={overrides?.onRerunWithColorContrastFix}
        isRerunningColorContrastFix={overrides?.isRerunningColorContrastFix}
        jobId="job-1"
      />
    );
  }

  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the link and calls the handler on click', () => {
    const onRerun = vi.fn();
    renderAiCard({ onRerunWithColorContrastFix: onRerun });

    const link = screen.getByRole('button', { name: 'Re-run AI analysis with color-contrast auto-fix' });
    fireEvent.click(link);

    expect(onRerun).toHaveBeenCalledTimes(1);
  });

  it('is absent when no handler is passed (backwards compatible with other callers)', () => {
    renderAiCard();

    expect(
      screen.queryByRole('button', { name: 'Re-run AI analysis with color-contrast auto-fix' })
    ).not.toBeInTheDocument();
  });

  it('shows a disabled spinner state while re-running', () => {
    renderAiCard({ onRerunWithColorContrastFix: vi.fn(), isRerunningColorContrastFix: true });

    const link = screen.getByRole('button', { name: /Re-running with color-contrast auto-fix/ });
    expect(link).toBeDisabled();
    expect(
      screen.queryByText('Re-run AI analysis with color-contrast auto-fix')
    ).not.toBeInTheDocument();
  });

  it('is hidden while AI analysis is already in progress', () => {
    renderAiCard({ onRerunWithColorContrastFix: vi.fn(), isAnalyzingAi: true });

    expect(
      screen.queryByRole('button', { name: /color-contrast auto-fix/ })
    ).not.toBeInTheDocument();
  });
});
