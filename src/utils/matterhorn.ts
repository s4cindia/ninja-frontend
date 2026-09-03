/**
 * Canonical Matterhorn Protocol classification for PDF audit issues.
 *
 * This codebase had drifted into THREE independent copies of "is this issue
 * Matterhorn-related / which checkpoint does it map to": PdfStatsCards.tsx's
 * isMatterhorn (category-aware), PdfAuditResultsPage.tsx's matterhornIssueCount
 * filter (code-prefix only, no category — the narrowest of the three) and its
 * showMatterhornOnly filter (an exact duplicate of that same narrow logic), and
 * PdfAuditResultsPage.tsx's getIssueCheckpoint/CATEGORY_TO_MATTERHORN (the most
 * complete category map of the three, but only used for checkpoint-number
 * lookup, never for the yes/no count). They disagreed with each other — e.g.
 * an issue with category: 'headings' but no matching code prefix was counted
 * as Matterhorn by the card but not by the page. This module is the single
 * source of truth all of them now consume, using the broadest/most complete
 * signal set found across the three.
 */

import type { PdfAuditIssue } from '@/types/pdf.types';

/**
 * `category` and `code` aren't part of the formal PdfAuditIssue type — the
 * backend sends them on some issues but the type was never widened to
 * declare them, so every consumer already cast to read them.
 */
export type ClassifiableIssue = PdfAuditIssue & { category?: string; code?: string };

// category -> Matterhorn checkpoint number. Category is a more direct signal
// than sniffing the rule code when the backend supplies it, and catches
// issues whose code doesn't happen to match any of the prefixes below.
export const MATTERHORN_CATEGORY_MAP: Record<string, string> = {
  structure: '01',
  metadata: '07',
  language: '16',
  headings: '06',
  'reading-order': '09',
  lists: '04',
  tables: '11',
  'table-structure': '11',
  'table-headers': '11',
  'table-summary': '11',
  'layout-table': '11',
  'alt-text': '13',
};

const MATTERHORN_CODE_PREFIXES = [
  'TABLE-', 'ALT-TEXT-', 'LIST-',
  'PDF-LOW-CONTRAST', 'PDF-UNTAGGED', 'PDF-NO-LANGUAGE',
];

export function isMatterhornIssue(issue: PdfAuditIssue): boolean {
  if (issue.matterhornCheckpoint) return true;
  const { category, code: rawCode } = issue as ClassifiableIssue;
  if (category && MATTERHORN_CATEGORY_MAP[category]) return true;
  const code = (rawCode || issue.ruleId || '').toUpperCase();
  if (/^MATTERHORN-\d{2}-/.test(code)) return true;
  return MATTERHORN_CODE_PREFIXES.some(p => code.startsWith(p));
}

/**
 * Which specific Matterhorn checkpoint number (e.g. "01") an issue maps to,
 * if any. Backend issues don't always populate matterhornCheckpoint
 * directly, so this derives it from category or code as a fallback.
 */
export function getMatterhornCheckpoint(issue: PdfAuditIssue): string | undefined {
  const { matterhornCheckpoint, category, code: rawCode } = issue as ClassifiableIssue;
  if (matterhornCheckpoint) return matterhornCheckpoint;
  if (category && MATTERHORN_CATEGORY_MAP[category]) return MATTERHORN_CATEGORY_MAP[category];
  const code = rawCode || issue.ruleId || '';
  const match = code.match(/^MATTERHORN-(\d{2})-/);
  return match ? match[1] : undefined;
}
