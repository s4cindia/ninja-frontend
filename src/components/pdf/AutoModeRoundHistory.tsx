/**
 * AutoModeRoundHistory
 *
 * Round-by-round trend for a Comparison Study Auto Mode run — a table or
 * sparkline-chart view of applied/resolved/remaining/regressions per round,
 * reading the same GET /pdf/:jobId/remediation/history data
 * RemediationHistoryCard shows generically (see useAutoModeRoundHistory for
 * the auto_loop filtering). Both views read the same `rounds` prop —
 * toggling never refetches.
 */

import { useId, useState } from 'react';
import { Table2, LineChart } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Badge } from '@/components/ui/Badge';
import { buildSparklinePath } from './autoModeSparkline';
import type { AutoModeRound } from '@/hooks/useAutoMode';

interface AutoModeRoundHistoryProps {
  rounds: AutoModeRound[];
}

type ViewMode = 'table' | 'chart';

const STORAGE_KEY = 'ninja:auto-mode-round-view';

function readStoredView(): ViewMode {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'chart' ? 'chart' : 'table';
  } catch {
    return 'table';
  }
}

function writeStoredView(view: ViewMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, view);
  } catch {
    /* quota */
  }
}

function TrendArrow({ current, previous }: { current: number | null; previous: number | null | undefined }) {
  if (current == null || previous == null) return null;
  if (current < previous) return <span className="text-green-600" aria-label="decreased from previous round">↓</span>;
  if (current > previous) return <span className="text-red-600" aria-label="increased from previous round">↑</span>;
  return <span className="text-gray-400" aria-label="unchanged from previous round">→</span>;
}

function RoundTable({ rounds }: { rounds: AutoModeRound[] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left text-gray-500">
          <th className="font-normal pb-1">Round</th>
          <th className="font-normal pb-1 text-right">Applied</th>
          <th className="font-normal pb-1 text-right">Resolved</th>
          <th className="font-normal pb-1 text-right">Remaining</th>
          <th className="font-normal pb-1 text-right">Regressions</th>
        </tr>
      </thead>
      <tbody className="font-mono text-gray-700">
        {rounds.map((r, idx) => (
          <tr key={r.round} className="border-t border-gray-100">
            <td className="py-1">{r.round}</td>
            <td className="py-1 text-right">{r.applied ?? '—'}</td>
            <td className="py-1 text-right">{r.resolved ?? '—'}</td>
            <td className="py-1 text-right">
              <span className="inline-flex items-center gap-1">
                {r.remaining ?? '—'}
                <TrendArrow current={r.remaining} previous={rounds[idx - 1]?.remaining} />
              </span>
            </td>
            <td className="py-1 text-right">
              {r.regressions ? (
                <Badge variant="warning" size="sm">{r.regressions}</Badge>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function chartSummary(rounds: AutoModeRound[]): string {
  return rounds
    .map(r => {
      const remaining = r.remaining == null ? 'remaining unavailable' : `${r.remaining} remaining`;
      const regressions = r.regressions ? `, ${r.regressions} regression${r.regressions === 1 ? '' : 's'}` : '';
      return `Round ${r.round}: ${remaining}${regressions}`;
    })
    .join('; ');
}

function RoundChart({ rounds }: { rounds: AutoModeRound[] }) {
  const width = 240;
  const height = 60;
  const { points, regressionDots, unavailableMarkers } = buildSparklinePath(rounds, width, height);
  const descId = useId();

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-16 text-primary-600"
        role="img"
        aria-label="Remaining issues per round"
        aria-describedby={descId}
      >
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth={1.5} />
        {regressionDots.map((dot, idx) => (
          <circle key={`regression-${idx}`} cx={dot.x} cy={dot.y} r={2.5} className="fill-amber-500" />
        ))}
        {unavailableMarkers.map((dot, idx) => (
          <circle key={`unavailable-${idx}`} cx={dot.x} cy={height / 2} r={2} className="fill-gray-300" />
        ))}
      </svg>
      {/* The SVG conveys the trend visually only — this exposes the same
          per-round data (RoundTable, unmounted in this view, already shows
          it visually) to assistive tech via the svg's aria-describedby. */}
      <p id={descId} className="sr-only">{chartSummary(rounds)}</p>
      <div className="flex justify-between text-[10px] text-gray-400 mt-0.5" aria-hidden="true">
        {rounds.map(r => <span key={r.round}>{r.round}</span>)}
      </div>
    </div>
  );
}

export function AutoModeRoundHistory({ rounds }: AutoModeRoundHistoryProps) {
  const [view, setView] = useState<ViewMode>(readStoredView);

  // Nothing to show until at least one round has actually finished — avoids
  // an empty table/chart cluttering the card during round 1.
  if (rounds.length === 0) return null;

  const selectView = (next: ViewMode) => {
    setView(next);
    writeStoredView(next);
  };

  return (
    <div className="mt-3 pt-3 border-t border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">Round-by-round</span>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden" role="group" aria-label="Round history view">
          <button
            type="button"
            onClick={() => selectView('table')}
            className={cn('px-2 py-1', view === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
            aria-pressed={view === 'table'}
            aria-label="Table view"
            title="Table view"
          >
            <Table2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => selectView('chart')}
            className={cn('px-2 py-1 border-l border-gray-200', view === 'chart' ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-600')}
            aria-pressed={view === 'chart'}
            aria-label="Chart view"
            title="Chart view"
          >
            <LineChart className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {view === 'table' ? <RoundTable rounds={rounds} /> : <RoundChart rounds={rounds} />}
    </div>
  );
}
