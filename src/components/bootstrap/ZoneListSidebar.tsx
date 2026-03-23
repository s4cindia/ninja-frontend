import { useMemo } from 'react';
import type { CalibrationZone } from '@/services/zone-correction.service';

interface ZoneListSidebarProps {
  zones: CalibrationZone[];
  currentPage: number;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
}

const BUCKET_COLOR = {
  GREEN: 'bg-green-100 text-green-800 border-green-300',
  AMBER: 'bg-amber-100 text-amber-800 border-amber-300',
  RED: 'bg-red-100 text-red-800 border-red-300',
};

export default function ZoneListSidebar({
  zones,
  currentPage,
  selectedZoneId,
  onZoneClick,
}: ZoneListSidebarProps) {
  const pageZones = useMemo(
    () => zones.filter((z) => z.pageNumber === currentPage),
    [zones, currentPage],
  );

  if (pageZones.length === 0) {
    return (
      <div className="w-56 border-l border-gray-200 bg-white flex items-center justify-center text-xs text-gray-400">
        No zones on this page
      </div>
    );
  }

  return (
    <div className="w-56 border-l border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-600 uppercase tracking-wide">
        Zones ({pageZones.length})
      </div>
      <div className="flex-1 overflow-auto">
        {pageZones.map((zone, i) => {
          const isSelected = zone.id === selectedZoneId;
          const bucketClass =
            BUCKET_COLOR[zone.reconciliationBucket as keyof typeof BUCKET_COLOR] ??
            'bg-gray-100 text-gray-600';

          return (
            <button
              key={zone.id}
              onClick={() => onZoneClick(zone.id)}
              className={`w-full text-left px-3 py-2 border-b border-gray-100 text-xs hover:bg-blue-50 transition-colors ${
                isSelected ? 'bg-blue-50 ring-1 ring-blue-400' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-500 w-5">{i + 1}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${bucketClass}`}
                >
                  {zone.reconciliationBucket}
                </span>
              </div>
              <div className="ml-7 mt-0.5 flex gap-2">
                {zone.doclingLabel && (
                  <span className="text-gray-500">D: {zone.doclingLabel}</span>
                )}
                {zone.pdfxtLabel && (
                  <span className="text-gray-500">P: {zone.pdfxtLabel}</span>
                )}
              </div>
              {zone.operatorVerified && (
                <div className="ml-7 mt-0.5 text-teal-600 font-medium">
                  {zone.operatorLabel ?? 'Verified'}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
