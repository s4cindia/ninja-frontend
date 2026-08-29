import { describe, it, expect, vi, beforeEach, type Mocked } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemediationChecklist } from './RemediationChecklist';
import { api } from '@/services/api';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import type { AiAnalysis } from '@/components/remediation/IssueCard';
import type { ComparisonTrialWithJob } from '@/types/comparisonStudy.types';

vi.mock('@/services/api', async () => {
  const actual = await vi.importActual<typeof import('@/services/api')>('@/services/api');
  return {
    ...actual,
    api: { get: vi.fn(), post: vi.fn() },
  };
});
vi.mock('@/services/comparisonStudy.service');

const mockApi = api as Mocked<typeof api>;
const mockService = vi.mocked(comparisonStudyService);

function suggestion(overrides: Partial<AiAnalysis>): AiAnalysis {
  return {
    id: overrides.id ?? 's-1',
    jobId: 'job-123',
    issueId: overrides.issueId ?? 'issue-1',
    suggestionType: 'alt-text',
    value: 'a description',
    guidance: null,
    confidence: 0.9,
    rationale: 'because',
    model: 'gemini',
    applyMode: 'apply-to-pdf',
    status: 'pending',
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
    ...overrides,
  };
}

function suggestionsMap(items: AiAnalysis[]): Map<string, AiAnalysis> {
  const map = new Map<string, AiAnalysis>();
  items.forEach(s => map.set(s.issueId, s));
  return map;
}

const baseProps = {
  jobId: 'job-123',
  aiAnalysisStatus: null as string | null,
  aiSuggestions: new Map<string, AiAnalysis>(),
  guidanceAcknowledgment: null,
  onGuidanceAcknowledged: vi.fn(),
  acrGenerated: false,
  pacReportGenerated: false,
  comparisonTrialId: null as string | null,
  userRole: 'ADMIN',
};

// Current 9-step order: 1 audit, 2 run AI analysis, 3 apply fixes,
// 4 re-audit to verify, 5 re-run AI analysis (final check),
// 6 resolve guidance-only items, 7 re-audit again to confirm manual fixes,
// 8 generate compliance artifacts, 9 mark comparison trial complete
// (conditional). Steps 4-5 were relocated ahead of guidance resolution (was
// step 4, now step 6) because a guidance-only issue can turn out to be
// auto-fixable after a re-audit — resolving it by hand first risks wasted
// Acrobat Pro work. Step 7 is new: guidance-only fixes happen entirely
// outside Ninja, so nothing else on this page ever confirms they landed.
describe('RemediationChecklist', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('step 1 is always done, step 2 reflects aiAnalysisStatus', () => {
    render(<RemediationChecklist {...baseProps} aiAnalysisStatus="processing" />);

    expect(screen.getByText('1. Initial audit complete')).toBeInTheDocument();
    const step2Row = screen.getByText('2. Run AI Analysis').closest('div')!.parentElement!;
    expect(step2Row).toHaveTextContent('In progress');
  });

  it('regression: right after AI Analysis finishes, before anything is applied, step 3 reads "Not started" — never "In progress" alongside "Recommended next"', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
      />
    );

    const step3Container = screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement!;
    expect(step3Container).toHaveTextContent('Not started');
    expect(step3Container).not.toHaveTextContent('In progress');

    // Step 3 is next up — "Recommended next" and "In progress" must never
    // both appear on the same step, since that's a direct contradiction.
    expect(step3Container).toHaveTextContent('Recommended next');
  });

  it('step 3 is not-started until AI analysis completes, then reflects pending eligible suggestions', () => {
    const { rerender } = render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="processing"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

    // AI Analysis just finished, nothing applied yet — must read "Not started",
    // not "In progress" (regression: used to flip to "in progress" the instant
    // suggestions existed, before the operator had touched anything).
    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

    // Some (but not all) eligible suggestions applied — now it's genuinely in progress.
    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([
          suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'applied' }),
          suggestion({ issueId: 'b', applyMode: 'apply-to-pdf', status: 'pending' }),
        ])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'applied' })])}
      />
    );
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 3 stays not-started (not done) for an approved-but-not-yet-applied fix (regression: must not report done before Apply Fixes runs)', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'approved' })])}
      />
    );
    // Approving alone isn't progress — only Apply Fixes actually touching the
    // PDF counts, so this must not read "Done" (the old bug) or "In progress"
    // (a later bug: approving ≠ applying, nothing has actually happened yet).
    expect(screen.getByText('3. Apply AI-suggested fixes').closest('div')!.parentElement).toHaveTextContent('Not started');
  });

  it('step 4 (re-audit) reflects postRemediationStatus', () => {
    const { rerender } = render(<RemediationChecklist {...baseProps} postRemediationStatus={undefined} />);
    expect(screen.getByText('4. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('Not started');

    rerender(<RemediationChecklist {...baseProps} postRemediationStatus="pending" />);
    expect(screen.getByText('4. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(<RemediationChecklist {...baseProps} postRemediationStatus="complete" />);
    expect(screen.getByText('4. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 4 reads Done from a manual-only re-audit too, with no automatic postRemediationStatus pass ever having run', () => {
    render(<RemediationChecklist {...baseProps} postRemediationStatus={undefined} lastVerifiedAt="2026-08-29T00:00:00.000Z" />);
    expect(screen.getByText('4. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 4 still shows In progress for a fresh automatic pass, even if an older manual re-audit already made lastVerifiedAt truthy', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        postRemediationStatus="pending"
        lastVerifiedAt="2026-08-20T00:00:00.000Z"
      />
    );
    expect(screen.getByText('4. Re-audit to verify').closest('div')!.parentElement).toHaveTextContent('In progress');
  });

  it('step 5 (re-run AI Analysis, final check) is not-started until step 4 is done, then reflects whether analysis ran again since the last re-audit', () => {
    const { rerender } = render(<RemediationChecklist {...baseProps} postRemediationStatus={undefined} />);
    expect(screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement).toHaveTextContent('Not started');

    // Re-audit just completed, AI Analysis hasn't been re-run since.
    rerender(
      <RemediationChecklist
        {...baseProps}
        postRemediationStatus="complete"
        lastVerifiedAt="2026-08-29T00:00:00.000Z"
        aiAnalyzedAt="2026-08-28T00:00:00.000Z"
      />
    );
    expect(screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement).toHaveTextContent('Not started');

    // AI Analysis currently running again.
    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="processing"
        postRemediationStatus="complete"
        lastVerifiedAt="2026-08-29T00:00:00.000Z"
        aiAnalyzedAt="2026-08-28T00:00:00.000Z"
      />
    );
    expect(screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement).toHaveTextContent('In progress');

    // Also in progress while merely queued ('pending'), matching
    // fetchAiSuggestions' own pending-or-processing definition of "active".
    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="pending"
        postRemediationStatus="complete"
        lastVerifiedAt="2026-08-29T00:00:00.000Z"
        aiAnalyzedAt="2026-08-28T00:00:00.000Z"
      />
    );
    expect(screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement).toHaveTextContent('In progress');

    // Re-run finished after the re-audit — done, and since a fixable
    // suggestion exists, nudge the operator back to step 3.
    rerender(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'apply-to-pdf', status: 'pending' })])}
        postRemediationStatus="complete"
        lastVerifiedAt="2026-08-29T00:00:00.000Z"
        aiAnalyzedAt="2026-08-29T00:05:00.000Z"
      />
    );
    const step5Container = screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement!;
    expect(step5Container).toHaveTextContent('Done');
    expect(step5Container).toHaveTextContent('1 fixable suggestion(s) now available — consider revisiting step 3.');
  });

  it('step 5 can also progress on a manual-only re-audit, with postRemediationStatus never set at all', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        postRemediationStatus={undefined}
        lastVerifiedAt="2026-08-29T00:00:00.000Z"
        aiAnalyzedAt="2026-08-29T00:05:00.000Z"
      />
    );
    expect(screen.getByText('5. Re-run AI Analysis (final check)').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 6 shows a live remaining count and a disabled confirm button until a note is entered', async () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([
          suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' }),
          suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'pending' }),
        ])}
      />
    );

    expect(screen.getByPlaceholderText('2 guidance-only item(s) remain — reason:')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: 'Acknowledge & skip' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('2 guidance-only item(s) remain — reason:'), {
      target: { value: 'out of scope for this trial' },
    });
    expect(confirmButton).not.toBeDisabled();
  });

  it('step 6 is reachable (gated on AI Analysis being done, not on the re-audit steps above it) — regression: must not require step 4/5 first, since that logic is unchanged from before the reorder', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        postRemediationStatus={undefined}
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
      />
    );
    expect(screen.getByPlaceholderText('1 guidance-only item(s) remain — reason:')).toBeInTheDocument();
  });

  it('submitting the guidance note POSTs to the acknowledgment endpoint and reports the result upward', async () => {
    const onAck = vi.fn();
    mockApi.post.mockResolvedValueOnce({
      data: {
        data: {
          note: 'out of scope',
          remainingCount: 1,
          acknowledgedAt: '2026-08-28T02:10:00.000Z',
          acknowledgedBy: 'user_abc123',
        },
      },
    });

    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
        onGuidanceAcknowledged={onAck}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('1 guidance-only item(s) remain — reason:'), {
      target: { value: 'out of scope' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Acknowledge & skip' }));

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith(
        '/pdf/job-123/ai-analysis/guidance-acknowledgment',
        { note: 'out of scope' }
      );
    });
    expect(onAck).toHaveBeenCalledWith({
      note: 'out of scope',
      remainingCount: 1,
      acknowledgedAt: '2026-08-28T02:10:00.000Z',
      acknowledgedBy: 'user_abc123',
    });
  });

  it('shows step 6 as acknowledged (not fully done) when guidance items remain but an acknowledgment exists', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
        guidanceAcknowledgment={{
          note: 'SME review needed',
          remainingCount: 1,
          acknowledgedAt: '2026-08-28T02:10:00.000Z',
          acknowledgedBy: 'user_abc123',
        }}
      />
    );

    expect(screen.getByText('6. Resolve guidance-only items').closest('div')!.parentElement).toHaveTextContent('Acknowledged');
    expect(screen.getByText(/SME review needed/)).toBeInTheDocument();
  });

  it('regression: a stale acknowledgment (new guidance-only items appeared since, pendingGuidance.length > remainingCount) does NOT read as Acknowledged, and does not anchor step 7', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        // 2 pending guidance-only items now, but the acknowledgment only
        // covered 1 (remainingCount: 1) — a later AI Analysis re-run
        // introduced a new one the operator never actually acknowledged.
        aiSuggestions={suggestionsMap([
          suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' }),
          suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'pending' }),
        ])}
        guidanceAcknowledgment={{
          note: 'SME review needed',
          remainingCount: 1,
          acknowledgedAt: '2026-08-29T00:00:00.000Z',
          acknowledgedBy: 'user_abc123',
        }}
        lastVerifiedAt="2026-08-29T01:00:00.000Z"
      />
    );

    const step6Container = screen.getByText('6. Resolve guidance-only items').closest('div')!.parentElement!;
    expect(step6Container).toHaveTextContent('Not started');
    expect(step6Container).not.toHaveTextContent('Acknowledged');
    expect(screen.getByText(/New guidance-only item\(s\) appeared since the last acknowledgment/)).toBeInTheDocument();
    // The note-input form is available again (not stuck showing only the old note).
    expect(screen.getByPlaceholderText('2 guidance-only item(s) remain — reason:')).toBeInTheDocument();

    // Step 7 must not be satisfied by the stale acknowledgedAt, even though
    // lastVerifiedAt is newer than it.
    expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');
  });

  it('a fresh acknowledgment that covers all currently-pending items (remainingCount matches) still reads as Acknowledged and anchors step 7 normally', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus="complete"
        aiSuggestions={suggestionsMap([
          suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' }),
          suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'pending' }),
        ])}
        guidanceAcknowledgment={{
          note: 'SME review needed',
          remainingCount: 2,
          acknowledgedAt: '2026-08-29T00:00:00.000Z',
          acknowledgedBy: 'user_abc123',
        }}
        lastVerifiedAt="2026-08-29T01:00:00.000Z"
      />
    );

    expect(screen.getByText('6. Resolve guidance-only items').closest('div')!.parentElement).toHaveTextContent('Acknowledged');
    expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  describe('step 7 — re-audit again to confirm manual fixes', () => {
    it('is not-started until guidance is resolved one way or another', () => {
      render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');
    });

    it('is done once lastVerifiedAt is newer than the guidance acknowledgment timestamp', () => {
      const { rerender } = render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
          guidanceAcknowledgment={{
            note: 'SME review needed',
            remainingCount: 1,
            acknowledgedAt: '2026-08-29T00:00:00.000Z',
            acknowledgedBy: 'user_abc123',
          }}
          lastVerifiedAt="2026-08-28T00:00:00.000Z"
        />
      );
      // Re-audit hasn't happened again since the acknowledgment — not done yet.
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
          guidanceAcknowledgment={{
            note: 'SME review needed',
            remainingCount: 1,
            acknowledgedAt: '2026-08-29T00:00:00.000Z',
            acknowledgedBy: 'user_abc123',
          }}
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
    });

    it('is done once lastVerifiedAt is newer than manualRemediationLastLoggedAt, when no acknowledgment exists', () => {
      render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          manualRemediationLastLoggedAt="2026-08-29T00:00:00.000Z"
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
    });

    it('anchors to whichever of acknowledgedAt / manualRemediationLastLoggedAt is later, when both exist', () => {
      render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
          guidanceAcknowledgment={{
            note: 'note',
            remainingCount: 1,
            acknowledgedAt: '2026-08-29T00:00:00.000Z',
            acknowledgedBy: 'user_abc123',
          }}
          manualRemediationLastLoggedAt="2026-08-29T02:00:00.000Z"
          // Newer than the acknowledgment but NOT newer than the (later)
          // manual time log — must not be done yet.
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');
    });

    it('falls back to "any re-audit since guidance resolved" when neither timestamp signal exists (every item resolved to zero by hand)', () => {
      const { rerender } = render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'pending' })])}
          lastVerifiedAt="2026-08-29T00:00:00.000Z"
        />
      );
      // Guidance not resolved yet — not-started.
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      // Guidance fully resolved by hand (count hits zero), no ack/manual-log
      // signal. lastVerifiedAt hasn't changed since — must not read done yet.
      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt="2026-08-29T00:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      // A fresh re-audit happens afterward — now done.
      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt="2026-08-29T03:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
    });

    it('regression: the fallback still works when guidance resolves before any re-audit has ever run (lastVerifiedAt undefined at resolution time)', () => {
      const { rerender } = render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt={undefined}
        />
      );
      // Guidance resolved by hand, no re-audit has ever happened — must not
      // be stuck "not started" forever once a re-audit does eventually run.
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt="2026-08-29T00:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
    });

    it('regression: the fallback snapshot resets when guidance becomes unresolved again, so a stale snapshot cannot mark newer guidance work done for free', () => {
      const { rerender } = render(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt="2026-08-29T00:00:00.000Z"
        />
      );
      // First cycle resolves and gets confirmed by a re-audit.
      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' })])}
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');

      // A later AI Analysis re-run introduces a NEW pending guidance-only
      // item — step 7 must drop back to not-started, not stay "Done" from
      // the old snapshot.
      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([
            suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' }),
            suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'pending' }),
          ])}
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      // Resolving the new item alone (same lastVerifiedAt as before) must
      // NOT be done yet — needs a fresh re-audit for this new cycle.
      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([
            suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' }),
            suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'applied' }),
          ])}
          lastVerifiedAt="2026-08-29T01:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Not started');

      rerender(
        <RemediationChecklist
          {...baseProps}
          aiAnalysisStatus="complete"
          aiSuggestions={suggestionsMap([
            suggestion({ issueId: 'a', applyMode: 'guidance-only', status: 'applied' }),
            suggestion({ issueId: 'b', applyMode: 'guidance-only', status: 'applied' }),
          ])}
          lastVerifiedAt="2026-08-29T02:00:00.000Z"
        />
      );
      expect(screen.getByText('7. Re-audit again to confirm manual fixes').closest('div')!.parentElement).toHaveTextContent('Done');
    });
  });

  it('step 8 only shows Done once both ACR and PAC report are generated', () => {
    const { rerender } = render(<RemediationChecklist {...baseProps} acrGenerated pacReportGenerated={false} />);
    expect(screen.getByText('8. Generate compliance artifacts').closest('div')!.parentElement).toHaveTextContent('In progress');

    rerender(<RemediationChecklist {...baseProps} acrGenerated pacReportGenerated />);
    expect(screen.getByText('8. Generate compliance artifacts').closest('div')!.parentElement).toHaveTextContent('Done');
  });

  it('step 9 does not render when there is no linked comparison trial', () => {
    render(<RemediationChecklist {...baseProps} comparisonTrialId={null} />);
    expect(screen.queryByText(/Mark comparison trial complete/)).not.toBeInTheDocument();
  });

  it('step 9 renders, fetches trial status, and confirms via the validate endpoint for an admin/operator', async () => {
    const trial = { id: 'ct_xyz789', status: 'pdfxt_logged' } as ComparisonTrialWithJob;
    mockService.getTrial.mockResolvedValueOnce(trial);
    mockService.validateTrial.mockResolvedValueOnce({ ...trial, status: 'validated' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="ADMIN" />);

    await waitFor(() => {
      expect(mockService.getTrial).toHaveBeenCalledWith('ct_xyz789');
    });
    expect(screen.getByText(/9\. Mark comparison trial complete/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Mark trial complete' }));

    await waitFor(() => {
      expect(mockService.validateTrial).toHaveBeenCalledWith('ct_xyz789');
    });
    await waitFor(() => {
      expect(screen.getByText('9. Mark comparison trial complete').closest('div')!.parentElement).toHaveTextContent('Done');
    });
  });

  it('step 9 disables the confirm button and explains why for a non-admin/operator role', async () => {
    mockService.getTrial.mockResolvedValueOnce({ id: 'ct_xyz789', status: 'registered' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="VIEWER" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark trial complete' })).toBeDisabled();
    });
    expect(screen.getByText('Requires an Admin or Operator role.')).toBeInTheDocument();
  });

  it('step 9 disables the confirm button for an admin/operator until pdfxt data is logged (mirrors the trial workspace guard)', async () => {
    mockService.getTrial.mockResolvedValueOnce({ id: 'ct_xyz789', status: 'registered' } as ComparisonTrialWithJob);

    render(<RemediationChecklist {...baseProps} comparisonTrialId="ct_xyz789" userRole="ADMIN" />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark trial complete' })).toBeDisabled();
    });
    expect(screen.getByText('Log pdfxt data first.')).toBeInTheDocument();
    expect(mockService.validateTrial).not.toHaveBeenCalled();
  });

  it('marks the first incomplete step as "Recommended next"', () => {
    render(
      <RemediationChecklist
        {...baseProps}
        aiAnalysisStatus={null}
      />
    );

    // Step 1 is always done, so step 2 (Run AI Analysis) should be next.
    const step2Container = screen.getByText('2. Run AI Analysis').closest('div')!.parentElement!;
    expect(step2Container).toHaveTextContent('Recommended next');
    const step1Container = screen.getByText('1. Initial audit complete').closest('div')!.parentElement!;
    expect(step1Container).not.toHaveTextContent('Recommended next');
  });
});
