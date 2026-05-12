import { describe, it, expect } from 'vitest';
import { groupIssues, type GroupableIssue } from '../group-issues';

function issue(over: Partial<GroupableIssue>): GroupableIssue {
  return {
    id: Math.random().toString(36).slice(2),
    code: 'EPUB-IMG-001',
    severity: 'minor',
    message: 'Image missing alt text',
    location: 'EPUB/xhtml/chapter-01.xhtml',
    source: 'ace',
    ...over,
  };
}

describe('groupIssues — flat vs grouped routing', () => {
  it('returns each non-PRH issue as a flat entry, regardless of count', () => {
    const issues = [
      issue({ code: 'EPUB-IMG-001', location: 'EPUB/xhtml/c1.xhtml' }),
      issue({ code: 'EPUB-IMG-001', location: 'EPUB/xhtml/c2.xhtml' }),
      issue({ code: 'EPUB-IMG-001', location: 'EPUB/xhtml/c3.xhtml' }),
    ];
    const result = groupIssues(issues);
    expect(result).toHaveLength(3);
    expect(result.every((e) => e.kind === 'flat')).toBe(true);
  });

  it('groups PRH-MARKUP-* even at low instance counts', () => {
    const issues = [
      issue({ code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk' }),
      issue({ code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk' }),
    ];
    const result = groupIssues(issues);
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe('group');
    if (result[0].kind === 'group') {
      expect(result[0].code).toBe('PRH-MARKUP-DEPRECATED-TAG');
      expect(result[0].count).toBe(2);
    }
  });

  it.each([
    ['PRH-PAGEBREAK-MALFORMED'],
    ['PRH-FOOTNOTE-ID-MISMATCH'],
  ])('also groups %s by default', (code) => {
    const issues = [issue({ code, source: 'prh-uk' })];
    const result = groupIssues(issues);
    expect(result[0].kind).toBe('group');
  });

  it('keeps a low-count generic PRH code flat (≤ 10 instances)', () => {
    const issues = Array.from({ length: 5 }, () =>
      issue({ code: 'PRH-NAV-MISSING-PAGELIST', source: 'prh-uk' }),
    );
    const result = groupIssues(issues);
    expect(result).toHaveLength(5);
    expect(result.every((e) => e.kind === 'flat')).toBe(true);
  });

  it('groups a high-volume generic PRH code (> 10 instances)', () => {
    const issues = Array.from({ length: 12 }, () =>
      issue({ code: 'PRH-LANG-INLINE-NOT-MARKED', source: 'prh-uk' }),
    );
    const result = groupIssues(issues);
    expect(result).toHaveLength(1);
    if (result[0].kind === 'group') {
      expect(result[0].count).toBe(12);
    }
  });
});

describe('groupIssues — file bucketing', () => {
  it('buckets per-file in first-seen order, preserving instance order within a file', () => {
    const issues = [
      issue({ id: 'a', code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk', location: 'OEBPS/Text/c1.xhtml#L10' }),
      issue({ id: 'b', code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk', location: 'OEBPS/Text/c2.xhtml#L5' }),
      issue({ id: 'c', code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk', location: 'OEBPS/Text/c1.xhtml#L42' }),
    ];
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');

    expect(entry.files).toHaveLength(2);
    expect(entry.files[0].filePath).toBe('OEBPS/Text/c1.xhtml');
    expect(entry.files[0].issues.map((i) => i.id)).toEqual(['a', 'c']);
    expect(entry.files[1].filePath).toBe('OEBPS/Text/c2.xhtml');
    expect(entry.files[1].issues.map((i) => i.id)).toEqual(['b']);
  });

  it('buckets missing/empty locations under "(no location)"', () => {
    const issues = [
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', location: undefined }),
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', location: '' }),
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', location: 'OEBPS/Text/c1.xhtml' }),
    ];
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');
    expect(entry.files.map((f) => f.filePath)).toEqual([
      '(no location)',
      'OEBPS/Text/c1.xhtml',
    ]);
    expect(entry.files[0].issues).toHaveLength(2);
  });
});

describe('groupIssues — severity & ordering', () => {
  it('uses the shared severity when all issues in a group match', () => {
    const issues = Array.from({ length: 3 }, () =>
      issue({ code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk', severity: 'moderate' }),
    );
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');
    expect(entry.severity).toBe('moderate');
  });

  it('promotes to the most severe level when a group mixes severities', () => {
    const issues = [
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', severity: 'minor' }),
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', severity: 'serious' }),
      issue({ code: 'PRH-MARKUP-INLINE-STYLE', source: 'prh-uk', severity: 'moderate' }),
    ];
    const [entry] = groupIssues(issues);
    if (entry.kind !== 'group') throw new Error('expected group');
    expect(entry.severity).toBe('serious');
  });

  it('emits entries in first-seen code order, mixing flat and grouped codes', () => {
    const issues = [
      issue({ code: 'EPUB-CHK-001', source: 'epubcheck' }),
      issue({ code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk' }),
      issue({ code: 'EPUB-IMG-001', source: 'ace' }),
      issue({ code: 'PRH-MARKUP-DEPRECATED-TAG', source: 'prh-uk' }),
    ];
    const result = groupIssues(issues);
    expect(result.map((e) => (e.kind === 'group' ? `g:${e.code}` : `f:${e.issue.code}`))).toEqual([
      'f:EPUB-CHK-001',
      'g:PRH-MARKUP-DEPRECATED-TAG',
      'f:EPUB-IMG-001',
    ]);
  });

  it('returns an empty array for an empty input without throwing', () => {
    expect(groupIssues([])).toEqual([]);
  });
});
