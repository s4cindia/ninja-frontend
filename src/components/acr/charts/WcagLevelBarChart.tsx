/**
 * Horizontal stacked bar chart for WCAG level breakdown (A / AA / AAA).
 * Pure CSS/HTML — no chart library dependency.
 */

interface LevelData {
  total: number;
  passed: number;
  manual: number;
  na: number;
}

interface WcagLevelBarChartProps {
  byWcagLevel: {
    A: LevelData;
    AA: LevelData;
    AAA: LevelData;
  };
}

const LEVEL_COLORS = {
  passed: { bg: 'bg-green-500', label: 'Passed' },
  manual: { bg: 'bg-orange-400', label: 'Manual Required' },
  na:     { bg: 'bg-gray-300',  label: 'N/A' },
  failed: { bg: 'bg-red-400',   label: 'Failed' },
};

function Bar({ data, label }: { data: LevelData; label: string }) {
  const { total, passed, manual, na } = data;
  const failed = Math.max(0, total - passed - manual - na);

  const pct = (n: number) => total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%';

  const segments = [
    { key: 'passed', value: passed, ...LEVEL_COLORS.passed },
    { key: 'failed', value: failed, ...LEVEL_COLORS.failed },
    { key: 'manual', value: manual, ...LEVEL_COLORS.manual },
    { key: 'na',     value: na,     ...LEVEL_COLORS.na },
  ].filter(s => s.value > 0);

  return (
    <div className="flex items-center gap-3">
      <span className="w-10 text-xs font-semibold text-gray-600 text-right flex-shrink-0">
        {label}
      </span>

      <div className="flex-1 flex h-5 rounded overflow-hidden bg-gray-100" title={`Total: ${total}`}>
        {total === 0 ? (
          <div className="flex-1 bg-gray-200 flex items-center justify-center text-xs text-gray-400">—</div>
        ) : (
          segments.map(seg => (
            <div
              key={seg.key}
              className={seg.bg}
              style={{ width: pct(seg.value) }}
              title={`${seg.label}: ${seg.value}`}
            />
          ))
        )}
      </div>

      <span className="w-6 text-xs text-gray-500 flex-shrink-0">{total}</span>
    </div>
  );
}

export function WcagLevelBarChart({ byWcagLevel }: WcagLevelBarChartProps) {
  return (
    <div className="space-y-2">
      <Bar label="A" data={byWcagLevel.A} />
      <Bar label="AA" data={byWcagLevel.AA} />
      <Bar label="AAA" data={byWcagLevel.AAA} />

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
        {Object.entries(LEVEL_COLORS).map(([key, { bg, label }]) => (
          <span key={key} className="flex items-center gap-1">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm ${bg}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
