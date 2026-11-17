/**
 * Plain-text serialization of a HandoffNote, for HandoffNoteModal's copy and
 * download actions — kept in a non-component file so the
 * react-refresh/only-export-components rule stays clean, same convention as
 * apply-failure-report-text.ts.
 */
import type { HandoffNote } from '@/types/pdf-remediation.types';

const DISPOSITION_LABEL: Record<string, string> = {
  manual: 'needs manual review',
  'auto-resolved': 'ready, pending your approval',
};

function dispositionLabel(disposition: string): string {
  return DISPOSITION_LABEL[disposition] ?? disposition;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

/**
 * `qcConfirmed` is UI state (the modal's own confirmation checkbox), not
 * part of the fetched HandoffNote — this is the one place that line gets
 * composed in, so the note text and the data type stay honest about what
 * the backend actually knows versus what a human confirmed.
 */
export function formatHandoffNote(note: HandoffNote, qcConfirmed: boolean): string {
  const lines: string[] = [];
  lines.push(`QC Handoff Note — ${note.fileName}`);
  lines.push(`Generated ${formatDate(note.generatedAt)}`);
  lines.push('');
  lines.push(`Accessibility score: ${note.score ?? 'n/a'}`);

  if (note.autoRemediation) {
    const r = note.autoRemediation;
    lines.push(
      `Auto-remediation: ${r.roundsCompleted} of ${r.maxRounds} round${r.maxRounds === 1 ? '' : 's'} run, ` +
      `stopped (${r.stopReason ?? 'unknown'})` +
      (r.stoppedAt ? ` on ${formatDate(r.stoppedAt)}` : '')
    );
  }

  lines.push(qcConfirmed
    ? 'Manual Full QC structure-tag review pass: completed.'
    : 'Manual Full QC structure-tag review pass: NOT confirmed — this note was generated without that confirmation.');

  if (note.teamReview) {
    lines.push(`Most recent team review: ${note.teamReview.outcome} by ${note.teamReview.reviewedBy} on ${formatDate(note.teamReview.reviewedAt)}${note.teamReview.notes ? ` — "${note.teamReview.notes}"` : ''}`);
  }

  lines.push('');
  if (note.totalRemaining === 0) {
    lines.push('No remaining issues.');
  } else {
    lines.push(`Remaining issues: ${note.totalRemaining}`);
    for (const issue of note.remainingIssues) {
      lines.push(`  - ${issue.code} ×${issue.count} — ${dispositionLabel(issue.disposition)}`);
    }
  }

  return lines.join('\n');
}
