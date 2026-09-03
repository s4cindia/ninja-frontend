import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfStatsCards, type AutoTagInfo } from './PdfStatsCards';
import type { PdfAuditResult, PdfAuditIssue } from '@/types/pdf.types';
import type { AiAnalysis } from '@/components/remediation/IssueCard';

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

function issue(overrides: Partial<PdfAuditIssue> & { id: string }): PdfAuditIssue {
  return {
    ruleId: 'PDF-GENERIC-001',
    severity: 'moderate',
    message: 'Generic issue',
    description: 'Generic issue description',
    ...overrides,
  };
}

function suggestion(overrides: Partial<AiAnalysis> & { issueId: string }): AiAnalysis {
  return {
    id: `ai-${overrides.issueId}`,
    jobId: 'job-1',
    suggestionType: 'alt-text',
    value: 'a description',
    guidance: null,
    confidence: 0.9,
    rationale: 'because',
    model: 'gemini',
    applyMode: 'apply-to-pdf',
    status: 'pending',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderCoverageCard(opts: { issues: PdfAuditIssue[]; aiSuggestions: Map<string, AiAnalysis>; matterhornIssueCount?: number }) {
  return render(
    <PdfStatsCards
      autoTagInfo={null}
      auditResult={{ issues: opts.issues } as unknown as PdfAuditResult}
      aiSuggestions={opts.aiSuggestions}
      aiStats={null}
      matterhornIssueCount={opts.matterhornIssueCount ?? 0}
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

describe('PdfStatsCards — AI coverage stats (stale-suggestion filtering)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('regression: does not exceed 100% AI coverage when aiSuggestions contains a stale entry whose issueId no longer exists in the current issue set (e.g. auditResult and aiSuggestions reflecting different Auto Mode rounds)', () => {
    renderCoverageCard({
      issues: [issue({ id: 'issue-1' }), issue({ id: 'issue-2' })],
      aiSuggestions: new Map([
        ['issue-1', suggestion({ issueId: 'issue-1' })],
        ['issue-2', suggestion({ issueId: 'issue-2' })],
        // Stale — from a round whose issue set has since shrunk; issue-3 no
        // longer exists in the current auditResult.
        ['issue-3', suggestion({ issueId: 'issue-3' })],
        ['issue-4', suggestion({ issueId: 'issue-4' })],
      ]),
    });

    // 2 current issues, 2 of the 4 suggestions match them -> 100%, not 200%.
    expect(screen.getByText('100% AI coverage')).toBeInTheDocument();
    expect(screen.queryByText(/200% AI coverage/)).not.toBeInTheDocument();
  });

  it('regression: excludes a stale suggestion from the AI suggestions summary count entirely, not just from the percentage', () => {
    renderCoverageCard({
      issues: [issue({ id: 'issue-1' })],
      aiSuggestions: new Map([
        ['issue-1', suggestion({ issueId: 'issue-1' })],
        ['issue-stale', suggestion({ issueId: 'issue-stale' })],
      ]),
    });

    // The Issues card is expanded by default — collapse it to see the
    // "N AI suggestions" summary metric (only shown collapsed).
    fireEvent.click(screen.getByRole('button', { name: /Issues/ }));

    const label = screen.getByText('AI suggestions');
    expect(label.previousElementSibling).toHaveTextContent('1');
  });

  it('counts a suggestion normally when its issueId matches a current issue — no false negative from the filter', () => {
    renderCoverageCard({
      issues: [issue({ id: 'issue-1' }), issue({ id: 'issue-2' })],
      aiSuggestions: new Map([
        ['issue-1', suggestion({ issueId: 'issue-1', applyMode: 'apply-to-pdf' })],
      ]),
    });

    expect(screen.getByText('50% AI coverage')).toBeInTheDocument();
  });

  it('a fully stale suggestion set (no overlap with current issues at all) shows 0% coverage, not a crash or a nonsensical ratio', () => {
    renderCoverageCard({
      issues: [issue({ id: 'issue-1' })],
      aiSuggestions: new Map([
        ['issue-old-1', suggestion({ issueId: 'issue-old-1' })],
        ['issue-old-2', suggestion({ issueId: 'issue-old-2' })],
      ]),
    });

    expect(screen.queryByText(/\d+% AI coverage/)).not.toBeInTheDocument();
    expect(screen.queryByText('AI suggestions')).not.toBeInTheDocument();
  });
});
