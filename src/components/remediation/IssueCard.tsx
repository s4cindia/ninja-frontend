import { useState } from 'react';
import toast from 'react-hot-toast';
import { Zap, CheckCircle, AlertTriangle, FileText, ExternalLink, ChevronDown, ChevronUp, HelpCircle, Wrench, User, Sparkles, Info, Loader2, ShieldAlert } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/utils/cn';
import { Tooltip } from '../ui/Tooltip';
import { api } from '@/services/api';
import type { PdfAuditIssue } from '@/types/pdf.types';

export interface AiAnalysis {
  id: string;
  jobId: string;
  issueId: string;
  suggestionType: string;
  value: string | null;
  guidance: string | null;
  confidence: number;
  rationale: string;
  model: string;
  applyMode: 'apply-to-pdf' | 'guidance-only' | 'auto-resolve';
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  requiresManualReview?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface IssueExplanation {
  fixType: 'auto' | 'quickfix' | 'manual';
  reason: string;
  whatPlatformDid: string | null;
  whatUserMustDo: string | null;
  wcagGuidance: string;
  estimatedTime: string | null;
}

// EPUB/Generic Audit Issue
interface AuditIssue {
  id: string;
  code: string;
  message: string;
  severity: string;
  confidence?: number;
  fixType?: 'autofix' | 'quickfix' | 'manual';
  status: string;
  location?: string;
  filePath?: string;
  source?: string;
}

// Type guard to check if issue is a PDF issue
function isPdfIssue(issue: AuditIssue | PdfAuditIssue): issue is PdfAuditIssue {
  return 'matterhornCheckpoint' in issue || 'pageNumber' in issue || 'ruleId' in issue;
}

interface IssueCardProps {
  issue: AuditIssue | PdfAuditIssue;
  className?: string;
  onClick?: () => void;
  onPageClick?: (pageNumber: number) => void;
  showMatterhorn?: boolean;
  jobId?: string;
  pageLabels?: string[];
  aiSuggestion?: AiAnalysis;
  onAiSuggestionChange?: (updated: AiAnalysis) => void;
  issueNumber?: number;
}

export function IssueCard({
  issue,
  className,
  onClick,
  onPageClick,
  showMatterhorn = false,
  jobId,
  pageLabels,
  aiSuggestion,
  onAiSuggestionChange,
  issueNumber,
}: IssueCardProps) {
  const isPdf = isPdfIssue(issue);
  const [explanationOpen, setExplanationOpen] = useState(false);
  const [editedValue, setEditedValue] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: async (status: 'approved' | 'rejected') => {
      if (!jobId || !aiSuggestion) throw new Error('Missing jobId or suggestion');
      const res = await api.patch<{ data: AiAnalysis }>(
        `/pdf/${jobId}/ai-analysis/${aiSuggestion.issueId}`,
        { status }
      );
      return res.data.data;
    },
    onSuccess: (updated) => {
      onAiSuggestionChange?.(updated);
      queryClient.invalidateQueries({ queryKey: ['ai-analysis', jobId] });
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      toast.error(message);
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!jobId || !aiSuggestion) throw new Error('Missing jobId or suggestion');
      const body = editedValue !== null ? { value: editedValue } : undefined;
      const res = await api.post<{ data: AiAnalysis }>(
        `/pdf/${jobId}/ai-analysis/${aiSuggestion.issueId}/apply`,
        body
      );
      return res.data.data;
    },
    onSuccess: () => {
      onAiSuggestionChange?.({ ...aiSuggestion!, status: 'applied' });
      queryClient.invalidateQueries({ queryKey: ['ai-analysis', jobId] });
      toast.success('Fix applied to PDF');
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to apply fix';
      toast.error(message);
    },
  });
  // PDF issues may arrive with `code` (backend) or `ruleId` (type definition) — handle both
  const issueCode = isPdf
    ? (issue as PdfAuditIssue).ruleId || (issue as unknown as { code?: string }).code
    : (issue as AuditIssue).code;

  const { data: explanation, isLoading: explanationLoading, isError: explanationError } = useQuery<IssueExplanation>({
    queryKey: ['issue-explanation', jobId, issueCode],
    queryFn: async () => {
      const res = await api.get<{ data: IssueExplanation }>(
        `/jobs/${jobId}/issues/${encodeURIComponent(issueCode ?? '')}/explanation`
      );
      return res.data.data;
    },
    enabled: explanationOpen && !!jobId && !!issueCode,
    staleTime: 60 * 60 * 1000,
  });

  const getExplanationToggleLabel = () => {
    const fixType = !isPdf && 'fixType' in issue ? issue.fixType : undefined;
    if (fixType === 'autofix') return 'What was auto-fixed?';
    if (fixType === 'quickfix') return 'Why quick-fix?';
    return 'Why manual?';
  };
  const getConfidenceBadge = () => {
    // Only show confidence for non-PDF issues (AuditIssue type)
    if (isPdf || !('confidence' in issue) || !issue.confidence) return null;

    const percentage = Math.round(issue.confidence * 100);

    if (issue.confidence >= 0.95) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
          <CheckCircle size={12} />
          <span>{percentage}% confident</span>
        </div>
      );
    } else if (issue.confidence >= 0.70) {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
          <AlertTriangle size={12} />
          <span>{percentage}% confident</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
          <span>{percentage}% confident</span>
        </div>
      );
    }
  };

  const getFixTypeBadge = () => {
    // Only show fix type for non-PDF issues (AuditIssue type)
    if (isPdf || !('fixType' in issue) || !('status' in issue)) return null;

    if (issue.status === 'fixed' && issue.fixType === 'autofix') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          <Zap size={12} />
          <span>Auto-Fixed</span>
        </div>
      );
    } else if (issue.fixType === 'autofix') {
      return (
        <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
          <Zap size={12} />
          <span>Auto-Fix</span>
        </div>
      );
    } else if (issue.fixType === 'quickfix') {
      return (
        <div className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs">
          Quick Fix
        </div>
      );
    } else {
      return (
        <div className="px-2 py-1 bg-gray-50 text-gray-700 rounded text-xs">
          Manual
        </div>
      );
    }
  };

  const getSeverityStyles = () => {
    switch (issue.severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'serious':
        return 'border-orange-200 bg-orange-50';
      case 'moderate':
        return 'border-yellow-200 bg-yellow-50';
      case 'minor':
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  return (
    <div
      id={`issue-card-${issue.id}`}
      className={cn(
        'border rounded-lg p-4 transition-colors',
        getSeverityStyles(),
        onClick && 'cursor-pointer hover:brightness-95',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {isPdf && (
              <FileText className="h-4 w-4 text-red-600 flex-shrink-0" aria-label="PDF issue" />
            )}
            {issueNumber !== undefined && (
              <span className="font-mono text-xs text-gray-400 tabular-nums">#{issueNumber}</span>
            )}
            <span className="font-medium text-gray-900">
              {issueCode}
            </span>
            <span className={cn(
              'px-2 py-0.5 text-xs font-medium rounded-full',
              issue.severity === 'critical' && 'bg-red-100 text-red-700',
              issue.severity === 'serious' && 'bg-orange-100 text-orange-700',
              issue.severity === 'moderate' && 'bg-yellow-100 text-yellow-700',
              issue.severity === 'minor' && 'bg-blue-100 text-blue-700'
            )}>
              {issue.severity}
            </span>

            {/* Matterhorn Checkpoint Badge */}
            {isPdf && showMatterhorn && (issue as PdfAuditIssue).matterhornCheckpoint && (
              <Tooltip
                id={`matterhorn-${issue.id}`}
                content="Matterhorn Protocol Checkpoint"
                position="top"
              >
                <a
                  href={`https://www.pdfa.org/resource/the-matterhorn-protocol/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium hover:bg-purple-200 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span>{(issue as PdfAuditIssue).matterhornCheckpoint}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Tooltip>
            )}

            {/* Page Number Badge */}
            {isPdf && (issue as PdfAuditIssue).pageNumber && (
              <button
                type="button"
                className={cn(
                  'px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium',
                  onPageClick && 'hover:bg-gray-200 transition-colors cursor-pointer',
                  !onPageClick && 'cursor-default'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPageClick && (issue as PdfAuditIssue).pageNumber) {
                    onPageClick((issue as PdfAuditIssue).pageNumber!);
                  }
                }}
                disabled={!onPageClick}
              >
                {(() => {
                  const pn = (issue as PdfAuditIssue).pageNumber!;
                  const label = pageLabels?.[pn - 1];
                  return label ? `Page ${pn} (${label})` : `Page ${pn}`;
                })()}
              </button>
            )}
          </div>
          <h3 className="text-sm text-gray-700">{issue.message}</h3>
          {!isPdf && ((issue as AuditIssue).location || (issue as AuditIssue).filePath) && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {(issue as AuditIssue).location || (issue as AuditIssue).filePath}
            </p>
          )}
          {isPdf && (issue as PdfAuditIssue).elementPath && (
            <p className="text-xs text-gray-500 mt-1 font-mono">
              {(issue as PdfAuditIssue).elementPath}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0 ml-2">
          {!isPdf && getFixTypeBadge()}
          {!isPdf && getConfidenceBadge()}
        </div>
      </div>

      {/* AI Suggestion Panel */}
      {aiSuggestion && (
        <div
          className="mt-3 border-t border-current/10 pt-3"
          onClick={(e) => e.stopPropagation()}
        >
          {aiSuggestion.requiresManualReview ? (
            <div className="flex items-start gap-2 p-2 bg-amber-50 rounded border border-amber-200 text-xs">
              <ShieldAlert size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-amber-800">Manual Review Required</span>
                <p className="text-amber-700 mt-0.5 leading-relaxed">
                  {aiSuggestion.guidance || 'This issue requires a subject matter expert to review and remediate.'}
                </p>
              </div>
            </div>
          ) : aiSuggestion.applyMode === 'auto-resolve' ? (
            <div className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200 text-xs">
              <CheckCircle size={13} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-green-800">AI Auto-Resolved: </span>
                <span className="text-green-700">{aiSuggestion.rationale}</span>
              </div>
            </div>
          ) : aiSuggestion.applyMode === 'guidance-only' ? (
            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded border border-blue-200 text-xs">
              <Info size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-blue-800">AI Guidance</span>
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                    {Math.round(aiSuggestion.confidence * 100)}%
                  </span>
                </div>
                <p className="text-blue-700 leading-relaxed">{aiSuggestion.guidance || aiSuggestion.rationale}</p>
              </div>
            </div>
          ) : (
            /* apply-to-pdf mode */
            <div className="p-2 bg-purple-50 rounded border border-purple-200 text-xs">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-purple-600" />
                  <span className="font-medium text-purple-800">AI Suggestion</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded',
                    aiSuggestion.confidence >= 0.90 ? 'bg-green-100 text-green-700' :
                    aiSuggestion.confidence >= 0.75 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  )}>
                    {Math.round(aiSuggestion.confidence * 100)}%
                  </span>
                </div>
                {aiSuggestion.status === 'applied' ? (
                  <span className="flex items-center gap-1 text-green-700 font-medium">
                    <CheckCircle size={12} /> Applied
                  </span>
                ) : aiSuggestion.status === 'rejected' ? (
                  <span className="text-gray-500 italic">Dismissed</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      className="px-2 py-0.5 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50"
                      disabled={!jobId || applyMutation.isPending || updateStatusMutation.isPending}
                      onClick={() => applyMutation.mutate()}
                    >
                      {applyMutation.isPending ? <><Loader2 size={11} className="animate-spin" /> Applying…</> : 'Apply'}
                    </button>
                    <button
                      type="button"
                      className="px-2 py-0.5 bg-white text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                      disabled={!jobId || applyMutation.isPending || updateStatusMutation.isPending}
                      onClick={() => updateStatusMutation.mutate('rejected')}
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
              {(aiSuggestion.suggestionType === 'alt-text' || aiSuggestion.suggestionType === 'alt-text-improvement') ? (
                <textarea
                  className="w-full text-purple-700 font-mono text-xs leading-relaxed bg-purple-50 border border-purple-200 rounded p-1.5 resize-y focus:outline-none focus:ring-1 focus:ring-purple-400"
                  rows={3}
                  value={editedValue ?? aiSuggestion.value ?? aiSuggestion.guidance ?? ''}
                  onChange={(e) => setEditedValue(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <p className="text-purple-700 leading-relaxed font-mono break-all">
                  {aiSuggestion.value || aiSuggestion.guidance}
                </p>
              )}
              {aiSuggestion.rationale && (
                <p className="text-purple-500 mt-1 italic">{aiSuggestion.rationale}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Explanation panel — only shown when jobId is provided and no AI suggestion */}
      {jobId && !aiSuggestion && (
        <div className="mt-2 border-t border-current/10 pt-2">
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setExplanationOpen(o => !o);
            }}
          >
            <HelpCircle size={13} />
            <span>{getExplanationToggleLabel()}</span>
            {explanationOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>

          {explanationOpen && (
            <div className="mt-2 text-xs space-y-2" onClick={(e) => e.stopPropagation()}>
              {explanationLoading ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                  <div className="h-3 bg-gray-200 rounded w-2/3" />
                </div>
              ) : explanationError ? (
                <p className="text-gray-400 italic">Could not load explanation.</p>
              ) : explanation ? (
                <>
                  {/* Why this fix type */}
                  <p className="text-gray-600 leading-relaxed">{explanation.reason}</p>

                  {/* What the platform did (auto-fix) */}
                  {explanation.whatPlatformDid && (
                    <div className="flex gap-2 p-2 bg-blue-50 rounded border border-blue-100">
                      <Zap size={13} className="text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium text-blue-800">What was fixed: </span>
                        <span className="text-blue-700">{explanation.whatPlatformDid}</span>
                      </div>
                    </div>
                  )}

                  {/* What the user must do (quick/manual) */}
                  {explanation.whatUserMustDo && (
                    <div className="flex gap-2 p-2 bg-amber-50 rounded border border-amber-100">
                      {explanation.fixType === 'quickfix'
                        ? <Wrench size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                        : <User size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      }
                      <div>
                        <span className="font-medium text-amber-800">What to do: </span>
                        <span className="text-amber-700">{explanation.whatUserMustDo}</span>
                      </div>
                    </div>
                  )}

                  {/* Footer: WCAG guidance + time estimate */}
                  <div className="flex items-center justify-between text-gray-400 pt-0.5">
                    <span>{explanation.wcagGuidance}</span>
                    {explanation.estimatedTime && (
                      <span className="text-gray-400">~{explanation.estimatedTime}</span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface AutoFixSummaryProps {
  applied: number;
  total?: number;
  className?: string;
}

export function AutoFixSummary({ applied, total, className }: AutoFixSummaryProps) {
  if (applied <= 0) return null;

  return (
    <div className={cn('bg-blue-50 border border-blue-200 rounded-lg p-4', className)}>
      <div className="flex items-center gap-2 mb-2">
        <Zap className="text-blue-600" size={20} />
        <h3 className="font-semibold text-blue-900">
          {applied} {total ? `of ${total} ` : ''}issues fixed automatically
        </h3>
      </div>
      <p className="text-sm text-blue-800">
        High-confidence issues (95%+) were automatically remediated without requiring your approval.
      </p>
    </div>
  );
}
