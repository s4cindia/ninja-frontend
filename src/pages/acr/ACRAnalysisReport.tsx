import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle, AlertTriangle, Info, Zap, Wrench, User,
  BarChart3, ClipboardList, BookOpen, ExternalLink, ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useAcrAnalysisReport } from '@/hooks/useAcrAnalysisReport';
import { RemediationDiffViewer } from '@/components/acr/RemediationDiffViewer';
import { FixTypeDonutChart } from '@/components/acr/charts/FixTypeDonutChart';
import { WcagLevelBarChart } from '@/components/acr/charts/WcagLevelBarChart';
import { ConfidenceDistributionChart } from '@/components/acr/charts/ConfidenceDistributionChart';
import { ExportPDFButton } from '@/components/acr/ExportPDFButton';
import { ShareButton } from '@/components/acr/ShareButton';
import type { ACRAnalysisReport, ExplainedAutoFixedItem, ExplainedIssueItem } from '@/types/acr-analysis-report.types';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-2/3" />
      <div className="h-4 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-3 gap-4 mt-6">
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-lg" />)}
      </div>
      <div className="h-64 bg-gray-200 rounded-lg" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={cn('rounded-lg p-4 border', color)}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm mt-0.5 opacity-80">{label}</div>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={cn('h-2 rounded-full transition-all', color)} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span className="text-sm font-semibold w-10 text-right">{value}%</span>
    </div>
  );
}

function AutoFixedCard({ item }: { item: ExplainedAutoFixedItem }) {
  return (
    <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50 space-y-2">
      <div className="flex items-start gap-2">
        <Zap size={14} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <span className="font-mono text-sm font-medium text-blue-800">{item.ruleId}</span>
          {item.wcagCriteria && <span className="ml-2 text-xs text-blue-500">WCAG {item.wcagCriteria}</span>}
          <p className="text-sm text-gray-700 mt-0.5">{item.description}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 pl-5">{item.explanation.reason}</p>
      {item.explanation.whatPlatformDid && (
        <p className="text-xs text-blue-700 pl-5">{item.explanation.whatPlatformDid}</p>
      )}
      {item.diff && (
        <div className="pl-5">
          <RemediationDiffViewer
            before={item.diff.before}
            after={item.diff.after}
            filePath={item.diff.filePath}
          />
        </div>
      )}
    </div>
  );
}

function IssueExplainCard({ item, icon: Icon, accentClass }: { item: ExplainedIssueItem; icon: React.ElementType; accentClass: string }) {
  return (
    <div className={cn('border rounded-lg p-4 space-y-2', accentClass)}>
      <div className="flex items-start gap-2">
        <Icon size={14} className="flex-shrink-0 mt-0.5 opacity-70" />
        <div className="flex-1">
          <span className="font-mono text-sm font-medium">{item.ruleId}</span>
          <p className="text-sm text-gray-700 mt-0.5">{item.description}</p>
        </div>
      </div>
      <p className="text-xs text-gray-500 pl-5">{item.explanation.reason}</p>
      {item.explanation.whatUserMustDo && (
        <div className="pl-5 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded p-2">
          <span className="font-medium">What to do: </span>{item.explanation.whatUserMustDo}
        </div>
      )}
      <div className="pl-5 flex items-center justify-between text-xs text-gray-400">
        <span>{item.explanation.wcagGuidance}</span>
        {item.explanation.estimatedTime && <span>~{item.explanation.estimatedTime}</span>}
      </div>
    </div>
  );
}

type Tab = 'auto' | 'quickfix' | 'manual';

function ExplainabilitySection({ report }: { report: ACRAnalysisReport }) {
  const [tab, setTab] = useState<Tab>('manual');
  const { autoFixed, quickFixes, manualRequired } = report.remediationExplainability;

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'manual', label: 'Manual Required', count: manualRequired.length },
    { id: 'quickfix', label: 'Quick-Fix', count: quickFixes.length },
    { id: 'auto', label: 'Auto-Fixed', count: autoFixed.length },
  ];

  return (
    <section>
      <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <ClipboardList size={18} className="text-purple-600" />
        Remediation Explainability
      </h2>
      <p className="text-sm text-gray-500 mb-4">
        Why each issue has its fix type, and what the platform did or what you need to do.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              tab === t.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
            <span className={cn(
              'ml-1.5 px-1.5 py-0.5 rounded text-xs',
              tab === t.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
            )}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="space-y-3">
        {tab === 'auto' && (
          autoFixed.length === 0
            ? <p className="text-sm text-gray-400">No auto-fixed items recorded.</p>
            : autoFixed.map(item => <AutoFixedCard key={item.ruleId} item={item} />)
        )}
        {tab === 'quickfix' && (
          quickFixes.length === 0
            ? <p className="text-sm text-gray-400">No quick-fix items.</p>
            : quickFixes.map(item => (
              <IssueExplainCard key={item.ruleId} item={item} icon={Wrench}
                accentClass="border-amber-100 bg-amber-50/40" />
            ))
        )}
        {tab === 'manual' && (
          manualRequired.length === 0
            ? <p className="text-sm text-gray-400">No manual review items.</p>
            : manualRequired.map(item => (
              <IssueExplainCard key={item.ruleId} item={item} icon={User}
                accentClass="border-orange-100 bg-orange-50/40" />
            ))
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ACRAnalysisReportPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token') ?? undefined;
  const fromBatchId = searchParams.get('batchId');
  const navigate = useNavigate();

  const { data: report, isLoading, error } = useAcrAnalysisReport(jobId ?? '', shareToken);

  const handleBack = () => {
    if (fromBatchId) {
      navigate(`/workflow/batch/${fromBatchId}`);
    } else if (window.history.length <= 1) {
      // Opened as a new tab with no history — close tab to return to opener
      window.close();
    } else {
      navigate(-1);
    }
  };

  if (!jobId) {
    return <div className="p-8 text-center text-gray-500">Invalid report URL.</div>;
  }

  if (isLoading) return <LoadingSkeleton />;

  if (error || !report) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Report unavailable</h2>
        <p className="text-sm text-gray-500">
          The analysis report could not be generated. Ensure the ACR analysis has been completed for this job.
        </p>
        <button
          onClick={handleBack}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft size={16} />
          {fromBatchId ? 'Back to Batch' : 'Go Back'}
        </button>
      </div>
    );
  }

  const { executiveSummary: es, statistics: stats, metadata, aiInsights } = report;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-700 to-indigo-700 text-white px-6 py-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-purple-200 text-sm mb-2">
                <BarChart3 size={14} />
                <span>AI Analysis Report</span>
                {shareToken && (
                  <span className="ml-2 px-2 py-0.5 bg-white/10 rounded text-xs">Shared view</span>
                )}
              </div>
              <h1 className="text-2xl font-bold">{metadata.contentTitle}</h1>
              <p className="text-purple-200 text-sm mt-1">
                Generated {new Date(metadata.analysisDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="text-right">
                <div className="text-4xl font-bold">{es.overallConfidence}%</div>
                <div className="text-purple-200 text-sm">Automated confidence</div>
              </div>
              {/* Actions — only show in authenticated view */}
              {!shareToken && (
                <div className="flex items-center gap-2">
                  <ExportPDFButton report={report} />
                  <ShareButton jobId={jobId} />
                </div>
              )}
              {shareToken && (
                <ExportPDFButton report={report} />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* Executive Summary */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Info size={18} className="text-indigo-600" />
            Executive Summary
          </h2>

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total Criteria" value={es.totalCriteria} color="border-gray-200 bg-white text-gray-800" />
            <StatCard label="Automated Passed" value={es.automatedPassed} color="border-green-200 bg-green-50 text-green-800" />
            <StatCard label="Manual Required" value={es.manualRequired} color="border-amber-200 bg-amber-50 text-amber-800" />
            <StatCard label="Not Applicable" value={es.notApplicable} color="border-gray-200 bg-gray-50 text-gray-600" />
          </div>

          {/* Confidence bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2 text-sm">
              <span className="font-medium text-gray-700">Overall Automated Confidence</span>
            </div>
            <ConfidenceBar value={es.overallConfidence} />
          </div>

          {/* Key findings */}
          {es.keyFindings.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Findings</h3>
              <ul className="space-y-2">
                {es.keyFindings.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    {f.type === 'success' && <CheckCircle size={14} className="text-green-500 flex-shrink-0 mt-0.5" />}
                    {f.type === 'warning' && <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />}
                    {f.type === 'info' && <Info size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />}
                    <span className="text-gray-700">{f.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical actions */}
          {es.criticalActions.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                <AlertTriangle size={14} />
                Action Required — Cannot claim conformance without manual testing
              </h3>
              <ul className="space-y-1">
                {es.criticalActions.map((action, i) => (
                  <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* AI Insights (when available) */}
        {aiInsights && (
          <section className="bg-indigo-50 border border-indigo-200 rounded-lg p-5">
            <h2 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
              <Zap size={14} />
              AI-Generated Insights
              <span className="ml-auto text-xs font-normal text-indigo-400">{aiInsights.model}</span>
            </h2>
            {aiInsights.riskAssessment && (
              <p className="text-sm text-indigo-700 mb-3">{aiInsights.riskAssessment}</p>
            )}
            {aiInsights.topPriorities.length > 0 && (
              <div className="mb-3">
                <h3 className="text-xs font-semibold text-indigo-700 mb-1">Top priorities</h3>
                <ul className="space-y-1">
                  {aiInsights.topPriorities.map((p, i) => (
                    <li key={i} className="text-xs text-indigo-600 flex gap-1.5">
                      <span>{i + 1}.</span>{p}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiInsights.specificRecommendations.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-indigo-700 mb-1">Recommendations</h3>
                <ul className="space-y-1">
                  {aiInsights.specificRecommendations.map((r, i) => (
                    <li key={i} className="text-xs text-indigo-600 flex gap-1.5">
                      <span className="text-indigo-300">•</span>{r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Remediation Explainability */}
        <ExplainabilitySection report={report} />

        {/* Charts + Statistics */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-indigo-600" />
            Statistics &amp; Charts
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Fix type donut */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Remediation Distribution</h3>
              <FixTypeDonutChart
                autoFixed={stats.autoFixed}
                quickFix={stats.quickFix}
                manual={stats.manual}
              />
            </div>

            {/* Confidence distribution */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Confidence Distribution</h3>
              <ConfidenceDistributionChart
                high={stats.highConfidenceCount}
                medium={stats.mediumConfidenceCount}
                low={stats.lowConfidenceCount}
              />
            </div>

            {/* WCAG level bar — full width */}
            <div className="bg-white border border-gray-200 rounded-lg p-5 md:col-span-2">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">WCAG Level Breakdown</h3>
              <WcagLevelBarChart byWcagLevel={stats.byWcagLevel} />
            </div>
          </div>

          {/* Numeric detail */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500">High confidence</span><div className="font-semibold text-green-700">{stats.highConfidenceCount}</div></div>
            <div><span className="text-gray-500">Medium confidence</span><div className="font-semibold text-amber-700">{stats.mediumConfidenceCount}</div></div>
            <div><span className="text-gray-500">Low / no confidence</span><div className="font-semibold text-red-700">{stats.lowConfidenceCount}</div></div>
            {(['A', 'AA', 'AAA'] as const).map(lvl => {
              const d = stats.byWcagLevel[lvl];
              return (
                <div key={lvl}>
                  <span className="text-gray-500">Level {lvl}</span>
                  <div className="font-semibold text-gray-800">{d.total} total · {d.passed} passed · {d.manual} manual · {d.na} N/A</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Methodology note */}
        <section className="text-xs text-gray-400 border-t border-gray-200 pt-6 flex items-start gap-2">
          <BookOpen size={13} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-gray-500">Methodology: </span>
            This report combines automated EPUB/PDF accessibility auditing (EPUBCheck, ACE by DAISY, Matterhorn Protocol) with AI-assisted conformance analysis.
            Automated results reflect the state at the time of analysis. Manual testing is required for criteria marked as "Manual Required" before making any conformance claim.
            {metadata.explanationSource !== 'hardcoded' && (
              <span> AI explanations powered by Gemini. </span>
            )}
            <a
              href="https://www.w3.org/WAI/standards-guidelines/wcag/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-indigo-400 hover:underline ml-1"
            >
              WCAG 2.1 <ExternalLink size={10} />
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
