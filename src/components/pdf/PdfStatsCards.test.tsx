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

describe('PdfStatsCards — strip-and-retag empty-shell indicator', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('a genuinely well-tagged skip (no completeness data) looks exactly as before — no regression', () => {
    renderCard({ status: 'skipped', skipReason: 'already-tagged' });

    expect(screen.getByText('Document already tagged — audited existing structure')).toBeInTheDocument();
    expect(screen.queryByText(/Existing structure incomplete/)).not.toBeInTheDocument();
    expect(screen.queryByText(/none carry real content types/)).not.toBeInTheDocument();
  });

  it('a well-tagged skip with completeness data confirming it is NOT an empty shell still looks normal', () => {
    renderCard({
      status: 'skipped',
      skipReason: 'already-tagged',
      structureTreeCompleteness: { totalElements: 40, semanticElements: 12, isEmptyShell: false },
    });

    expect(screen.getByText('Document already tagged — audited existing structure')).toBeInTheDocument();
    expect(screen.queryByText(/Existing structure incomplete/)).not.toBeInTheDocument();
  });

  it('an unresolved empty-shell skip shows the amber warning with the element count, not the calm blue message', () => {
    renderCard({
      status: 'skipped',
      skipReason: 'already-tagged',
      structureTreeCompleteness: { totalElements: 40, semanticElements: 0, isEmptyShell: true },
    });

    // Detail section (with the element count) is visible by default — expanded.
    expect(screen.getByText(/Existing structure has 40 element\(s\) but none carry real content types/)).toBeInTheDocument();
    expect(screen.queryByText('Document already tagged — audited existing structure')).not.toBeInTheDocument();

    collapseAutoTagCard();
    expect(screen.getByText('Existing structure incomplete')).toBeInTheDocument();
  });

  it('appends the retag-attempted-but-failed note only for failed-retag-error, not failed-strip-bailed', () => {
    const { unmount } = renderCard({
      status: 'skipped',
      skipReason: 'already-tagged',
      structureTreeCompleteness: { totalElements: 10, semanticElements: 0, isEmptyShell: true },
      retagOutcome: 'failed-strip-bailed',
    });
    expect(screen.queryByText(/Automatic re-tagging was attempted but failed/)).not.toBeInTheDocument();
    unmount();

    renderCard({
      status: 'skipped',
      skipReason: 'already-tagged',
      structureTreeCompleteness: { totalElements: 10, semanticElements: 0, isEmptyShell: true },
      retagOutcome: 'failed-retag-error',
    });
    expect(screen.getByText(/Automatic re-tagging was attempted but failed/)).toBeInTheDocument();
  });

  it('a successful retag shows the normal green complete state plus "(retagged)" and the strip-and-retag note', () => {
    renderCard({
      status: 'complete',
      taggerSource: 'seam-c',
      elementCounts: { figure: 3 },
      retagOutcome: 'success',
    });

    // Detail section (with the strip-and-retag note) is visible by default — expanded.
    expect(screen.getByText(/stripped and re-tagged from scratch/)).toBeInTheDocument();

    collapseAutoTagCard();
    expect(screen.getByText(/Seam-C \(YOLO\)\s*\(retagged\)/)).toBeInTheDocument();
  });

  it('a normal first-time complete tag (no retagOutcome) shows no "(retagged)" suffix or strip note', () => {
    renderCard({ status: 'complete', taggerSource: 'seam-c', elementCounts: { figure: 3 } });

    expect(screen.queryByText(/retagged/)).not.toBeInTheDocument();
    expect(screen.queryByText(/stripped and re-tagged from scratch/)).not.toBeInTheDocument();
  });
});

describe('PdfStatsCards — post-fix validation resolution rate', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the backend-computed percentage as-is, without multiplying by 100 again', () => {
    renderCard({
      status: 'complete',
      postRemediationStatus: 'complete',
      postRemediationAudit: { runAt: '2026-08-26T00:00:00.000Z', resolved: 12, remaining: 1092, regressions: 0, resolutionRate: 1.0869565217391304 },
    });

    expect(screen.getByText('Post-fix validation · 1% resolved')).toBeInTheDocument();
    expect(screen.queryByText(/109% resolved/)).not.toBeInTheDocument();
  });

  it('shows the amber failed banner, not a resolution percentage, when post-fix validation failed', () => {
    renderCard({ status: 'complete', postRemediationStatus: 'failed' });

    expect(screen.getByText('Post-fix validation failed')).toBeInTheDocument();
    expect(screen.queryByText(/resolved/)).not.toBeInTheDocument();
  });

  it('shows the pending "Validating fixes…" banner while post-fix validation is in progress', () => {
    renderCard({ status: 'complete', postRemediationStatus: 'pending' });

    expect(screen.getByText('Validating fixes…')).toBeInTheDocument();
  });

  it('shows page and validator progress together once both are populated', () => {
    renderCard({
      status: 'complete',
      postRemediationStatus: 'pending',
      postRemediationProgress: {
        currentPage: 207,
        totalPages: 414,
        completedValidators: 4,
        totalValidators: 8,
        currentValidator: 'Tables',
        updatedAt: '2026-08-27T03:34:53.907Z',
      },
    });

    expect(screen.getByText('Re-validating fixes: Page 207 of 414 · Tables (4/8)')).toBeInTheDocument();
    expect(screen.queryByText('Validating fixes…')).not.toBeInTheDocument();
  });

  it('shows only page progress when validator fields are still at their initial/absent state', () => {
    renderCard({
      status: 'complete',
      postRemediationStatus: 'pending',
      postRemediationProgress: { currentPage: 12, totalPages: 414 },
    });

    expect(screen.getByText('Re-validating fixes: Page 12 of 414')).toBeInTheDocument();
  });

  it('falls back to the plain "Validating fixes…" message when progress is absent', () => {
    renderCard({
      status: 'complete',
      postRemediationStatus: 'pending',
      postRemediationProgress: {},
    });

    expect(screen.getByText('Validating fixes…')).toBeInTheDocument();
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
