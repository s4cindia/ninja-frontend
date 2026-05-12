/**
 * Identifies PRH issue codes whose `suggestion` field carries verbatim legal
 * or brand text the operator must paste into the EPUB EXACTLY. Those rows get
 * a monospace, copy-to-clipboard block instead of the default one-line
 * "Suggestion: ..." rendering. Kept in a non-component file so importing
 * the helper doesn't blow react-refresh's only-export-components rule.
 *
 * Add new prefixes here only when the suggestion is truly verbatim text —
 * not just a long-ish hint. The default inline rendering still serves
 * every other code.
 */

const BOILERPLATE_PREFIXES = ['PRH-COPY-'] as const;
const BOILERPLATE_EXACT_CODES = new Set<string>(['PRH-SOCIALS-STRAPLINE-MISSING']);

export function isBoilerplateCode(code: string): boolean {
  if (BOILERPLATE_EXACT_CODES.has(code)) return true;
  return BOILERPLATE_PREFIXES.some((prefix) => code.startsWith(prefix));
}
