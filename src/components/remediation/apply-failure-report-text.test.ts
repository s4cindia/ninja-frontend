import { describe, it, expect } from 'vitest';
import { formatApplyFailureReport } from './apply-failure-report-text';
import type { ApplyFailureReport } from '@/types/pdf-remediation.types';

function buildReport(overrides?: Partial<ApplyFailureReport>): ApplyFailureReport {
  return {
    totalFailed: 3,
    groups: [
      {
        suggestionType: 'color-contrast-fix',
        reason: 'Fix did not verify even after escalating to #000000 (measured ratio 1.06:1, needs 4.5:1)',
        category: 'needs_investigation',
        categoryLabel: 'Needs investigation -- contrast verification',
        explanation: 'Contrast verification explanation.',
        count: 1,
        issueIds: ['issue-3'],
      },
      {
        suggestionType: 'table-row-reattach-fix',
        reason: "Row already has a /P, but it does not match this row's own natural reattachment point -- declining rather than guessing",
        category: 'correctly_skipped',
        categoryLabel: 'Correctly skipped',
        explanation: 'Correctly-skipped explanation.',
        count: 2,
        issueIds: ['issue-1', 'issue-2'],
      },
    ],
    ...overrides,
  };
}

describe('formatApplyFailureReport', () => {
  it('serializes the header, every group field, and the affected issue IDs as plain text', () => {
    const text = formatApplyFailureReport(buildReport());

    expect(text).toContain('3 suggestions permanently failed to apply, in 2 groups');
    expect(text).toContain('color-contrast-fix');
    expect(text).toContain('×1');
    expect(text).toContain('Needs investigation -- contrast verification');
    expect(text).toContain('Contrast verification explanation.');
    expect(text).toContain('Fix did not verify even after escalating to #000000');
    expect(text).toContain('Affected issue: issue-3');
    expect(text).toContain('Affected issues: issue-1, issue-2');
  });

  it('singularizes "suggestion"/"group" for a report with exactly one of each', () => {
    const text = formatApplyFailureReport(buildReport({
      totalFailed: 1,
      groups: [buildReport().groups[1]],
    }));

    expect(text).toContain('1 suggestion permanently failed to apply, in 1 group');
  });
});
