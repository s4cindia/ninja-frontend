/**
 * Compress a list of page numbers into a comma-separated string with
 * consecutive runs collapsed into ranges.
 *
 *   formatPageRanges([1, 2, 3, 7, 10, 11, 12])  // "1–3, 7, 10–12"
 *
 * Input is normalized first — duplicates removed, non-positive-integers
 * dropped, then sorted ascending — so the output is stable regardless of
 * payload order.
 */
export function formatPageRanges(pages: number[]): string {
  const normalized = Array.from(new Set(pages))
    .filter((p) => Number.isInteger(p) && p > 0)
    .sort((a, b) => a - b);
  if (normalized.length === 0) return '';
  const ranges: string[] = [];
  let start = normalized[0];
  let prev = normalized[0];
  for (let i = 1; i <= normalized.length; i++) {
    const curr = normalized[i];
    if (curr !== prev + 1) {
      ranges.push(start === prev ? `${start}` : `${start}–${prev}`);
      start = curr;
    }
    prev = curr;
  }
  return ranges.join(', ');
}
