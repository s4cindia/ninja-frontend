/**
 * Plain-text serialization of an ApplyFailureReport, for
 * ApplyFailureReportModal's copy button. Kept in a non-component file so the
 * react-refresh/only-export-components rule (fast-refresh only works when a
 * file exports components only) stays clean — same convention as
 * src/components/pdf/autoModeSparkline.ts.
 */
import type { ApplyFailureReport } from '@/types/pdf-remediation.types';

/**
 * An operator's real workflow around this report is pasting it somewhere
 * else entirely (a ticket, a chat with whoever's investigating), not reading
 * it only inside the modal.
 */
export function formatApplyFailureReport(report: ApplyFailureReport): string {
  const header = `${report.totalFailed} suggestion${report.totalFailed === 1 ? '' : 's'} permanently failed to apply, in ${report.groups.length} group${report.groups.length === 1 ? '' : 's'}`;
  const groups = report.groups.map((group) => [
    group.suggestionType,
    `×${group.count}`,
    group.categoryLabel,
    '',
    group.explanation,
    '',
    group.reason,
    '',
    `Affected issue${group.issueIds.length === 1 ? '' : 's'}: ${group.issueIds.join(', ')}`,
  ].join('\n'));
  return [header, ...groups].join('\n\n\n');
}
