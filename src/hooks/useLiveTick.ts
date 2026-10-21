import { useEffect, useState } from 'react';

/**
 * Returns Date.now(), re-rendering every second while `active` is true.
 * Extracted from PdfPhaseStepper's own inline ticking logic so
 * AutoModeStatusCard can share the same live-timer mechanism instead of
 * duplicating it.
 */
export function useLiveTick(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return undefined;
    const intervalId = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(intervalId);
  }, [active]);

  return now;
}
