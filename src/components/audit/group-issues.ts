/**
 * Pure grouping helpers for the audit-results issue list.
 *
 * Background: P3 backend introduces per-XHTML scanners that fire heavily on
 * legacy books — `PRH-MARKUP-DEPRECATED-TAG` (every <b>/<i>),
 * `PRH-MARKUP-INLINE-STYLE` (every style="…"), `PRH-PAGEBREAK-MALFORMED`
 * (every misshapen pagebreak), `PRH-FOOTNOTE-ID-MISMATCH` (every orphan
 * noteref). A typical pre-Style-Guide PRH book can produce 50–300 instances
 * per code. The flat issue list becomes unusable at that volume.
 *
 * This module turns a flat issue array into a list of "entries" where each
 * entry is either a single flat issue (rendered as the existing IssueCard)
 * or a group of same-code issues (rendered as a collapsible header). Groups
 * carry per-file sub-buckets so the UI can drill down: code → file → instance.
 */

export interface GroupableIssue {
  id: string;
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  location?: string;
  source: string;
}

export interface FileBucket<T extends GroupableIssue> {
  /** File path the issues share. Falls back to `'(no location)'` for orphans. */
  filePath: string;
  issues: T[];
}

export interface GroupEntry<T extends GroupableIssue> {
  kind: 'group';
  code: string;
  /** Total number of issues collapsed into this group. */
  count: number;
  /** Issues bucketed by file, in first-seen order. */
  files: FileBucket<T>[];
  /** Common severity if all issues share one, otherwise the most severe. */
  severity: GroupableIssue['severity'];
  /** Issues in original order — useful for expanding "all" without per-file drill. */
  issues: T[];
}

export interface FlatEntry<T extends GroupableIssue> {
  kind: 'flat';
  issue: T;
}

export type IssueEntry<T extends GroupableIssue> = GroupEntry<T> | FlatEntry<T>;

/**
 * Code prefixes that ALWAYS get grouped, even at low instance counts. These
 * are the P3 high-volume scanners — even 2 instances of the same deprecated
 * tag are easier to scan when grouped, and the count typically explodes
 * anyway on real books.
 */
const ALWAYS_GROUP_PREFIXES = [
  'PRH-MARKUP-',
  'PRH-PAGEBREAK-',
  'PRH-FOOTNOTE-',
] as const;

/**
 * Other PRH codes get grouped only if the instance count exceeds this
 * threshold. Picked so a sub-handful of issues stay flat (operator can read
 * each one) but a longer list collapses (operator gets a count + drill-down).
 */
const PRH_GROUP_COUNT_THRESHOLD = 10;

const SEVERITY_RANK: Record<GroupableIssue['severity'], number> = {
  critical: 4,
  serious: 3,
  moderate: 2,
  minor: 1,
};

function shouldGroupCode(code: string, count: number): boolean {
  if (ALWAYS_GROUP_PREFIXES.some((prefix) => code.startsWith(prefix))) return true;
  if (code.startsWith('PRH-') && count > PRH_GROUP_COUNT_THRESHOLD) return true;
  return false;
}

function pickGroupSeverity(issues: GroupableIssue[]): GroupableIssue['severity'] {
  // If every issue shares a severity, use it; otherwise use the most severe
  // so the group header can't accidentally under-state risk.
  const first = issues[0]?.severity ?? 'minor';
  const allSame = issues.every((i) => i.severity === first);
  if (allSame) return first;
  return issues.reduce<GroupableIssue['severity']>(
    (worst, i) => (SEVERITY_RANK[i.severity] > SEVERITY_RANK[worst] ? i.severity : worst),
    'minor',
  );
}

/**
 * Transform a flat issue list into a mix of flat and grouped entries.
 *
 * Order is preserved by first appearance: an entry's position in the output
 * is determined by where its first matching issue appeared in the input.
 * This keeps the UI stable as new issues stream in.
 */
export function groupIssues<T extends GroupableIssue>(issues: T[]): IssueEntry<T>[] {
  // First pass: bucket every issue by code so we can decide grouping per-code
  // off the full count, not the position-by-position view.
  const byCode = new Map<string, T[]>();
  const codeOrder: string[] = [];
  for (const issue of issues) {
    const list = byCode.get(issue.code);
    if (list) {
      list.push(issue);
    } else {
      byCode.set(issue.code, [issue]);
      codeOrder.push(issue.code);
    }
  }

  // Second pass: emit entries in first-seen code order, choosing group vs
  // flat based on the per-code count.
  const entries: IssueEntry<T>[] = [];
  for (const code of codeOrder) {
    const codeIssues = byCode.get(code)!;
    if (shouldGroupCode(code, codeIssues.length)) {
      entries.push({
        kind: 'group',
        code,
        count: codeIssues.length,
        files: bucketByFile(codeIssues),
        severity: pickGroupSeverity(codeIssues),
        issues: codeIssues,
      });
    } else {
      for (const issue of codeIssues) {
        entries.push({ kind: 'flat', issue });
      }
    }
  }
  return entries;
}

function bucketByFile<T extends GroupableIssue>(issues: T[]): FileBucket<T>[] {
  const byFile = new Map<string, T[]>();
  const order: string[] = [];
  for (const issue of issues) {
    const filePath = filePathFromLocation(issue.location);
    const list = byFile.get(filePath);
    if (list) {
      list.push(issue);
    } else {
      byFile.set(filePath, [issue]);
      order.push(filePath);
    }
  }
  return order.map((filePath) => ({ filePath, issues: byFile.get(filePath)! }));
}

/**
 * Locations look like `OEBPS/Text/chapter-05.xhtml#L42` or
 * `EPUB/xhtml/cover.xhtml`. Strip any anchor / line-number suffix so all
 * instances within a single file roll up under one bucket. Empty / missing
 * locations bucket together under `(no location)`.
 */
function filePathFromLocation(location: string | undefined): string {
  if (!location || location.trim() === '') return '(no location)';
  const hashIdx = location.indexOf('#');
  if (hashIdx >= 0) return location.slice(0, hashIdx);
  return location;
}
