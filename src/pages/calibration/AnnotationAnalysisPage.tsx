import { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DOMPurify from 'dompurify';
import { annotationReportService } from '@/services/annotation-report.service';

const bold = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

/* Markdown-to-HTML with proper table/list wrapping */
function renderMarkdown(md: string): string {
  const lines = md.split('\n');
  const result: string[] = [];
  let inTable = false;
  let isFirstTableRow = true;
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // ── Table rows ──
    if (trimmed.startsWith('|')) {
      if (inList) { result.push('</ul>'); inList = false; }
      const cells = trimmed.split('|').filter(Boolean).map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;

      if (!inTable) {
        result.push('<table class="w-full border-collapse my-4 text-sm">');
        inTable = true;
        isFirstTableRow = true;
      }
      if (isFirstTableRow) {
        result.push(
          `<thead><tr class="bg-gray-50">${cells.map((c) =>
            `<th class="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">${bold(c)}</th>`,
          ).join('')}</tr></thead><tbody>`,
        );
        isFirstTableRow = false;
      } else {
        result.push(
          `<tr class="even:bg-gray-50">${cells.map((c) =>
            `<td class="border border-gray-200 px-3 py-2 text-gray-600">${bold(c)}</td>`,
          ).join('')}</tr>`,
        );
      }
      continue;
    }
    if (inTable) { result.push('</tbody></table>'); inTable = false; }

    // ── List items ──
    if (trimmed.startsWith('- ')) {
      if (!inList) { result.push('<ul class="my-2">'); inList = true; }
      result.push(`<li class="text-sm text-gray-700 ml-4 list-disc">${bold(trimmed.slice(2))}</li>`);
      continue;
    }
    if (inList) { result.push('</ul>'); inList = false; }

    // ── Headings, rules, paragraphs ──
    if (line.startsWith('#### '))      result.push(`<h4 class="text-sm font-semibold mt-3 mb-1">${line.slice(5)}</h4>`);
    else if (line.startsWith('### '))   result.push(`<h3 class="text-base font-semibold mt-4 mb-2">${line.slice(4)}</h3>`);
    else if (line.startsWith('## '))    result.push(`<h2 class="text-lg font-bold mt-6 mb-2">${line.slice(3)}</h2>`);
    else if (line.startsWith('# '))     result.push(`<h1 class="text-xl font-bold mt-6 mb-3">${line.slice(2)}</h1>`);
    else if (trimmed === '---')         result.push('<hr class="my-4 border-gray-200"/>');
    else if (trimmed === '')            result.push('<br/>');
    else                                result.push(`<p class="text-sm text-gray-700 mb-1">${bold(line)}</p>`);
  }

  if (inTable) result.push('</tbody></table>');
  if (inList) result.push('</ul>');
  return result.join('\n');
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
  const reportRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, error } = useQuery<AnalysisResult>({
    queryKey: ['analysis-report', runId],
    queryFn: () => annotationReportService.getAnalysis(runId!),
    enabled: !!runId,
    retry: (failureCount, err) => {
      // Don't retry on 404 — the report simply doesn't exist yet
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) return false;
      return failureCount < 2;
    },
  });

  const isNotFound =
    (error as { response?: { status?: number } })?.response?.status === 404;

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

  const handleExportWord = () => {
    if (!data?.report.markdown) return;
    const html = renderMarkdown(data.report.markdown);
    const wordDoc = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"><title>Annotation Analysis Report</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #333; line-height: 1.6; margin: 1in; }
  h1 { font-size: 18pt; font-weight: bold; color: #1a1a1a; margin-top: 24pt; margin-bottom: 12pt; }
  h2 { font-size: 14pt; font-weight: bold; color: #1a1a1a; margin-top: 20pt; margin-bottom: 8pt; border-bottom: 1px solid #e5e7eb; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: 600; color: #1a1a1a; margin-top: 16pt; margin-bottom: 6pt; }
  h4 { font-size: 11pt; font-weight: 600; color: #1a1a1a; margin-top: 12pt; margin-bottom: 4pt; }
  p { font-size: 11pt; color: #374151; margin-bottom: 4pt; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0; }
  th { border: 1px solid #d1d5db; padding: 6pt 10pt; text-align: left; font-weight: 600; background-color: #f9fafb; color: #374151; font-size: 10pt; }
  td { border: 1px solid #d1d5db; padding: 6pt 10pt; color: #4b5563; font-size: 10pt; }
  li { font-size: 11pt; color: #374151; margin-left: 16pt; margin-bottom: 2pt; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 16pt 0; }
</style></head>
<body>
  <h1>Annotation Analysis Report</h1>
  <p style="color:#9ca3af;font-size:9pt;">Generated: ${new Date(data.report.generatedAt).toLocaleString()} &nbsp;|&nbsp; Model: ${data.report.model}</p>
  ${html}
</body></html>`;

    const blob = new Blob(['\ufeff' + wordDoc], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis-report-${runId?.slice(0, 8)}.doc`;
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
        {isNotFound ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
            <h2 className="text-base font-semibold text-amber-900 mb-2">No analysis report yet</h2>
            <p className="text-sm text-amber-800 mb-4">
              This calibration run has not been marked complete. Open the Zone Review page and click <strong>Mark Complete</strong> to generate an analysis report.
            </p>
          </div>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-red-700 text-sm">
            {error instanceof Error ? error.message : 'Failed to load analysis report.'}
          </div>
        )}
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
            onClick={handleExportWord}
            className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Export Word
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
        <div className="bg-white rounded-lg border border-gray-200 p-6" ref={reportRef}>
          <div
            className="prose prose-sm max-w-none [&_table]:w-full [&_table]:border-collapse [&_tr]:border-b [&_tr]:border-gray-100"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderMarkdown(report.markdown)) }}
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
