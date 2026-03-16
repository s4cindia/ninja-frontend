import type { CalibrationZone } from '../../services/zone-correction.service';

interface ZoneOverlayProps {
  zones: CalibrationZone[];
  selectedZoneId: string | null;
  pageNumber: number;
  pageWidth: number;
  pageHeight: number;
  pdfWidth: number;
  pdfHeight: number;
  onSelectZone: (zoneId: string) => void;
}

const BUCKET_STYLE = {
  GREEN: { stroke: '#16a34a', fill: 'rgba(22,163,74,0.08)' },
  AMBER: { stroke: '#d97706', fill: 'rgba(217,119,6,0.08)' },
  RED: { stroke: '#dc2626', fill: 'rgba(220,38,38,0.08)' },
};

export default function ZoneOverlay({
  zones,
  selectedZoneId,
  pageNumber,
  pageWidth,
  pageHeight,
  pdfWidth,
  pdfHeight,
  onSelectZone,
}: ZoneOverlayProps) {
  if (pdfWidth <= 0 || pdfHeight <= 0 || pageWidth <= 0 || pageHeight <= 0) {
    return null;
  }

  return (
    <svg
      width={pageWidth}
      height={pageHeight}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-label="Zone detection overlay"
    >
      {zones
        .filter((z) => z.pageNumber === pageNumber)
        .map((zone) => {
          const scaleX = pageWidth / pdfWidth;
          const scaleY = pageHeight / pdfHeight;
          const x = zone.bounds.x * scaleX;
          const y = zone.bounds.y * scaleY;
          const w = zone.bounds.w * scaleX;
          const h = zone.bounds.h * scaleY;

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
          const strokeDash = isVerified ? undefined : undefined;

          return (
            <g
              key={zone.id}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              role="button"
              aria-label={`Zone: ${zone.type}, ${zone.reconciliationBucket}`}
              tabIndex={0}
              onClick={() => onSelectZone(zone.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectZone(zone.id);
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
                strokeDasharray={strokeDash}
                rx={2}
              />
            </g>
          );
        })}
    </svg>
  );
}
