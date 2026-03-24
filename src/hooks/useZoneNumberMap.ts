import { useMemo } from 'react';
import type { CalibrationZone } from '@/services/zone-correction.service';

/**
 * Builds a stable zone-id → number map for all zones on a page.
 * Zones sorted by y-position (top-to-bottom), then x (left-to-right).
 * Returns Map<zoneId, number> where numbers start at 1.
 */
export function useZoneNumberMap(
  zones: CalibrationZone[],
  page: number,
): Map<string, number> {
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
        if (Math.abs(ay - by) > 5) return ay - by; // 5px threshold for "same row"
        return (a.bounds.x ?? 0) - (b.bounds.x ?? 0);
      });

    const map = new Map<string, number>();
    pageZones.forEach((z, i) => map.set(z.id, i + 1));
    return map;
  }, [zones, page]);
}
