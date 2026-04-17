import { useState } from 'react';
import { ChevronDown, ChevronRight, Download, Loader2 } from 'lucide-react';
import { useLineageSummary } from '@/hooks/useCorpusSummary';
import { corpusSummaryService } from '@/services/corpus-summary.service';
import type {
  BucketFlow,
  BucketFlowEntry,
  ConfusionMatrix,
  DateRange,
  ExtractorDisagreementEntry,
  IssuesLogEntry,
  LineageHeadline,
  PerZoneTypeLineage,
} from '@/types/corpus-summary.types';
import { BackfillCaveatBanner } from './BackfillCaveatBanner';

interface Props {
  range: DateRange;
}

function pct(v: number, scale: 1 | 100 = 1): string {
  const p = scale === 1 ? v * 100 : v;
  return `${p.toFixed(1)}%`;
}

function num(v: number): string {
  return v.toLocaleString();
}

// ── Section: Headline cards ──────────────────────────────────────────

function HeadlineCards({ h }: { h: LineageHeadline }) {
  const cards = [
    { label: 'Total zones', value: num(h.totalZones) },
    { label: 'AI agreement rate', value: pct(h.aiAgreementRate) },
    { label: 'Human correction rate', value: pct(h.humanCorrectionRate) },
    { label: 'Human rejection rate', value: pct(h.humanRejectionRate) },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-center">
          <div className="text-lg font-semibold text-gray-900">{c.value}</div>
          <div className="text-xs text-gray-500">{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Section: Confusion matrix ────────────────────────────────────────

function ConfusionMatrixTable({ matrix }: { matrix: ConfusionMatrix }) {
  const { labels, cells } = matrix;
  const maxVal = Math.max(1, ...cells.flat());

  function cellBg(val: number, isDiag: boolean): string {
    if (val === 0) return '';
    const intensity = Math.min(val / maxVal, 1);
    if (isDiag) {
      // Diagonal = AI agreed with final → emerald scale
      if (intensity > 0.5) return 'bg-emerald-300';
      if (intensity > 0.2) return 'bg-emerald-200';
      return 'bg-emerald-100';
    }
    // Off-diagonal = disagreement → purple scale
    if (intensity > 0.5) return 'bg-purple-300';
    if (intensity > 0.2) return 'bg-purple-200';
    return 'bg-purple-100';
  }

  return (
    <div className="overflow-x-auto">
      <table className="text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-1 text-left text-gray-500">
              AI ↓ / Final →
            </th>
            {labels.map((l) => (
              <th key={l} className="px-2 py-1 text-center font-medium text-gray-700 whitespace-nowrap">
                {l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((rowLabel, ri) => (
            <tr key={rowLabel}>
              <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium text-gray-700 whitespace-nowrap">
                {rowLabel}
              </td>
              {cells[ri].map((val, ci) => (
                <td
                  key={ci}
                  className={`px-2 py-1 text-center tabular-nums ${cellBg(val, ri === ci)} ${ri === ci ? 'font-semibold' : ''}`}
                >
                  {val > 0 ? num(val) : ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Per zone type ───────────────────────────────────────────

function PerZoneTypeTable({ rows }: { rows: PerZoneTypeLineage[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Zone type</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Total</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Confirm %</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Correction %</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Rejection %</th>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Top corrected to</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.zoneType} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-800">{r.zoneType}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.totalZones)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(r.aiConfirmPct, 100)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(r.aiCorrectionPct, 100)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(r.aiRejectionPct, 100)}</td>
              <td className="px-3 py-2 text-gray-600">{r.topCorrectedTo ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Section: Bucket flow ─────────────────────────────────────────────

function BucketFlowSection({ flow }: { flow: BucketFlow }) {
  const buckets: Array<{ label: string; color: string; barColor: string; entry: BucketFlowEntry }> = [
    { label: 'Green (high confidence)', color: 'text-emerald-700', barColor: 'bg-emerald-500', entry: flow.green },
    { label: 'Amber (medium confidence)', color: 'text-amber-700', barColor: 'bg-amber-500', entry: flow.amber },
    { label: 'Red (low confidence)', color: 'text-red-700', barColor: 'bg-red-500', entry: flow.red },
  ];
  const maxTotal = Math.max(1, ...buckets.map((b) => b.entry.total));

  return (
    <div className="space-y-4">
      {buckets.map((b) => {
        const { total, humanConfirmed, humanCorrected, humanRejected } = b.entry;
        const barWidth = total > 0 ? `${(total / maxTotal) * 100}%` : '0%';
        return (
          <div key={b.label}>
            <div className={`mb-1 text-sm font-medium ${b.color}`}>
              {b.label} — {num(total)} zones
            </div>
            <div className="mb-1 h-3 w-full rounded-full bg-gray-100">
              <div className={`h-3 rounded-full ${b.barColor}`} style={{ width: barWidth }} />
            </div>
            <div className="flex gap-4 text-xs text-gray-600">
              <span>Confirmed: {num(humanConfirmed)}</span>
              <span>Corrected: {num(humanCorrected)}</span>
              <span>Rejected: {num(humanRejected)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Issues log drilldown ────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  PAGE_ALIGNMENT_MISMATCH: 'Page alignment mismatch',
  INSUFFICIENT_JOINT_COVERAGE: 'Insufficient joint coverage',
  LIMITED_ZONE_COVERAGE: 'Limited zone coverage',
  UNEQUAL_EXTRACTOR_COVERAGE: 'Unequal extractor coverage',
  SINGLE_EXTRACTOR_ONLY: 'Single extractor only',
  ZONE_CONTENT_DIVERGENCE: 'Zone content divergence',
  COMPLETED_WITH_REDUCED_SCOPE: 'Completed with reduced scope',
  OTHER: 'Other',
};

function IssuesLogDrilldown({ entries }: { entries: IssuesLogEntry[] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (entries.length === 0) {
    return <div className="text-sm text-gray-500">No issues logged in this date range.</div>;
  }

  const toggle = (cat: string) =>
    setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));

  return (
    <div className="divide-y divide-gray-100">
      {entries.map((e) => {
        const isOpen = expanded[e.category] ?? false;
        return (
          <div key={e.category}>
            <button
              type="button"
              onClick={() => toggle(e.category)}
              className="flex w-full items-center gap-2 px-1 py-2 text-left text-sm hover:bg-gray-50"
            >
              {isOpen ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
              )}
              <span className="font-medium text-gray-800">
                {CATEGORY_LABELS[e.category] ?? e.category}
              </span>
              <span className="text-xs text-gray-500">
                {e.titleCount} {e.titleCount === 1 ? 'title' : 'titles'}
                {e.blockingCount > 0 && ` · ${e.blockingCount} blocking`}
                {e.totalPagesAffected > 0 && ` · ${e.totalPagesAffected} pages`}
              </span>
            </button>
            {isOpen && (
              <div className="ml-6 mb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500">
                      <th className="px-2 py-1 text-left font-medium">Document</th>
                      <th className="px-2 py-1 text-left font-medium">Description</th>
                      <th className="px-2 py-1 text-right font-medium">Pages</th>
                      <th className="px-2 py-1 text-center font-medium">Blocking</th>
                      <th className="px-2 py-1 text-left font-medium">Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {e.titles.map((t) => (
                      <tr key={`${t.runId}-${t.description}`} className="border-t border-gray-50">
                        <td className="px-2 py-1 text-gray-700 max-w-[200px] truncate" title={t.documentName}>
                          {t.documentName}
                        </td>
                        <td className="px-2 py-1 text-gray-600">{t.description}</td>
                        <td className="px-2 py-1 text-right tabular-nums text-gray-600">
                          {t.pagesAffected ?? '—'}
                        </td>
                        <td className="px-2 py-1 text-center">
                          {t.blocking ? (
                            <span className="inline-block rounded bg-red-100 px-1.5 py-0.5 text-red-700">Yes</span>
                          ) : (
                            <span className="text-gray-400">No</span>
                          )}
                        </td>
                        <td className="px-2 py-1 text-gray-500 whitespace-nowrap">
                          {new Date(t.completedAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Section: Extractor disagreement ──────────────────────────────────

function ExtractorDisagreementTable({ rows }: { rows: ExtractorDisagreementEntry[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700">Final label</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Total zones</th>
            <th className="px-3 py-2 text-right font-medium text-gray-700">Disagreement %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.finalLabel} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium text-gray-800">{r.finalLabel}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{num(r.totalZones)}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-600">{pct(r.disagreementPct, 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────

export function CorpusLineageTab({ range }: Props) {
  const { data, isLoading, error } = useLineageSummary(range);

  const handleExportCsv = () => {
    void corpusSummaryService.downloadLineageCsv(range);
  };

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
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={isLoading || !data || data.runsIncluded === 0}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <BackfillCaveatBanner />

      {isLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-gray-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          Loading lineage summary&hellip;
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          Failed to load lineage summary.{' '}
          {error instanceof Error ? error.message : 'Unknown error.'}
        </div>
      )}

      {data && data.runsIncluded === 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-600">
          No completed runs in this date range. Try a wider range or mark runs complete first.
        </div>
      )}

      {data && data.runsIncluded > 0 && (
        <>
          <LineageSection title="Headline metrics">
            <HeadlineCards h={data.headline} />
          </LineageSection>

          <LineageSection title="Confusion matrix (AI label vs final label)">
            <ConfusionMatrixTable matrix={data.confusionMatrix} />
          </LineageSection>

          <LineageSection title="Per zone type">
            <PerZoneTypeTable rows={data.perZoneType} />
          </LineageSection>

          <LineageSection title="Bucket flow">
            <BucketFlowSection flow={data.bucketFlow} />
          </LineageSection>

          <LineageSection title="Issues log">
            <IssuesLogDrilldown entries={data.issuesLog} />
          </LineageSection>

          <LineageSection title="Extractor disagreement">
            <ExtractorDisagreementTable rows={data.extractorDisagreement} />
          </LineageSection>
        </>
      )}
    </div>
  );
}

function LineageSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-gray-200 bg-white">
      <header className="border-b border-gray-200 px-4 py-2">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}
