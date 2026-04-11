import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { annotationReportService } from '@/services/annotation-report.service';

/* Minimal markdown-to-HTML: handles ##, |tables|, **bold**, - bullets, \n */
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

interface AnalysisReport {
  markdown: string;
  generatedAt: string;
  model: string;
  tokenUsage: { promptTokens: number; completionTokens: number };
}

interface CostBreakdown {
  aiAnnotationCostUsd: number;
  aiReportCostUsd: number;
  annotatorActiveHours: number;
  annotatorCostInr: number;
  totalCostInr: number;
}

interface AnalysisResult {
  report: AnalysisReport;
  costBreakdown: CostBreakdown;
}

const USD_TO_INR = 85;

export default function AnnotationAnalysisPage() {
  const { runId } = useParams<{ runId: string }>();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'report' | 'cost'>('report');
  const [regenerating, setRegenerating] = useState(false);

  const { data, isLoading, error } = useQuery<AnalysisResult>({
    queryKey: ['analysis-report', runId],
    queryFn: () => annotationReportService.getAnalysis(runId!),
    enabled: !!runId,
  });

  const handleRegenerate = async () => {
    if (!runId || !window.confirm('Regenerate the analysis report? This will overwrite the existing report.')) return;
    setRegenerating(true);
    try {
      await annotationReportService.markAnnotationComplete(runId);
      queryClient.invalidateQueries({ queryKey: ['analysis-report', runId] });
    } finally {
      setRegenerating(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!data?.report.markdown) return;
    const blob = new Blob([data.report.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${runId?.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analysis report...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Console</Link>
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
          {error instanceof Error ? error.message : 'No analysis report found. Click "Mark Complete" on the Zone Review page to generate one.'}
        </div>
      </div>
    );
  }

  const { report, costBreakdown: cb } = data;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Link to="/bootstrap" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; Back to Console</Link>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Annotation Analysis Report</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {regenerating && (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {regenerating ? 'Regenerating...' : 'Regenerate'}
          </button>
          <button
            onClick={handleExportMarkdown}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Export Markdown
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {(['report', 'cost'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'report' ? 'Analysis Report' : 'Cost Breakdown'}
          </button>
        ))}
      </div>

      {activeTab === 'report' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div
            className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_tr]:border-b [&_tr]:border-gray-100"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(report.markdown) }}
          />
          <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 flex gap-4">
            <span>Generated: {new Date(report.generatedAt).toLocaleString()}</span>
            <span>Model: {report.model}</span>
            <span>Tokens: {report.tokenUsage.promptTokens} in / {report.tokenUsage.completionTokens} out</span>
          </div>
        </div>
      )}

      {activeTab === 'cost' && (
        <div className="grid grid-cols-2 gap-4">
          <CostCard
            title="AI Annotation"
            usd={cb.aiAnnotationCostUsd}
            inr={cb.aiAnnotationCostUsd * USD_TO_INR}
            subtitle="Zone-level AI decisions"
          />
          <CostCard
            title="AI Report Generation"
            usd={cb.aiReportCostUsd}
            inr={cb.aiReportCostUsd * USD_TO_INR}
            subtitle="Claude Haiku analysis"
          />
          <CostCard
            title="Annotator Labor"
            inr={cb.annotatorCostInr}
            subtitle={`${cb.annotatorActiveHours.toFixed(2)} hrs @ ₹400/hr (active time only)`}
          />
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="text-sm font-medium text-purple-800">Total Cost</div>
            <div className="text-2xl font-bold text-purple-900 mt-1">₹{cb.totalCostInr.toFixed(2)}</div>
            <div className="text-xs text-purple-600 mt-1">All costs combined (AI costs converted at $1 = ₹{USD_TO_INR})</div>
          </div>
        </div>
      )}
    </div>
  );
}

function CostCard({ title, usd, inr, subtitle }: { title: string; usd?: number; inr: number; subtitle: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-sm font-medium text-gray-700">{title}</div>
      <div className="text-xl font-bold text-gray-900 mt-1">₹{inr.toFixed(2)}</div>
      {usd != null && <div className="text-xs text-gray-500">${usd.toFixed(4)} USD</div>}
      <div className="text-xs text-gray-400 mt-1">{subtitle}</div>
    </div>
  );
}
