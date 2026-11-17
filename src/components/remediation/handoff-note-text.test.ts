import { describe, it, expect } from 'vitest';
import { formatHandoffNote } from './handoff-note-text';
import type { HandoffNote } from '@/types/pdf-remediation.types';

function buildNote(overrides?: Partial<HandoffNote>): HandoffNote {
  return {
    fileName: 'Karsaklian_189165_9781606497623.pdf',
    generatedAt: '2026-11-17T12:00:00.000Z',
    score: 97,
    totalRemaining: 1,
    remainingIssues: [{ code: 'TOC-STRUCTURE-MISSING', disposition: 'manual', count: 5 }],
    autoRemediation: {
      roundsCompleted: 2,
      maxRounds: 10,
      stopReason: 'converged',
      costSpentUsd: 0.0198,
      stoppedAt: '2026-11-17T04:44:50.000Z',
    },
    teamReview: null,
    ...overrides,
  };
}

describe('formatHandoffNote', () => {
  it('states the confirmation honestly depending on the qcConfirmed flag -- never claims it when false', () => {
    const confirmed = formatHandoffNote(buildNote(), true);
    const unconfirmed = formatHandoffNote(buildNote(), false);

    expect(confirmed).toContain('Manual Full QC structure-tag review pass: completed.');
    expect(unconfirmed).toContain('Manual Full QC structure-tag review pass: NOT confirmed');
    expect(unconfirmed).not.toContain('completed.');
  });

  it('includes the real score, round history, and remaining-issue breakdown', () => {
    const text = formatHandoffNote(buildNote(), true);

    expect(text).toContain('Accessibility score: 97');
    expect(text).toContain('2 of 10 round');
    expect(text).toContain('converged');
    expect(text).toContain('TOC-STRUCTURE-MISSING ×5 — needs manual review');
  });

  it('reports no remaining issues plainly when there are none', () => {
    const text = formatHandoffNote(buildNote({ totalRemaining: 0, remainingIssues: [] }), true);
    expect(text).toContain('No remaining issues.');
  });

  it('includes the team review line only when one exists', () => {
    const withReview = formatHandoffNote(
      buildNote({ teamReview: { outcome: 'OK', reviewedAt: '2026-11-17T05:00:00.000Z', reviewedBy: 'Ambai Venkatesa', notes: 'Looks good' } }),
      true,
    );
    const withoutReview = formatHandoffNote(buildNote({ teamReview: null }), true);

    expect(withReview).toContain('OK by Ambai Venkatesa');
    expect(withReview).toContain('Looks good');
    expect(withoutReview).not.toContain('team review');
  });
});
