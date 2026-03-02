/**
 * Horizontal bar chart showing high / medium / low confidence distribution.
 * Pure CSS/HTML — no chart library dependency.
 */

interface ConfidenceDistributionChartProps {
  high: number;
  medium: number;
  low: number;
}

export function ConfidenceDistributionChart({ high, medium, low }: ConfidenceDistributionChartProps) {
  const total = high + medium + low;

  const bars = [
    { label: 'High',   value: high,   bg: 'bg-green-500', text: 'text-green-700' },
    { label: 'Medium', value: medium, bg: 'bg-amber-400',  text: 'text-amber-700' },
    { label: 'Low',    value: low,    bg: 'bg-red-400',    text: 'text-red-700' },
  ];

  return (
    <div className="space-y-2">
      {bars.map(bar => {
        const pct = total > 0 ? (bar.value / total) * 100 : 0;
        return (
          <div key={bar.label} className="flex items-center gap-3">
            <span className="w-14 text-xs text-gray-500 text-right flex-shrink-0">{bar.label}</span>

            <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
              <div
                className={`h-full ${bar.bg} rounded transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>

            <span className={`w-12 text-xs font-semibold text-right flex-shrink-0 ${bar.text}`}>
              {bar.value} <span className="font-normal text-gray-400">({pct.toFixed(0)}%)</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
