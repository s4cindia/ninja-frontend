/**
 * autoModeRoundSummary — per-round "what happened" explanation
 *
 * Auto Mode's round-by-round table shows Applied/Resolved/Remaining/
 * Regressions as bare numbers, which operators watching a live run
 * routinely need explained by hand (confirmed directly this session: the
 * same explanation was given manually, round after round, prompting this
 * feature). This turns those same numbers — already returned by
 * useAutoModeRoundHistory, no new data needed — into one plain-language
 * sentence per round.
 *
 * Deliberately uses the round's own OBSERVED `remaining` delta (this
 * round's `remaining` vs the previous round's `remaining`) for the "net
 * effect" framing, not a derived `resolved - regressions` computation —
 * those are NOT the same number. A round's own `regressions` are newly-
 * found issues that get folded into `remaining` starting at the START of
 * the NEXT round's comparison (they're the current round's reaudit output,
 * not its input), so `resolved - regressions` this round systematically
 * disagrees with the real `remaining` delta by one round's lag. The
 * already-correct delta (and its ↑/↓ direction) is exactly what
 * AutoModeRoundHistory's own TrendArrow already renders — this reuses that
 * same ground truth rather than re-deriving a subtly wrong one.
 */

import type { AutoModeRound } from '@/hooks/useAutoMode';

export function summarizeRound(round: AutoModeRound, previousRound: AutoModeRound | null): string {
  const applied = round.applied ?? 0;
  const resolved = round.resolved ?? 0;
  const regressions = round.regressions ?? 0;

  const appliedPart = applied > 0
    ? `${applied} fix${applied === 1 ? '' : 'es'} applied this round`
    : 'No fixes were applied this round';

  const resolvedPart = resolved > 0
    ? `the re-audit confirmed ${resolved} ${resolved === 1 ? 'is' : 'are'} now resolved`
    : 'the re-audit confirmed none are resolved yet';

  const regressionsPart = regressions > 0
    ? `${regressions} previously-fixed issue${regressions === 1 ? '' : 's'} reappeared`
    : 'no previously-fixed issues reappeared';

  const base = `${appliedPart}; ${resolvedPart}, and ${regressionsPart}.`;

  if (previousRound?.remaining == null || round.remaining == null) return base;

  const delta = round.remaining - previousRound.remaining;
  if (delta === 0) return `${base} Net effect: open issue count unchanged.`;
  if (delta < 0) return `${base} Net effect: ${Math.abs(delta)} fewer open issues than last round.`;
  return `${base} Net effect: ${delta} more open issues than last round, despite the fixes applied.`;
}
