import { useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { annotationReportService } from '@/services/annotation-report.service';
import { CorpusTimeRangeFilter } from '@/components/calibration/CorpusTimeRangeFilter';
import {
  clampDateRange,
  defaultRange,
  toIsoDate,
} from '@/components/calibration/corpusDateRange';
import { CorpusLineageTab } from '@/components/calibration/CorpusLineageTab';
import { CorpusTimesheetTab } from '@/components/calibration/CorpusTimesheetTab';
import type { DateRange } from '@/types/corpus-summary.types';

type CorpusTab = 'summary' | 'lineage' | 'timesheet' | 'cost';

const TABS: ReadonlyArray<{ id: CorpusTab; label: string }> = [
  { id: 'summary', label: 'Summary Report' },
  { id: 'lineage', label: 'Lineage' },
  { id: 'timesheet', label: 'Timesheet' },
  { id: 'cost', label: 'Cost Summary' },
];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isIsoDate(s: string | null): s is string {
  return !!s && ISO_DATE_RE.test(s);
}

/* Minimal markdown-to-HTML */
function renderMarkdown(md: string): string {
  return md
    .split('\n')
    .map((line) => {
      if (line.startsWith('#### ')) return `<h4 class="text-sm font-semibold mt-3 mb-1">${line.slice(5)}</h4>`;
      if (line.startsWith('### ')) return `<h3 class="text-base font-semibold mt-4 mb-2">${line.slice(4)}</h3>`;
      if (line.startsWith('## ')) return `<h2 class="text-lg font-bold mt-6 mb-2">${line.slice(3)}</h2>`;
      if (line.startsWith('# ')) return `<h1 class="text-xl font-bold mt-6 mb-3">${line.slice(2)}</h1>`;
      if (line.startsWith('|')) {
        const cells = line.split('|').filter(Boolean).map((c) => c.trim());
        if (cells.every((c) => /^[-:]+$/.test(c))) return '';
        return `<tr>${cells.map((c) => `<td class="border border-gray-200 px-2 py-1 text-sm">${c}</td>`).join('')}</tr>`;
      }
      if (line.trim().startsWith('- ')) {
        const content = line.trim().slice(2);
        return `<li class="text-sm text-gray-700 ml-4 list-disc">${content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`;
      }
      if (line.trim() === '') return '<br/>';
      return `<p class="text-sm text-gray-700 mb-1">${line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`;
    })
    .join('\n');
}

interface CostTitle {
  documentName: string;
  runId: string;
  pages: number;
  zones: number;
  aiAnnotationCostInr: number;
  aiReportCostInr: number;
  annotatorCostInr: number;
  totalCostInr: number;
}

interface CostTotals {
  documents: number;
  pages: number;
  zones: number;
  aiAnnotationCostInr: number;
  aiReportCostInr: number;
  annotatorCostInr: number;
  totalCostInr: number;
}

interface CorpusSummaryResult {
  summaryReport: {
    markdown: string;
    generatedAt: string;
    model: string;
    tokenUsage: { promptTokens: number; completionTokens: number };
  };
  costSummary: {
    titles: CostTitle[];
    totals: CostTotals;
  };
}

export default function CorpusSummaryPage() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL state: ?tab, ?from, ?to. Defaults: summary tab, last 30 days.
  const initialTab: CorpusTab = useMemo(() => {
    const t = searchParams.get('tab');
    return t === 'lineage' || t === 'timesheet' || t === 'cost' || t === 'summary'
      ? t
      : 'summary';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<CorpusTab>(initialTab);

  // Read `from` / `to` from URL each render so back/forward and shared links
  // stay deterministic. If either is missing or invalid, fall back to the
  // default 30-day range.
  const range: DateRange = useMemo(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (isIsoDate(from) && isIsoDate(to)) {
      return clampDateRange({ from, to }, toIsoDate(new Date()));
    }
    return defaultRange();
  }, [searchParams]);

  const handleRangeChange = useCallback(
    (next: DateRange) => {
      const params = new URLSearchParams(searchParams);
      params.set('from', next.from);
      params.set('to', next.to);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleTabChange = useCallback(
    (tab: CorpusTab) => {
      setActiveTab(tab);
      const params = new URLSearchParams(searchParams);
      params.set('tab', tab);
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const [refreshing, setRefreshing] = useState(false);

  const {
    data,
    isLoading: summaryLoading,
    error: summaryError,
  } = useQuery<CorpusSummaryResult>({
    queryKey: ['corpus-summary'],
    queryFn: () => annotationReportService.getCorpusSummary(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['corpus'] });
      await queryClient.invalidateQueries({ queryKey: ['corpus-summary'] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">
        &larr; Back to Console
      </Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Corpus Summary</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="mb-4">
        <CorpusTimeRangeFilter value={range} onChange={handleRangeChange} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <SummaryTabBody
          data={data}
          isLoading={summaryLoading}
          error={summaryError}
        />
      )}

      {activeTab === 'lineage' && <CorpusLineageTab range={range} />}

      {activeTab === 'timesheet' && <CorpusTimesheetTab range={range} />}

      {activeTab === 'cost' && (
        <CostTabBody
          data={data}
          isLoading={summaryLoading}
          error={summaryError}
        />
      )}
    </div>
  );
}

interface CostSummaryBodyProps {
  data: CorpusSummaryResult | undefined;
  isLoading: boolean;
  error: Error | unknown;
}

function SummaryTabBody({ data, isLoading, error }: CostSummaryBodyProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Generating corpus summary...</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
        {error instanceof Error
          ? error.message
          : 'No completed runs found. Mark annotation runs as complete first.'}
      </div>
    );
  }
  const { summaryReport } = data;
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div
        className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_tr]:border-b [&_tr]:border-gray-100"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(renderMarkdown(summaryReport.markdown)),
        }}
      />
      <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
        <span>Generated: {new Date(summaryReport.generatedAt).toLocaleString()}</span>
        <span>Model: {summaryReport.model}</span>
        <span>
          Tokens: {summaryReport.tokenUsage.promptTokens} in /{' '}
          {summaryReport.tokenUsage.completionTokens} out
        </span>
      </div>
    </div>
  );
}

function CostTabBody({ data, isLoading, error }: CostSummaryBodyProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading cost summary...</div>
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
        {error instanceof Error
          ? error.message
          : 'No completed runs found. Mark annotation runs as complete first.'}
      </div>
    );
  }
  const { costSummary } = data;
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2 font-medium text-gray-700">Document</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">Pages</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">Zones</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">AI Annotation (₹)</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">AI Report (₹)</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">Annotator (₹)</th>
            <th className="text-right px-4 py-2 font-medium text-gray-700">Total (₹)</th>
          </tr>
        </thead>
        <tbody>
          {costSummary.titles.map((t) => (
            <tr key={t.runId} className="border-t border-gray-100">
              <td className="px-4 py-2 text-gray-800">{t.documentName}</td>
              <td className="px-4 py-2 text-right text-gray-600">{t.pages}</td>
              <td className="px-4 py-2 text-right text-gray-600">{t.zones}</td>
              <td className="px-4 py-2 text-right text-gray-600">{t.aiAnnotationCostInr.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-600">{t.aiReportCostInr.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-600">{t.annotatorCostInr.toFixed(2)}</td>
              <td className="px-4 py-2 text-right font-medium text-gray-800">
                {t.totalCostInr.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <td className="px-4 py-2 text-gray-900">
              Total ({costSummary.totals.documents} documents)
            </td>
            <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.pages}</td>
            <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.zones}</td>
            <td className="px-4 py-2 text-right text-gray-900">
              {costSummary.totals.aiAnnotationCostInr.toFixed(2)}
            </td>
            <td className="px-4 py-2 text-right text-gray-900">
              {costSummary.totals.aiReportCostInr.toFixed(2)}
            </td>
            <td className="px-4 py-2 text-right text-gray-900">
              {costSummary.totals.annotatorCostInr.toFixed(2)}
            </td>
            <td className="px-4 py-2 text-right text-gray-900">
              {costSummary.totals.totalCostInr.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
