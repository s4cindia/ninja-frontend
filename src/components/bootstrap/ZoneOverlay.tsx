import type { CalibrationZone } from '../../services/zone-correction.service';
import { friendlyLabel } from './zone-label-utils';

interface ZoneOverlayProps {
  zones: CalibrationZone[];
  pageNumber: number;
  scaleX: number;
  scaleY: number;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  source?: 'docling' | 'pdfxt';
  zoneNumberMap?: Map<string, number>;
}

const BUCKET_STYLE = {
  GREEN: { stroke: '#16a34a', fill: 'rgba(22,163,74,0.08)' },
  AMBER: { stroke: '#d97706', fill: 'rgba(217,119,6,0.08)' },
  RED: { stroke: '#dc2626', fill: 'rgba(220,38,38,0.08)' },
};


export default function ZoneOverlay({
  zones,
  pageNumber,
  scaleX,
  scaleY,
  selectedZoneId,
  onZoneClick,
  source,
  zoneNumberMap,
}: ZoneOverlayProps) {
  if (scaleX <= 0 || scaleY <= 0) {
    return null;
  }

  // Filter zones by source if specified
  const displayZones = source
    ? zones.filter((z) =>
        source === 'docling' ? z.doclingLabel != null : z.pdfxtLabel != null,
      )
    : zones;

  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-label="Zone detection overlay"
    >
      {displayZones
        .filter((z): z is CalibrationZone & { bounds: NonNullable<CalibrationZone['bounds']> } =>
          z.pageNumber === pageNumber && z.bounds != null,
        )
        .map((zone, index) => {
          const zoneNumber = zoneNumberMap?.get(zone.id) ?? index + 1;
          const rawW = Math.abs(zone.bounds.w) * scaleX;
          const rawH = Math.abs(zone.bounds.h) * scaleY;
          const x = (zone.bounds.w < 0 ? zone.bounds.x + zone.bounds.w : zone.bounds.x) * scaleX;
          const y = (zone.bounds.h < 0 ? zone.bounds.y + zone.bounds.h : zone.bounds.y) * scaleY;
          const w = rawW;
          const h = rawH;

          const isSelected = zone.id === selectedZoneId;
          const isVerified = zone.operatorVerified;
          const bucketStyle =
            BUCKET_STYLE[zone.reconciliationBucket as keyof typeof BUCKET_STYLE];
          const strokeColor = isVerified
            ? '#0f766e'
            : bucketStyle?.stroke ?? '#6b7280';
          const fillColor = isVerified
            ? 'rgba(15,118,110,0.12)'
            : bucketStyle?.fill ?? 'rgba(0,0,0,0.05)';
          const strokeWidth = isSelected ? 3 : 1.5;

          const abbrev = source ? friendlyLabel(zone, source) : '?';
          const badgeText = `#${zoneNumber} ${abbrev}`;
          const badgeWidth = badgeText.length * 7 + 10;

          return (
            <g
              key={zone.id}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              role="button"
              aria-label={`Zone ${zoneNumber}: ${abbrev}, ${zone.reconciliationBucket}`}
              tabIndex={0}
              onClick={() => onZoneClick(zone.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onZoneClick(zone.id);
                }
              }}
            >
              {/* Zone rect */}
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                stroke={strokeColor}
                fill={fillColor}
                strokeWidth={strokeWidth}
                rx={2}
              >
                <title>{`#${zoneNumber} ${abbrev} · ${zone.reconciliationBucket}`}</title>
              </rect>
              {/* Number circle at top-left corner */}
              <circle
                cx={x + 10}
                cy={y + 10}
                r={9}
                fill={strokeColor}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={x + 10}
                y={y + 14}
                fontSize={10}
                fontWeight={700}
                fill="white"
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {zoneNumber}
              </text>
              {/* Full label badge — only on selected zone */}
              {isSelected && (
                <>
                  <rect
                    x={x + 22}
                    y={y + 1}
                    width={Math.min(badgeWidth, w - 22)}
                    height={18}
                    fill={strokeColor}
                    rx={2}
                    style={{ pointerEvents: 'none' }}
                  />
                  <text
                    x={x + 27}
                    y={y + 14}
                    fontSize={11}
                    fontWeight={700}
                    fill="white"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                  >
                    {badgeText}
                  </text>
                </>
              )}
            </g>
          );
        })}
    </svg>
  );
}
