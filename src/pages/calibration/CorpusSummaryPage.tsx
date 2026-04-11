import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { annotationReportService } from '@/services/annotation-report.service';

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
  const [activeTab, setActiveTab] = useState<'summary' | 'cost'>('summary');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, error } = useQuery<CorpusSummaryResult>({
    queryKey: ['corpus-summary'],
    queryFn: () => annotationReportService.getCorpusSummary(),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['corpus-summary'] });
    } finally {
      setRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Generating corpus summary...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Console</Link>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          {error instanceof Error ? error.message : 'No completed runs found. Mark annotation runs as complete first.'}
        </div>
      </div>
    );
  }

  const { summaryReport, costSummary } = data;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Console</Link>

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

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['summary', 'cost'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'summary' ? 'Summary Report' : 'Cost Summary'}
          </button>
        ))}
      </div>

      {activeTab === 'summary' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div
            className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_tr]:border-b [&_tr]:border-gray-100"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(summaryReport.markdown) }}
          />
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
            <span>Generated: {new Date(summaryReport.generatedAt).toLocaleString()}</span>
            <span>Model: {summaryReport.model}</span>
            <span>Tokens: {summaryReport.tokenUsage.promptTokens} in / {summaryReport.tokenUsage.completionTokens} out</span>
          </div>
        </div>
      )}

      {activeTab === 'cost' && (
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
                  <td className="px-4 py-2 text-right font-medium text-gray-800">{t.totalCostInr.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="px-4 py-2 text-gray-900">Total ({costSummary.totals.documents} documents)</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.pages}</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.zones}</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.aiAnnotationCostInr.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.aiReportCostInr.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.annotatorCostInr.toFixed(2)}</td>
                <td className="px-4 py-2 text-right text-gray-900">{costSummary.totals.totalCostInr.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
