import { describe, it, expect } from 'vitest';
import { isHeuristicCode } from '../heuristic-codes';

describe('isHeuristicCode', () => {
  it.each([
    'PRH-LANG-INLINE-NOT-MARKED',
    'PRH-HASHTAG-NOT-CAMEL-CASE',
    'PRH-ACRONYM-INSERTED-SEPARATORS',
    // New family members inherit the marker via the prefix match — no FE
    // change required when the backend adds another heuristic in the same
    // family.
    'PRH-LANG-RTL-NOT-DETECTED',
    'PRH-HASHTAG-DUPLICATE-CASING',
    'PRH-ACRONYM-LOWERCASE-CHUNK',
  ])('returns true for known-heuristic code %s', (code) => {
    expect(isHeuristicCode(code)).toBe(true);
  });

  it.each([
    'PRH-MARKUP-DEPRECATED-TAG',
    'PRH-MARKUP-INLINE-STYLE',
    'PRH-PAGEBREAK-MALFORMED',
    'PRH-FOOTNOTE-ID-MISMATCH',
    'PRH-COPY-TDM-PARAGRAPH-MISSING',
    'PRH-SOCIALS-STRAPLINE-MISSING',
    'PRH-NAV-MISSING-PAGELIST',
    'PRH-COVER-ALT-EMPTY',
    'EPUB-IMG-001',
    'EPUB-CHK-001',
    'something-totally-different',
  ])('returns false for non-heuristic code %s', (code) => {
    expect(isHeuristicCode(code)).toBe(false);
  });
});
