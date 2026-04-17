import { Download, FileText, Loader2 } from 'lucide-react';
import { useTimesheetSummary } from '@/hooks/useCorpusSummary';
import { corpusSummaryService } from '@/services/corpus-summary.service';
import type { DateRange } from '@/types/corpus-summary.types';
import { BackfillCaveatBanner } from './BackfillCaveatBanner';

interface Props {
  range: DateRange;
}

// Timesheet tab for the Corpus Summary page.
//
// SKELETON — see the note on CorpusLineageTab. Same pattern: hook wiring,
// loading/error/empty, banner, per-tab exports (CSV + PDF). Five placeholder
// sections until the TimesheetSummary shape is confirmed:
// totals → per operator → per title (display-only) → per zone type → throughput trend.

export function CorpusTimesheetTab({ range }: Props) {
  const { data, isLoading, error } = useTimesheetSummary(range);

  const handleExportCsv = () => {
    void corpusSummaryService.downloadTimesheetCsv(range);
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
            onClick={handleExportCsv}
            disabled={exportsDisabled}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
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
            <SectionPlaceholder label="Wall clock · active · idle · zones reviewed · zones/hr · cost ₹" />
          </TimesheetSection>

          <TimesheetSection title="Per operator">
            <SectionPlaceholder label="Operator · active hrs · zones reviewed · zones/hr · confirm % · correct % · reject % · runs · cost ₹" />
          </TimesheetSection>

          <TimesheetSection title="Per title">
            <SectionPlaceholder label="Run · document · pages · active hrs · zones · zones/hr · cost ₹ · issues · completed at (display only)" />
          </TimesheetSection>

          <TimesheetSection title="Per zone type">
            <SectionPlaceholder label="Zone type · total zones · avg sec/zone" />
          </TimesheetSection>

          <TimesheetSection title="Throughput trend">
            <SectionPlaceholder label="Table: date · zones reviewed · active hrs · zones/hr · operators active (chart deferred to PR #3)" />
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

function SectionPlaceholder({ label }: { label: string }) {
  return (
    <div className="rounded border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center text-xs text-gray-500">
      {label}
    </div>
  );
}
