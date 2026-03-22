import type { CalibrationZone } from '../../services/zone-correction.service';

interface ZoneOverlayProps {
  zones: CalibrationZone[];
  pageNumber: number;
  scaleX: number;
  scaleY: number;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  source?: 'docling' | 'pdfxt';
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
        .filter((z) => z.pageNumber === pageNumber)
        .map((zone) => {
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

          const displayLabel = source === 'pdfxt'
            ? zone.pdfxtLabel ?? zone.type
            : zone.doclingLabel ?? zone.type;
          const displayConfidence = source === 'docling' && zone.doclingConfidence
            ? ` ${Math.round(zone.doclingConfidence * 100)}%`
            : '';

          return (
            <g
              key={zone.id}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              role="button"
              aria-label={`Zone: ${displayLabel}, ${zone.reconciliationBucket}`}
              tabIndex={0}
              onClick={() => onZoneClick(zone.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onZoneClick(zone.id);
                }
              }}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                stroke={strokeColor}
                fill={fillColor}
                strokeWidth={strokeWidth}
                rx={2}
              />
              {/* Label */}
              <text
                x={x + 3}
                y={y + 12}
                fontSize={10}
                fill={strokeColor}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {displayLabel}{displayConfidence}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
