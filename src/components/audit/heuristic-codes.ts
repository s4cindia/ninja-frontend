/**
 * Identifies PRH issue codes that are pattern-detection heuristics — they fire
 * on text patterns where the validator can't be certain the finding is a real
 * issue. Operators need a visual cue that these are heuristics rather than
 * definitive findings, otherwise they treat them as bugs and waste cycles.
 *
 * Known heuristics (P3 backend):
 *   - PRH-LANG-INLINE-NOT-MARKED   non-Latin runs not wrapped in <span lang=…>
 *   - PRH-HASHTAG-NOT-CAMEL-CASE   hashtag tokens not in PascalCase
 *   - PRH-ACRONYM-INSERTED-SEPARATORS   ALL-CAPS sequences with separators
 *
 * Recognised by code-prefix rather than a backend tag so adding a new
 * heuristic in the same family (e.g. PRH-LANG-RTL-NOT-DETECTED) automatically
 * picks up the marker without an FE change. Add a new prefix here only when
 * an entirely new heuristic family appears.
 */

const HEURISTIC_PREFIXES = ['PRH-LANG-', 'PRH-HASHTAG-', 'PRH-ACRONYM-'] as const;

export function isHeuristicCode(code: string): boolean {
  return HEURISTIC_PREFIXES.some((prefix) => code.startsWith(prefix));
}
