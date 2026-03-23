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

const TAG_ABBREV: Record<string, string> = {
  paragraph: 'P',
  'section-header': 'H',
  table: 'TBL',
  figure: 'FIG',
  caption: 'CAP',
  footnote: 'FN',
  header: 'HDR',
  footer: 'FTR',
  // Raw Docling labels
  Text: 'P',
  'Section-Header': 'H',
  Table: 'TBL',
  Picture: 'FIG',
  Caption: 'CAP',
  Footnote: 'FN',
  'Page-Header': 'HDR',
  'Page-Footer': 'FTR',
  // pdfxt structure tags
  P: 'P',
  H1: 'H1',
  H2: 'H2',
  H3: 'H3',
  H4: 'H4',
  H5: 'H5',
  H6: 'H6',
  Span: 'SP',
  Figure: 'FIG',
  L: 'LIST',
  LI: 'LI',
  LBody: 'LB',
  Div: 'DIV',
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
        .map((zone, index) => {
          const zoneNumber = index + 1;
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
          const displayConfidence = source === 'docling' && zone.doclingConfidence != null
            ? ` ${Math.round(zone.doclingConfidence * 100)}%`
            : source === 'docling'
              ? ' N/A'
              : '';

          const abbrev = TAG_ABBREV[displayLabel] ?? displayLabel.slice(0, 4).toUpperCase();
          const badgeText = `${abbrev}${displayConfidence}`;
          const badgeWidth = badgeText.length * 7 + 10;

          return (
            <g
              key={zone.id}
              style={{ pointerEvents: 'all', cursor: 'pointer' }}
              role="button"
              aria-label={`Zone ${zoneNumber}: ${displayLabel}, ${zone.reconciliationBucket}`}
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
              {/* Label badge with solid background */}
              <rect
                x={x}
                y={y}
                width={Math.min(badgeWidth, w)}
                height={18}
                fill={strokeColor}
                rx={2}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={x + 5}
                y={y + 13}
                fontSize={11}
                fontWeight={700}
                fill="white"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {badgeText}
              </text>
              {/* Zone number badge */}
              <circle
                cx={x + 8}
                cy={y - 8}
                r={9}
                fill={strokeColor}
                style={{ pointerEvents: 'none' }}
              />
              <text
                x={x + 8}
                y={y - 4}
                fontSize={10}
                fontWeight={700}
                fill="white"
                textAnchor="middle"
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {zoneNumber}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
