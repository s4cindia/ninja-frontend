/**
 * Small "this is a heuristic" indicator rendered next to the severity badge
 * on PRH issue rows whose code is pattern-derived (PRH-LANG-*, PRH-HASHTAG-*,
 * PRH-ACRONYM-*). Hover/focus reveals a short explanation so operators don't
 * mistake the finding for a definitive bug.
 *
 * Neutral gray styling — not red or yellow — so it reads as informational.
 * The actual severity badge still carries the urgency cue.
 */

import { Info } from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

const TOOLTIP_TEXT =
  'Pattern detector — this finding may be a false positive. Review the highlighted text manually before fixing.';

export function HeuristicMarker() {
  return (
    <InfoTooltip
      content={<span className="block">{TOOLTIP_TEXT}</span>}
      maxWidth="260px"
    >
      <span
        role="img"
        aria-label="Heuristic finding"
        className="inline-flex items-center text-gray-500 hover:text-gray-700 cursor-help"
      >
        <Info className="h-3.5 w-3.5" />
      </span>
    </InfoTooltip>
  );
}
