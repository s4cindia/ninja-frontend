/**
 * SVG donut chart showing the auto / quick-fix / manual distribution.
 * Pure SVG — no chart library dependency.
 */

interface FixTypeDonutChartProps {
  autoFixed: number;
  quickFix: number;
  manual: number;
}

const RADIUS = 40;
const CX = 56;
const CY = 56;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS; // ≈ 251.3

const SEGMENTS = [
  { key: 'auto', label: 'Auto-Fixed', color: '#3b82f6' },    // blue-500
  { key: 'quickfix', label: 'Quick-Fix', color: '#f59e0b' },  // amber-500
  { key: 'manual', label: 'Manual', color: '#f97316' },       // orange-500
] as const;

function buildArcs(values: Record<string, number>) {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  if (total === 0) return [];

  let accumulated = 0;
  return SEGMENTS.map(seg => {
    const val = values[seg.key] ?? 0;
    const fraction = val / total;
    const dash = fraction * CIRCUMFERENCE;
    const gap = CIRCUMFERENCE - dash;
    // SVG strokes start at 3 o'clock; rotate -90° to start at top
    const offset = CIRCUMFERENCE - accumulated * CIRCUMFERENCE;
    accumulated += fraction;
    return { ...seg, val, fraction, dash, gap, offset };
  });
}

export function FixTypeDonutChart({ autoFixed, quickFix, manual }: FixTypeDonutChartProps) {
  const values = { auto: autoFixed, quickfix: quickFix, manual };
  const total = autoFixed + quickFix + manual;
  const arcs = buildArcs(values);

  return (
    <div className="flex items-center gap-6">
      <svg
        viewBox="0 0 112 112"
        className="w-28 h-28 flex-shrink-0"
        aria-label="Fix type distribution donut chart"
      >
        {/* Track */}
        <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#e5e7eb" strokeWidth={14} />

        {total === 0 ? (
          <circle cx={CX} cy={CY} r={RADIUS} fill="none" stroke="#d1d5db" strokeWidth={14} />
        ) : (
          arcs.map(arc => (
            arc.val > 0 && (
              <circle
                key={arc.key}
                cx={CX}
                cy={CY}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={14}
                strokeDasharray={`${arc.dash} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${CX} ${CY})`}
              />
            )
          ))
        )}

        {/* Centre label */}
        <text x={CX} y={CY - 4} textAnchor="middle" className="text-lg font-bold" fontSize="18" fill="#111827" fontWeight="700">
          {total}
        </text>
        <text x={CX} y={CY + 12} textAnchor="middle" fontSize="9" fill="#6b7280">
          issues
        </text>
      </svg>

      {/* Legend */}
      <ul className="space-y-1.5 text-sm">
        {SEGMENTS.map(seg => (
          <li key={seg.key} className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-gray-600">{seg.label}</span>
            <span className="ml-auto font-semibold text-gray-800 tabular-nums">
              {values[seg.key] ?? 0}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
