import { useMemo, useRef } from 'react';
import type { CalibrationZone } from '@/services/zone-correction.service';

/**
 * Builds a stable zone-id → number map for all zones on a page.
 * Zones sorted by y-position (top-to-bottom), then x (left-to-right).
 * Returns Map<zoneId, number> where numbers start at 1.
 *
 * Reference-stable: only returns a new Map when the zone IDs or
 * their order actually change (prevents memo-breaking on consumers).
 */
export function useZoneNumberMap(
  zones: CalibrationZone[],
  page: number,
): Map<string, number> {
  const prevKeyRef = useRef('');
  const prevMapRef = useRef<Map<string, number>>(new Map());

  return useMemo(() => {
    const pageZones = zones
      .filter((z) => z.pageNumber === page)
      .sort((a, b) => {
        // Guard against ghost zones with null bounds
        if (!a.bounds && !b.bounds) return 0;
        if (!a.bounds) return 1;
        if (!b.bounds) return -1;
        const ay = a.bounds.y ?? 0;
        const by = b.bounds.y ?? 0;
        if (Math.abs(ay - by) > 5) return ay - by;
        return (a.bounds.x ?? 0) - (b.bounds.x ?? 0);
      });

    // Build a key from sorted zone IDs to detect actual changes
    const key = pageZones.map((z) => z.id).join(',');
    if (key === prevKeyRef.current) {
      return prevMapRef.current;
    }

    const map = new Map<string, number>();
    pageZones.forEach((z, i) => map.set(z.id, i + 1));
    prevKeyRef.current = key;
    prevMapRef.current = map;
    return map;
  }, [zones, page]);
}
