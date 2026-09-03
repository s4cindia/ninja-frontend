import { describe, it, expect } from 'vitest';
import { isMatterhornIssue, getMatterhornCheckpoint } from './matterhorn';
import type { PdfAuditIssue } from '@/types/pdf.types';

function issue(overrides: Partial<PdfAuditIssue> & Record<string, unknown> = {}): PdfAuditIssue {
  return {
    id: 'issue-1',
    ruleId: 'PDF-GENERIC-001',
    severity: 'moderate',
    message: 'Generic issue',
    description: 'Generic issue description',
    ...overrides,
  } as PdfAuditIssue;
}

describe('isMatterhornIssue', () => {
  it('matches when matterhornCheckpoint is set directly', () => {
    expect(isMatterhornIssue(issue({ matterhornCheckpoint: '01' }))).toBe(true);
  });

  it('matches on category alone, even when the code matches nothing else — the exact case PdfAuditResultsPage used to miss', () => {
    expect(isMatterhornIssue(issue({ category: 'headings', ruleId: 'HEADING-SKIP-001' }))).toBe(true);
    expect(isMatterhornIssue(issue({ category: 'table-summary', ruleId: 'RULE-X' }))).toBe(true);
    expect(isMatterhornIssue(issue({ category: 'layout-table', ruleId: 'RULE-X' }))).toBe(true);
    expect(isMatterhornIssue(issue({ category: 'alt-text', ruleId: 'RULE-X' }))).toBe(true);
  });

  it('matches on a MATTERHORN-NN- code', () => {
    expect(isMatterhornIssue(issue({ code: 'MATTERHORN-11-003' }))).toBe(true);
  });

  it('matches any MATTERHORN- code, not just the numeric MATTERHORN-NN- form (e.g. the MATTERHORN-ALT- family PdfPreviewPanel already recognizes)', () => {
    expect(isMatterhornIssue(issue({ code: 'MATTERHORN-ALT-MISSING' }))).toBe(true);
  });

  it('matches on each known related code prefix', () => {
    for (const code of ['TABLE-MISSING-HEADER', 'ALT-TEXT-MISSING', 'LIST-STRUCTURE', 'PDF-LOW-CONTRAST-TEXT', 'PDF-UNTAGGED-CONTENT', 'PDF-NO-LANGUAGE-SET']) {
      expect(isMatterhornIssue(issue({ code }))).toBe(true);
    }
  });

  it('falls back to ruleId when code is absent', () => {
    expect(isMatterhornIssue(issue({ ruleId: 'table-broken-header' }))).toBe(true);
  });

  it('does not match an unrelated category and code', () => {
    expect(isMatterhornIssue(issue({ category: 'contrast', ruleId: 'PDF-GENERIC-001' }))).toBe(false);
  });

  it('does not match with no matterhornCheckpoint, category, or matching code at all', () => {
    expect(isMatterhornIssue(issue())).toBe(false);
  });
});

describe('getMatterhornCheckpoint', () => {
  it('prefers an explicit matterhornCheckpoint over any derived value', () => {
    expect(getMatterhornCheckpoint(issue({ matterhornCheckpoint: '99', category: 'headings' }))).toBe('99');
  });

  it('derives the checkpoint from category when matterhornCheckpoint is absent', () => {
    expect(getMatterhornCheckpoint(issue({ category: 'tables' }))).toBe('11');
    expect(getMatterhornCheckpoint(issue({ category: 'table-summary' }))).toBe('11');
    expect(getMatterhornCheckpoint(issue({ category: 'alt-text' }))).toBe('13');
  });

  it('derives the checkpoint from a MATTERHORN-NN- code as a last resort', () => {
    expect(getMatterhornCheckpoint(issue({ code: 'MATTERHORN-06-002' }))).toBe('06');
  });

  it('matches a lowercase MATTERHORN-NN- code — case must not disagree with isMatterhornIssue, which already normalizes to uppercase', () => {
    expect(getMatterhornCheckpoint(issue({ code: 'matterhorn-06-002' }))).toBe('06');
  });

  it('returns undefined when nothing identifies a checkpoint', () => {
    expect(getMatterhornCheckpoint(issue({ category: 'contrast', ruleId: 'RULE-X' }))).toBeUndefined();
  });
});
