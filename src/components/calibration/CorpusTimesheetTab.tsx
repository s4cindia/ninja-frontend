import { Download, FileText, Loader2 } from 'lucide-react';
import { useTimesheetSummary } from '@/hooks/useCorpusSummary';
import { corpusSummaryService } from '@/services/corpus-summary.service';
import type {
  DateRange,
  PerOperatorEntry,
  PerTitleEntry,
  PerZoneTypeTiming,
  ThroughputTrendEntry,
  TimesheetTotals,
} from '@/types/corpus-summary.types';
import { BackfillCaveatBanner } from './BackfillCaveatBanner';

interface Props {
  range: DateRange;
}

function num(v: number): string {
  return v.toLocaleString();
}

function hrs(v: number): string {
  return v.toFixed(1);
}

function inr(v: number): string {
  return `₹${v.toFixed(2)}`;
}

function pct100(v: number): string {
  return `${v.toFixed(1)}%`;
}

// ── Section: Totals cards ────────────────────────────────────────────

function TotalsCards({ t }: { t: TimesheetTotals }) {
  const cards = [
    { label: 'Wall clock', value: `${hrs(t.wallClockHours)} hrs` },
    { label: 'Active', value: `${hrs(t.activeHours)} hrs` },
    { label: 'Idle', value: `${hrs(t.idleHours)} hrs` },
    { label: 'Zones reviewed', value: num(t.zonesReviewed) },
    { label: 'Zones / hour', value: t.zonesPerHour.toFixed(1) },
    { label: 'Cost', value: inr(t.annotatorCostInr) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{c.value}</div>
          <div className="text-xs text-gray-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Per operator ────────────────────────────────────────────

function PerOperatorTable({ rows }: { rows: PerOperatorEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Operator</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Active hrs</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones/hr</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Confirm %</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Correct %</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Reject %</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Runs</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Cost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.operator} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-800">{r.operator}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{hrs(r.activeHours)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.zonesReviewed)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.zonesPerHour.toFixed(1)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct100(r.confirmPct)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct100(r.correctPct)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct100(r.rejectPct)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.runsContributedTo}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{inr(r.costInr)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Per title ───────────────────────────────────────────────

function PerTitleTable({ rows }: { rows: PerTitleEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Document</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Pages</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Active hrs</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones/hr</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Cost</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Issues</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Completed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.runId} className="border-t border-gray-100">
              <td className="px-3 py-2 text-gray-800 max-w-[250px] truncate" title={r.documentName}>
                {r.documentName}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.pages}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{hrs(r.activeHours)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.zonesReviewed)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.zonesPerHour.toFixed(1)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{inr(r.costInr)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.issuesCount}</td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                {new Date(r.completedAt).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Per zone type timing ────────────────────────────────────

function PerZoneTypeTimingTable({ rows }: { rows: PerZoneTypeTiming[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Zone type</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Total zones</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Avg sec/zone</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.zoneType} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-800">{r.zoneType}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.totalZones)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.avgSecondsPerZone.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Throughput trend (table) ────────────────────────────────

function ThroughputTrendTable({ rows }: { rows: ThroughputTrendEntry[] }) {
  // Filter out days with zero activity to keep the table compact
  const active = rows.filter(
    (r) => r.zonesReviewed > 0 || r.activeHours > 0 || r.operatorsActive > 0,
  );

  if (active.length === 0) {
    return <div className="text-sm text-gray-500">No active days in this period.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Active hrs</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Zones/hr</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Operators</th>
          </tr>
        </thead>
        <tbody>
          {active.map((r) => (
            <tr key={r.date} className="border-t border-gray-100">
              <td className="px-3 py-2 tabular-nums text-gray-800">{r.date}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.zonesReviewed)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{hrs(r.activeHours)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.zonesPerHour.toFixed(1)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{r.operatorsActive}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length !== active.length && (
        <div className="px-3 py-1 text-xs text-gray-400">
          {rows.length - active.length} inactive days hidden
        </div>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function CorpusTimesheetTab({ range }: Props) {
  const { data, isLoading, error } = useTimesheetSummary(range);

  const handleExportOperatorCsv = () => {
    void corpusSummaryService.downloadTimesheetPerOperatorCsv(range);
  };
  const handleExportTitleCsv = () => {
    void corpusSummaryService.downloadTimesheetPerTitleCsv(range);
  };
  const handleExportPdf = () => {
    void corpusSummaryService.downloadTimesheetPdf(range);
  };

  const exportsDisabled = isLoading || !data || data.runsIncluded === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {data ? (
            <>
              <span className="font-medium text-gray-900">{data.runsIncluded}</span> runs included
              for {range.from} &rarr; {range.to}
            </>
          ) : (
            <>&nbsp;</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportOperatorCsv}
            disabled={exportsDisabled}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV (per operator)
          </button>
          <button
            type="button"
            onClick={handleExportTitleCsv}
            disabled={exportsDisabled}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV (per title)
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            disabled={exportsDisabled}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FileText className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      <BackfillCaveatBanner />

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading timesheet summary&hellip;
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Failed to load timesheet summary.{' '}
          {error instanceof Error ? error.message : 'Unknown error.'}
        </div>
      )}

      {data && data.runsIncluded === 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          No completed runs in this date range.
        </div>
      )}

      {data && data.runsIncluded > 0 && (
        <>
          <TimesheetSection title="Totals">
            <TotalsCards t={data.totals} />
          </TimesheetSection>

          <TimesheetSection title="Per operator">
            <PerOperatorTable rows={data.perOperator} />
          </TimesheetSection>

          <TimesheetSection title="Per title">
            <PerTitleTable rows={data.perTitle} />
          </TimesheetSection>

          <TimesheetSection title="Per zone type">
            <PerZoneTypeTimingTable rows={data.perZoneType} />
          </TimesheetSection>

          <TimesheetSection title="Throughput trend">
            <ThroughputTrendTable rows={data.throughputTrend} />
          </TimesheetSection>
        </>
      )}
    </div>
  );
}

function TimesheetSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
