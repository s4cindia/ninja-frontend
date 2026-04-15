import { Download, Loader2 } from 'lucide-react';
import { useLineageSummary } from '@/hooks/useCorpusSummary';
import { corpusSummaryService } from '@/services/corpus-summary.service';
import type { DateRange } from '@/types/corpus-summary.types';
import { BackfillCaveatBanner } from './BackfillCaveatBanner';

interface Props {
  range: DateRange;
}

// Lineage tab for the Corpus Summary page.
//
// This is a SKELETON. It wires up the React Query hook, the loading/error/
// empty states, the backfill caveat banner, and the per-tab Export CSV
// button. The six section bodies are placeholders until the LineageSummary
// response shape is confirmed against the staging PR #344 response via the
// curl checks documented in the FE PR #2 plan doc §7.3.
//
// When those curls run successfully, each placeholder `<section>` gets a
// proper implementation: headline cards → confusion matrix → per-zone-type
// table → bucket flow → issues log drilldown → extractor disagreement.

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
            <SectionPlaceholder label="Headline cards: totalZones, aiAgreementRate, humanCorrectionRate, humanRejectionRate" />
          </LineageSection>

          <LineageSection title="Confusion matrix">
            <SectionPlaceholder label="AI label vs final label matrix" />
          </LineageSection>

          <LineageSection title="Per zone type">
            <SectionPlaceholder label="Zone type · total · confirm % · correction % · rejection % · top corrected to" />
          </LineageSection>

          <LineageSection title="Bucket flow">
            <SectionPlaceholder label="Green / amber / red buckets → total / confirmed / corrected / rejected" />
          </LineageSection>

          <LineageSection title="Issues log">
            <SectionPlaceholder label="Collapsed drilldown per RunIssueCategory" />
          </LineageSection>

          <LineageSection title="Extractor disagreement">
            <SectionPlaceholder label="Final label · total zones · disagreement %" />
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

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
      {label}
    </div>
  );
}
