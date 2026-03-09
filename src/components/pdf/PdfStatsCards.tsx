import React, { useState, useMemo } from 'react';
import {
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  Loader2, Sparkles, Tag,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { api } from '@/services/api';
import type { PdfAuditResult, PdfAuditIssue } from '@/types/pdf.types';
import type { AiAnalysis } from '@/components/remediation/IssueCard';

// ─── localStorage persistence ─────────────────────────────────────────────────

const STORAGE_KEY = 'ninja:pdf-stats-cards';
interface CardState { autoTag: boolean; issues: boolean; ai: boolean }
const DEFAULTS: CardState = { autoTag: true, issues: true, ai: true };

function readStorage(): CardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<CardState>) };
  } catch { return DEFAULTS; }
}

function writeStorage(s: CardState): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota */ }
}

// ─── Matterhorn detection (mirrors PdfAuditResultsPage) ──────────────────────

const CAT_MAP: Record<string, string> = {
  structure: '01', metadata: '07', language: '16', headings: '06',
  'reading-order': '09', lists: '04', tables: '11',
  'table-structure': '11', 'table-headers': '11',
};
const MATTERHORN_PREFIXES = [
  'TABLE-', 'ALT-TEXT-', 'LIST-',
  'PDF-LOW-CONTRAST', 'PDF-UNTAGGED', 'PDF-NO-LANGUAGE',
];

type AugIssue = PdfAuditIssue & { category?: string; code?: string };

function isMatterhorn(issue: AugIssue): boolean {
  if (issue.matterhornCheckpoint) return true;
  if (issue.category && CAT_MAP[issue.category]) return true;
  const code = ((issue as { code?: string }).code || issue.ruleId || '').toUpperCase();
  if (/^MATTERHORN-\d{2}-/.test(code)) return true;
  return MATTERHORN_PREFIXES.some(p => code.startsWith(p));
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutoTagInfo {
  status?: string;
  hasTaggingReport?: boolean;
  hasWordExport?: boolean;
  elementCounts?: Record<string, number> | null;
  adobeFlags?: Array<{
    elementType?: string;
    page?: number;
    confidence?: string;
    reviewComment?: string;
  }>;
  postRemediationStatus?: 'pending' | 'complete' | 'failed';
  postRemediationAudit?: {
    runAt: string;
    resolved: number;
    remaining: number;
    regressions: number;
    resolutionRate: number;
  };
}

export interface AiStatsData {
  gemini: { totalTokens: number; estimatedCostUsd: number };
  claude: { totalTokens: number; estimatedCostUsd: number };
  totalTokens: number;
  totalCostUsd: number;
}

export interface PdfStatsCardsProps {
  autoTagInfo: AutoTagInfo | null;
  auditResult: PdfAuditResult;
  aiSuggestions: Map<string, AiAnalysis>;
  aiStats: AiStatsData | null;
  matterhornIssueCount: number;
  isAnalyzingAi: boolean;
  aiProgress: { analyzed: number; total: number } | null;
  onViewAutoTagReport: () => void;
  onRetryAutoTag: () => void;
  isRetryingAutoTag: boolean;
  jobId: string;
}

// ─── Card shell ───────────────────────────────────────────────────────────────

interface StatsCardProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  /** Shown when collapsed — compact key figures on one line */
  summary: React.ReactNode;
  /** Shown when expanded — full detail */
  children: React.ReactNode;
  accentColor: string;
}

function StatsCard({ title, icon, expanded, onToggle, summary, children, accentColor }: StatsCardProps) {
  return (
    <div
      className="flex-1 border border-gray-200 rounded-lg bg-white overflow-hidden"
      style={{ borderTop: `4px solid ${accentColor}` }}
    >
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-semibold text-sm text-gray-900">{title}</span>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
        }
      </button>

      {/* Collapsed summary */}
      {!expanded && (
        <div className="px-4 pb-3 pt-2 border-t border-gray-100 flex flex-wrap items-center gap-x-3 gap-y-1">
          {summary}
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Tiny shared atoms ────────────────────────────────────────────────────────

/** Inline metric used in summary row */
function SummaryMetric({ n, label, className }: { n: number | string; label: string; className?: string }) {
  return (
    <span className={cn('text-xs', className)}>
      <span className="font-bold tabular-nums">{n}</span>
      {' '}
      <span className="text-gray-500">{label}</span>
    </span>
  );
}

/** Justified key/value row used in detail sections */
function DetailRow({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex items-baseline justify-between text-xs">
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-semibold text-gray-900">
        {value}
        {sub && <span className="text-gray-400 ml-1">{sub}</span>}
      </span>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function PdfStatsCards({
  autoTagInfo,
  auditResult,
  aiSuggestions,
  aiStats,
  matterhornIssueCount,
  isAnalyzingAi,
  aiProgress,
  onViewAutoTagReport,
  onRetryAutoTag,
  isRetryingAutoTag,
  jobId,
}: PdfStatsCardsProps) {
  const [expanded, setExpanded] = useState<CardState>(() => readStorage());

  const toggle = (card: keyof CardState) =>
    setExpanded(prev => {
      const next = { ...prev, [card]: !prev[card] };
      writeStorage(next);
      return next;
    });

  const issues = auditResult.issues ?? [];

  const derived = useMemo(() => {
    const sugs = Array.from(aiSuggestions.values());

    const mattIds = new Set<string>();
    for (const issue of issues) {
      if (isMatterhorn(issue as AugIssue)) mattIds.add(issue.id);
    }

    const mattSugs = sugs.filter(s => mattIds.has(s.issueId));
    const otherSugs = sugs.filter(s => !mattIds.has(s.issueId));

    // Provider split: use model field (accurate, not inferred)
    const geminiSugs = sugs.filter(s => s.model?.toLowerCase().includes('gemini'));
    const claudeSugs = sugs.filter(s => !s.model?.toLowerCase().includes('gemini'));

    const fixes = (arr: AiAnalysis[]) => arr.filter(s => s.applyMode === 'apply-to-pdf').length;
    const guidance = (arr: AiAnalysis[]) => arr.filter(s => s.applyMode === 'guidance-only').length;
    const cnt = (arr: AiAnalysis[], pred: (s: AiAnalysis) => boolean) => arr.filter(pred).length;

    return {
      othersCount: issues.length - matterhornIssueCount,
      aiTotal: sugs.length,
      aiFixes: fixes(sugs),
      aiGuidance: guidance(sugs),
      aiApplied: cnt(sugs, s => s.status === 'applied'),
      aiHighConf: cnt(sugs, s => s.confidence >= 0.9),
      aiMedConf: cnt(sugs, s => s.confidence >= 0.7 && s.confidence < 0.9),
      aiLowConf: cnt(sugs, s => s.confidence < 0.7),
      coverage: issues.length > 0 ? Math.round((sugs.length / issues.length) * 100) : 0,
      mattFixes: fixes(mattSugs),
      mattGuidance: guidance(mattSugs),
      mattHighConf: cnt(mattSugs, s => s.confidence >= 0.9),
      otherFixes: fixes(otherSugs),
      otherGuidance: guidance(otherSugs),
      geminiFixes: fixes(geminiSugs),
      geminiGuidance: guidance(geminiSugs),
      claudeFixes: fixes(claudeSugs),
      claudeGuidance: guidance(claudeSugs),
    };
  }, [issues, aiSuggestions, matterhornIssueCount]);

  // ─── Card 1: Auto Tag ────────────────────────────────────────────────────────

  const atStatus = autoTagInfo?.status;
  const elems = autoTagInfo?.elementCounts;

  const autoTagIcon = atStatus === 'complete'
    ? <CheckCircle className="h-4 w-4 text-green-600" />
    : atStatus === 'failed'
      ? <AlertTriangle className="h-4 w-4 text-amber-500" />
      : atStatus === 'processing'
        ? <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
        : <Tag className="h-4 w-4 text-gray-400" />;

  const autoTagSummary = atStatus === 'complete' ? (
    <>
      <span className="text-xs font-medium text-green-700">✓ Adobe</span>
      {elems && (
        <>
          <SummaryMetric n={elems.figures ?? 0} label="Fig" />
          <SummaryMetric n={elems.tables ?? 0} label="Tab" />
          <SummaryMetric n={elems.headings ?? 0} label="Head" />
          <SummaryMetric n={elems.paragraphs ?? 0} label="Para" />
        </>
      )}
    </>
  ) : atStatus === 'failed' ? (
    <span className="text-xs text-amber-700 font-medium">Auto-tagging failed</span>
  ) : atStatus === 'processing' ? (
    <span className="text-xs text-blue-700">Auto-tagging in progress…</span>
  ) : (
    <span className="text-xs text-gray-400">No auto-tag data</span>
  );

  const autoTagDetail = (
    <>
      {atStatus === 'complete' && elems && (
        <div className="space-y-1">
          <DetailRow label="Figures" value={elems.figures ?? 0} />
          <DetailRow label="Tables" value={elems.tables ?? 0} />
          <DetailRow label="Headings" value={elems.headings ?? 0} />
          <DetailRow label="Paragraphs" value={elems.paragraphs ?? 0} />
        </div>
      )}
      {autoTagInfo?.adobeFlags && autoTagInfo.adobeFlags.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
          <span><strong>{autoTagInfo.adobeFlags.length}</strong> elements flagged for manual review</span>
        </div>
      )}
      {atStatus === 'failed' && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-700">Auto-tagging failed</span>
          <button
            type="button"
            onClick={onRetryAutoTag}
            disabled={isRetryingAutoTag}
            className="text-amber-700 underline disabled:opacity-50"
          >
            {isRetryingAutoTag ? 'Retrying…' : 'Retry'}
          </button>
        </div>
      )}
      {atStatus === 'processing' && (
        <div className="flex items-center gap-2 text-xs text-blue-700">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Auto-tagging with Adobe…
        </div>
      )}
      {(autoTagInfo?.hasTaggingReport || autoTagInfo?.hasWordExport) && (
        <div className="flex items-center gap-3 pt-1">
          {autoTagInfo.hasTaggingReport && (
            <button
              type="button"
              onClick={onViewAutoTagReport}
              className="text-xs text-blue-600 hover:underline"
            >
              View Report
            </button>
          )}
          {autoTagInfo.hasWordExport && (
            <a
              href={`${api.defaults.baseURL}/pdf/${encodeURIComponent(jobId)}/auto-tag/word`}
              download
              className="text-xs text-blue-600 hover:underline"
            >
              Download Word
            </a>
          )}
        </div>
      )}
      {!autoTagInfo && (
        <span className="text-xs text-gray-400">No auto-tag data for this job</span>
      )}
    </>
  );

  // ─── Card 2: Issues ──────────────────────────────────────────────────────────

  const issuesSummary = (
    <>
      <SummaryMetric n={issues.length} label="Total" className="font-bold text-gray-900" />
      <SummaryMetric n={matterhornIssueCount} label="Matterhorn" className="text-red-700" />
      <SummaryMetric n={derived.othersCount} label="Others" />
      {derived.aiTotal > 0 && (
        <SummaryMetric n={derived.aiTotal} label="AI suggestions" className="text-purple-700" />
      )}
    </>
  );

  const issuesDetail = (
    <>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900 tabular-nums">{issues.length}</span>
        <span className="text-sm text-gray-500">Total Issues</span>
        {derived.coverage > 0 && (
          <span className="ml-auto text-xs text-gray-400">{derived.coverage}% AI coverage</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-red-50 rounded-md p-3 space-y-1.5">
          <p className="text-xs font-semibold text-red-800 mb-2">
            Matterhorn ({matterhornIssueCount})
          </p>
          {derived.mattFixes > 0 && <DetailRow label="AI Fixes" value={derived.mattFixes} />}
          {derived.mattGuidance > 0 && <DetailRow label="AI Guidance" value={derived.mattGuidance} />}
          {derived.mattHighConf > 0 && <DetailRow label="High conf" value={derived.mattHighConf} />}
          {derived.mattFixes === 0 && derived.mattGuidance === 0 && (
            <span className="text-xs text-gray-400">No AI coverage</span>
          )}
        </div>
        <div className="bg-gray-50 rounded-md p-3 space-y-1.5">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Others ({derived.othersCount})
          </p>
          {derived.otherFixes > 0 && <DetailRow label="AI Fixes" value={derived.otherFixes} />}
          {derived.otherGuidance > 0 && <DetailRow label="AI Guidance" value={derived.otherGuidance} />}
          {derived.otherFixes === 0 && derived.otherGuidance === 0 && (
            <span className="text-xs text-gray-400">No AI coverage</span>
          )}
        </div>
      </div>

      {autoTagInfo?.postRemediationStatus === 'complete' && autoTagInfo.postRemediationAudit && (
        <div className="bg-green-50 rounded-md px-3 py-2 text-xs text-green-800 space-y-1">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="h-3.5 w-3.5 flex-shrink-0" />
            Post-fix validation · {Math.round(autoTagInfo.postRemediationAudit.resolutionRate * 100)}% resolved
          </div>
          <div className="flex gap-3 pl-5 text-green-700">
            <span><strong>{autoTagInfo.postRemediationAudit.resolved}</strong> resolved</span>
            <span><strong>{autoTagInfo.postRemediationAudit.remaining}</strong> remaining</span>
            {autoTagInfo.postRemediationAudit.regressions > 0 && (
              <span className="text-amber-700">
                <strong>{autoTagInfo.postRemediationAudit.regressions}</strong> regressions
              </span>
            )}
          </div>
        </div>
      )}
      {autoTagInfo?.postRemediationStatus === 'failed' && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 rounded px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5" />
          Post-fix validation failed
        </div>
      )}
      {autoTagInfo?.postRemediationStatus === 'pending' && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 rounded px-3 py-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Validating fixes…
        </div>
      )}
    </>
  );

  // ─── Card 3: AI Analysis ─────────────────────────────────────────────────────

  const aiSummary = isAnalyzingAi ? (
    <>
      <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
      <span className="text-xs text-purple-700">
        Analyzing {aiProgress?.analyzed ?? 0}/{aiProgress?.total ?? '…'}
      </span>
    </>
  ) : (
    <>
      <SummaryMetric n={derived.aiTotal} label="Suggestions" className="text-purple-700" />
      <SummaryMetric n={derived.aiFixes} label="Fixes" className="text-green-700" />
      <SummaryMetric n={derived.aiGuidance} label="Guidance" />
      {aiStats && (
        <SummaryMetric
          n={`$${aiStats.totalCostUsd.toFixed(4)}`}
          label="total cost"
          className="text-gray-600"
        />
      )}
    </>
  );

  const aiDetail = isAnalyzingAi ? (
    <div className="flex items-center gap-2 text-sm text-purple-700">
      <Loader2 className="h-4 w-4 animate-spin" />
      Analyzing {aiProgress?.analyzed ?? 0} / {aiProgress?.total ?? '…'} issues…
    </div>
  ) : derived.aiTotal === 0 && !aiStats ? (
    <span className="text-xs text-gray-400">AI analysis not yet run</span>
  ) : (
    <>
      {/* Suggestions row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-purple-50 rounded-md py-2">
          <div className="text-xl font-bold text-purple-800 tabular-nums">{derived.aiFixes}</div>
          <div className="text-xs text-purple-600">Fixes</div>
        </div>
        <div className="bg-blue-50 rounded-md py-2">
          <div className="text-xl font-bold text-blue-800 tabular-nums">{derived.aiGuidance}</div>
          <div className="text-xs text-blue-600">Guidance</div>
        </div>
        <div className="bg-green-50 rounded-md py-2">
          <div className="text-xl font-bold text-green-800 tabular-nums">{derived.aiApplied}</div>
          <div className="text-xs text-green-600">Applied</div>
        </div>
      </div>

      {/* Confidence breakdown */}
      <div>
        <p className="text-xs font-semibold text-gray-600 mb-1.5">Confidence</p>
        <div className="space-y-1">
          <DetailRow label="High (≥ 90%)" value={derived.aiHighConf} />
          <DetailRow label="Medium (70–89%)" value={derived.aiMedConf} />
          <DetailRow label="Low (< 70%)" value={derived.aiLowConf} />
        </div>
      </div>

      {/* Provider breakdown */}
      {aiStats && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1.5">Provider</p>
          <div className="space-y-2">
            {aiStats.gemini.totalTokens > 0 && (
              <div className="bg-orange-50 rounded px-3 py-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium text-orange-800">
                  <span>Gemini</span>
                  <span className="text-orange-600">
                    {derived.geminiFixes} fixes · {derived.geminiGuidance} guidance
                  </span>
                </div>
                <DetailRow
                  label="Tokens"
                  value={aiStats.gemini.totalTokens.toLocaleString()}
                  sub={`($${aiStats.gemini.estimatedCostUsd.toFixed(4)})`}
                />
              </div>
            )}
            {aiStats.claude.totalTokens > 0 && (
              <div className="bg-purple-50 rounded px-3 py-2 space-y-1">
                <div className="flex items-center justify-between text-xs font-medium text-purple-800">
                  <span>Claude</span>
                  <span className="text-purple-600">
                    {derived.claudeFixes} fixes · {derived.claudeGuidance} guidance
                  </span>
                </div>
                <DetailRow
                  label="Tokens"
                  value={aiStats.claude.totalTokens.toLocaleString()}
                  sub={`($${aiStats.claude.estimatedCostUsd.toFixed(4)})`}
                />
              </div>
            )}
            <div className="border-t border-gray-200 pt-1">
              <DetailRow
                label="Total"
                value={aiStats.totalTokens.toLocaleString()}
                sub={`($${aiStats.totalCostUsd.toFixed(4)})`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex gap-4 items-start px-6 py-4 bg-gray-50 border-b border-gray-200">
      <StatsCard
        title="Auto Tag"
        icon={autoTagIcon}
        expanded={expanded.autoTag}
        onToggle={() => toggle('autoTag')}
        summary={autoTagSummary}
        accentColor="#22c55e"
      >
        {autoTagDetail}
      </StatsCard>

      <StatsCard
        title="Issues"
        icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
        expanded={expanded.issues}
        onToggle={() => toggle('issues')}
        summary={issuesSummary}
        accentColor="#ef4444"
      >
        {issuesDetail}
      </StatsCard>

      <StatsCard
        title="AI Analysis"
        icon={<Sparkles className="h-4 w-4 text-purple-600" />}
        expanded={expanded.ai}
        onToggle={() => toggle('ai')}
        summary={aiSummary}
        accentColor="#a855f7"
      >
        {aiDetail}
      </StatsCard>
    </div>
  );
}
