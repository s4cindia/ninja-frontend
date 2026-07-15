import { memo, useCallback, useEffect, useRef, useState } from 'react';
import type { CalibrationZone } from '../../services/zone-correction.service';
import { friendlyLabel } from './zone-label-utils';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ZoneOverlayProps {
  zones: CalibrationZone[];
  pageNumber: number;
  scaleX: number;
  scaleY: number;
  selectedZoneId: string | null;
  onZoneClick: (zoneId: string) => void;
  source?: 'docling' | 'pdfxt';
  zoneNumberMap?: Map<string, number>;
  /** Ids currently held in the multi-select set (Shift/Ctrl-click or rubber-band). */
  selectedIds?: Set<string>;
  /** Shift/Ctrl-click on a zone toggles it in/out of `selectedIds`. */
  onZoneToggle?: (zoneId: string) => void;
  /** When true, zone rects stop intercepting pointer events so a drag anywhere
   * on the page draws a new box instead of interacting with existing zones. */
  drawMode?: boolean;
  /** Fired on mouseup in draw mode with the dragged rectangle already converted
   * to PDF points (using this overlay's own scaleX/scaleY). Tiny drags (<4px in
   * either dimension) are ignored and never fire this callback. */
  onDrawComplete?: (boundsPdf: Rect) => void;
  /** Fired on mouseup after a non-draw-mode drag over empty space, with the ids
   * of every zone whose bounds intersect the dragged rectangle. */
  onRubberBandSelect?: (zoneIds: string[]) => void;
  /** When true, rejected zones render muted instead of being hidden. Default off. */
  showRejected?: boolean;
}

const BUCKET_STYLE = {
  GREEN: { stroke: '#16a34a', fill: 'rgba(22,163,74,0.08)' },
  AMBER: { stroke: '#d97706', fill: 'rgba(217,119,6,0.08)' },
  RED: { stroke: '#dc2626', fill: 'rgba(220,38,38,0.08)' },
};

const MULTI_SELECT_STROKE = '#2563eb';
const MIN_DRAG_PX = 4;

function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function ZoneOverlayInner({
  zones,
  pageNumber,
  scaleX,
  scaleY,
  selectedZoneId,
  onZoneClick,
  source,
  zoneNumberMap,
  selectedIds,
  onZoneToggle,
  drawMode,
  onDrawComplete,
  onRubberBandSelect,
  showRejected,
}: ZoneOverlayProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragLatestRef = useRef<Rect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [liveRect, setLiveRect] = useState<Rect | null>(null);

  const pageZones = zones.filter(
    (z) =>
      z.pageNumber === pageNumber &&
      z.bounds != null &&
      (showRejected || z.decision !== 'REJECTED'),
  ) as Array<CalibrationZone & { bounds: NonNullable<CalibrationZone['bounds']> }>;

  const handleBackgroundMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    dragStartRef.current = start;
    dragLatestRef.current = { ...start, w: 0, h: 0 };
    setLiveRect(dragLatestRef.current);
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent) => {
      const svg = svgRef.current;
      const start = dragStartRef.current;
      if (!svg || !start) return;
      const rect = svg.getBoundingClientRect();
      const curX = e.clientX - rect.left;
      const curY = e.clientY - rect.top;
      const next: Rect = {
        x: Math.min(start.x, curX),
        y: Math.min(start.y, curY),
        w: Math.abs(curX - start.x),
        h: Math.abs(curY - start.y),
      };
      dragLatestRef.current = next;
      setLiveRect(next);
    };

    const handleUp = () => {
      const finalRect = dragLatestRef.current;
      setIsDragging(false);
      setLiveRect(null);
      dragStartRef.current = null;
      dragLatestRef.current = null;

      if (!finalRect || finalRect.w < MIN_DRAG_PX || finalRect.h < MIN_DRAG_PX) return;

      if (drawMode) {
        onDrawComplete?.({
          x: finalRect.x / scaleX,
          y: finalRect.y / scaleY,
          w: finalRect.w / scaleX,
          h: finalRect.h / scaleY,
        });
      } else if (onRubberBandSelect) {
        const ids = pageZones
          .filter((z) => z.decision !== 'REJECTED')
          .filter((z) => {
            const zw = Math.abs(z.bounds.w) * scaleX;
            const zh = Math.abs(z.bounds.h) * scaleY;
            const zx = (z.bounds.w < 0 ? z.bounds.x + z.bounds.w : z.bounds.x) * scaleX;
            const zy = (z.bounds.h < 0 ? z.bounds.y + z.bounds.h : z.bounds.y) * scaleY;
            return rectsIntersect(finalRect, { x: zx, y: zy, w: zw, h: zh });
          })
          .map((z) => z.id);
        if (ids.length > 0) onRubberBandSelect(ids);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
    // pageZones is derived fresh each render from `zones`/`pageNumber`/`showRejected`;
    // including the array itself would re-subscribe every render, so its inputs stand in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, drawMode, onDrawComplete, onRubberBandSelect, zones, pageNumber, scaleX, scaleY, showRejected]);

  if (scaleX <= 0 || scaleY <= 0) {
    return null;
  }

  // Filter zones by source if specified
  const displayZones = source
    ? pageZones.filter((z) =>
        source === 'docling' ? z.doclingLabel != null : z.pdfxtLabel != null,
      )
    : pageZones;

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      aria-label="Zone detection overlay"
    >
      <rect
        x={0}
        y={0}
        width="100%"
        height="100%"
        fill="transparent"
        style={{ pointerEvents: 'all', cursor: drawMode ? 'crosshair' : 'default' }}
        onMouseDown={handleBackgroundMouseDown}
      />
      {displayZones.map((zone, index) => {
          const zoneNumber = zoneNumberMap?.get(zone.id) ?? index + 1;
          const rawW = Math.abs(zone.bounds.w) * scaleX;
          const rawH = Math.abs(zone.bounds.h) * scaleY;
          const x = (zone.bounds.w < 0 ? zone.bounds.x + zone.bounds.w : zone.bounds.x) * scaleX;
          const y = (zone.bounds.h < 0 ? zone.bounds.y + zone.bounds.h : zone.bounds.y) * scaleY;
          const w = rawW;
          const h = rawH;

          const isSelected = zone.id === selectedZoneId;
          const isMultiSelected = selectedIds?.has(zone.id) ?? false;
          const isVerified = zone.operatorVerified;
          const isRejected = zone.decision === 'REJECTED';
          const bucketStyle =
            BUCKET_STYLE[zone.reconciliationBucket as keyof typeof BUCKET_STYLE];
          const strokeColor = isRejected
            ? '#9ca3af'
            : isMultiSelected
              ? MULTI_SELECT_STROKE
              : isVerified
                ? '#0f766e'
                : bucketStyle?.stroke ?? '#6b7280';
          const fillColor = isRejected
            ? 'rgba(156,163,175,0.08)'
            : isMultiSelected
              ? 'rgba(37,99,235,0.15)'
              : isVerified
                ? 'rgba(15,118,110,0.12)'
                : bucketStyle?.fill ?? 'rgba(0,0,0,0.05)';
          const strokeWidth = isSelected || isMultiSelected ? 3 : 1.5;

          const abbrev = source ? friendlyLabel(zone, source) : '?';
          const badgeText = `#${zoneNumber} ${abbrev}`;
          const badgeWidth = badgeText.length * 7 + 10;

          return (
            <g
              key={zone.id}
              style={{
                pointerEvents: drawMode ? 'none' : 'all',
                cursor: 'pointer',
                opacity: isRejected ? 0.4 : 1,
              }}
              role="button"
              aria-label={`Zone ${zoneNumber}: ${abbrev}, ${zone.reconciliationBucket}${isRejected ? ', rejected' : ''}`}
              aria-pressed={isMultiSelected}
              tabIndex={0}
              onClick={(e) => {
                if ((e.shiftKey || e.ctrlKey || e.metaKey) && onZoneToggle) {
                  e.stopPropagation();
                  onZoneToggle(zone.id);
                } else {
                  onZoneClick(zone.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  if ((e.shiftKey || e.ctrlKey) && onZoneToggle) {
                    onZoneToggle(zone.id);
                  } else {
                    onZoneClick(zone.id);
                  }
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
                strokeDasharray={isRejected ? '4 3' : undefined}
                rx={2}
              >
                <title>{`#${zoneNumber} ${abbrev} · ${isRejected ? 'REJECTED' : zone.reconciliationBucket}`}</title>
              </rect>
              {/* Number circle at top-left corner — omitted for rejected zones */}
              {!isRejected && (
                <>
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
                </>
              )}
              {/* AI confidence dot */}
              {!isRejected && zone.aiConfidence != null && (
                <circle
                  cx={x + 22}
                  cy={y + 6}
                  r={4}
                  fill={
                    zone.aiConfidence >= 0.95
                      ? '#22c55e'
                      : zone.aiConfidence >= 0.80
                        ? '#eab308'
                        : '#ef4444'
                  }
                  stroke="white"
                  strokeWidth={1}
                  style={{ pointerEvents: 'none' }}
                >
                  <title>{zone.aiReason ?? `AI confidence: ${Math.round(zone.aiConfidence * 100)}%`}</title>
                </circle>
              )}
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
      {liveRect && (
        <rect
          x={liveRect.x}
          y={liveRect.y}
          width={liveRect.w}
          height={liveRect.h}
          fill={drawMode ? 'rgba(37,99,235,0.1)' : 'rgba(107,114,128,0.1)'}
          stroke={drawMode ? MULTI_SELECT_STROKE : '#6b7280'}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          style={{ pointerEvents: 'none' }}
        />
      )}
    </svg>
  );
}

export default memo(ZoneOverlayInner);
