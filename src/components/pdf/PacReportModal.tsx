/**
 * PAC Report Modal
 *
 * Displays a Matterhorn Protocol 1.1 compliance report as a 31-checkpoint
 * colour-coded grid. Each checkpoint shows its overall status and can be
 * expanded to reveal individual condition results.
 *
 * Matterhorn Coverage Plan — Step 5 (frontend)
 */

import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/Tabs';
import { Loader2, CheckCircle2, XCircle, AlertTriangle, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { getPacReport, runLivePacCheck, getAxes4QuotaStatus } from '../../services/pac-report.service';
import type {
  PacReport,
  PacCheckpointResult,
  PacCheckpointStatus,
  PacConditionStatus,
  Axes4LiveResult,
  Axes4QuotaStatus,
  Axes4Failure,
} from '../../services/pac-report.service';
import { SourceBadge } from '../audit';

// ─── Status helpers ───────────────────────────────────────────────────────────

const CHECKPOINT_COLORS: Record<PacCheckpointStatus, string> = {
  PASS: 'bg-green-50 border-green-200 text-green-800',
  FAIL: 'bg-red-50 border-red-200 text-red-800',
  UNTESTED: 'bg-amber-50 border-amber-200 text-amber-800',
  HUMAN_REQUIRED: 'bg-gray-50 border-gray-200 text-gray-600',
};

const CONDITION_COLORS: Record<PacConditionStatus, string> = {
  PASS: 'text-green-700',
  FAIL: 'text-red-700 font-medium',
  UNTESTED: 'text-amber-700',
  HUMAN_REQUIRED: 'text-gray-500',
  NOT_APPLICABLE: 'text-gray-400',
};

const CHECKPOINT_ICON: Record<PacCheckpointStatus, React.ReactNode> = {
  PASS: <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />,
  FAIL: <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />,
  UNTESTED: <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />,
  HUMAN_REQUIRED: <HelpCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />,
};

function statusLabel(status: PacCheckpointStatus | PacConditionStatus): string {
  switch (status) {
    case 'PASS': return 'PASS';
    case 'FAIL': return 'FAIL';
    case 'UNTESTED': return 'UNTESTED';
    case 'HUMAN_REQUIRED': return 'HUMAN';
    case 'NOT_APPLICABLE': return 'N/A';
    default: return status;
  }
}

// ─── Checkpoint row ───────────────────────────────────────────────────────────

function CheckpointRow({ cp }: { cp: PacCheckpointResult }) {
  const [expanded, setExpanded] = useState(cp.status === 'FAIL');

  return (
    <div className={`border rounded-md overflow-hidden ${CHECKPOINT_COLORS[cp.status]}`}>
      <button
        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:opacity-80 transition-opacity"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
          : <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
        }
        {CHECKPOINT_ICON[cp.status]}
        <span className="text-xs font-semibold w-6 flex-shrink-0">CP{cp.id}</span>
        <span className="text-xs flex-1 truncate">{cp.title}</span>
        <span className="text-xs font-mono flex-shrink-0 opacity-70">{statusLabel(cp.status)}</span>
      </button>

      {expanded && (
        <div className="border-t border-current border-opacity-10 px-3 py-2 space-y-1 bg-white bg-opacity-60">
          {cp.conditions.map((cond) => (
            <div key={cond.id} className="flex items-start gap-2 text-xs">
              <span className={`font-mono flex-shrink-0 w-14 ${CONDITION_COLORS[cond.status]}`}>
                {cond.id}
              </span>
              <span className={`flex-1 ${CONDITION_COLORS[cond.status]}`}>
                {cond.description}
              </span>
              {cond.source && (
                <SourceBadge source={cond.source} className="flex-shrink-0" />
              )}
              <span className={`font-mono flex-shrink-0 ${CONDITION_COLORS[cond.status]}`}>
                {statusLabel(cond.status)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary bar ─────────────────────────────────────────────────────────────

function SummaryBar({ report }: { report: PacReport }) {
  const { summary } = report;
  return (
    <div className="grid grid-cols-5 gap-2 text-center text-xs mb-4">
      <div className="bg-green-50 border border-green-200 rounded p-2">
        <div className="text-lg font-bold text-green-700">{summary.pass}</div>
        <div className="text-green-600">PASS</div>
      </div>
      <div className="bg-red-50 border border-red-200 rounded p-2">
        <div className="text-lg font-bold text-red-700">{summary.fail}</div>
        <div className="text-red-600">FAIL</div>
      </div>
      <div className="bg-amber-50 border border-amber-200 rounded p-2">
        <div className="text-lg font-bold text-amber-700">{summary.untested}</div>
        <div className="text-amber-600">UNTESTED</div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-2">
        <div className="text-lg font-bold text-gray-600">{summary.humanRequired}</div>
        <div className="text-gray-500">HUMAN</div>
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-2">
        <div className="text-lg font-bold text-gray-400">{summary.notApplicable}</div>
        <div className="text-gray-400">N/A</div>
      </div>
    </div>
  );
}

// ─── axes4 Live Check tab ──────────────────────────────────────────────────────

function fmtResetDate(iso: string | null): string {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function Axes4FailureRow({ failure }: { failure: Axes4Failure }) {
  return (
    <div className="flex items-start gap-2 text-xs border-b border-gray-100 py-1.5 last:border-b-0">
      <span className="font-mono flex-shrink-0 w-40 truncate text-gray-700" title={failure.checkId}>
        {failure.checkId}
      </span>
      <span className="flex-1 text-gray-600">{failure.description}</span>
      <span className="flex-shrink-0 w-24 text-right text-gray-400">
        {failure.pageNumber != null ? `Page ${failure.pageNumber}` : 'Document-level'}
      </span>
      <span className="flex-shrink-0 w-8 text-right font-mono text-gray-500">
        {failure.count > 1 ? `×${failure.count}` : ''}
      </span>
    </div>
  );
}

/**
 * result/isRunning/error are owned by the parent PacReportModal, not this
 * panel — TabsContent unmounts inactive tabs (src/components/ui/Tabs.tsx),
 * so state living here would be discarded on every tab switch. That would
 * both lose a result the operator never got to see and, worse, reset
 * isRunning on remount while the original (paid) request was still in
 * flight server-side, letting a second billable run start before the first
 * one even finished.
 */
function Axes4LiveCheckPanel({
  quota,
  result,
  isRunning,
  error,
  onRun,
}: {
  quota: Axes4QuotaStatus | null;
  result: Axes4LiveResult | null;
  isRunning: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const atQuotaLimit = !!quota && quota.pagesUsedThisPeriod >= quota.pagesLimitThisPeriod;

  return (
    <div>
      {quota && (
        <p className="text-xs text-gray-500 mb-2">
          {quota.pagesUsedThisPeriod} of {quota.pagesLimitThisPeriod} pages used this period
          {' · '}resets {fmtResetDate(quota.periodResetAt)}
        </p>
      )}
      <p className="text-xs text-gray-400 italic mb-3">
        Uses real axes4 page quota. Can take up to a few minutes.
      </p>

      <Button
        variant="outline"
        size="sm"
        onClick={onRun}
        disabled={!quota || isRunning || atQuotaLimit}
        title={atQuotaLimit ? `Monthly page quota exhausted — resets ${fmtResetDate(quota?.periodResetAt ?? null)}.` : undefined}
      >
        {isRunning
          ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Running live axes4 PAC Cloud check — this can take a minute or two…</>
          : 'Run Live Check'
        }
      </Button>

      {error && (
        <div className="mt-4 py-4 text-center text-red-600 text-sm">{error}</div>
      )}

      {result && !error && (
        result.ran ? (
          <div className="mt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-center">
                <div className="text-lg font-bold text-blue-700">{result.uaIndex?.toFixed(1) ?? '--'}</div>
                <div className="text-xs text-blue-600">UA Index</div>
              </div>
              {result.source && (
                <span className="text-xs text-gray-400">
                  Checked the {result.source} file.
                </span>
              )}
            </div>
            {result.failures.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No failures reported.</p>
            ) : (
              <div className="space-y-0">
                {result.failures.map((f, i) => (
                  <Axes4FailureRow key={`${f.checkId}-${i}`} failure={f} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="mt-4 py-4 text-center text-gray-500 text-sm">
            This check could not complete. The document may have exceeded axes4's limits,
            or the service may be temporarily unavailable.
          </div>
        )
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface PacReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  /** Called once the report has successfully loaded/generated (fires each open, not just the first). */
  onGenerated?: () => void;
}

export function PacReportModal({ isOpen, onClose, jobId, onGenerated }: PacReportModalProps) {
  const [report, setReport] = useState<PacReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quota is cheap/free to check (unlike actually running a live check), so
  // this fetches on open regardless of which tab is active — needed to
  // decide whether to show the axes4 tab trigger at all (hidden entirely
  // when not configured, never just a disabled dead control).
  const [axes4Quota, setAxes4Quota] = useState<Axes4QuotaStatus | null>(null);
  // Guards against two quota fetches resolving out of order (the open-effect
  // fetch and a post-run refetch could both be in flight at once) — only the
  // most recently STARTED request's response is ever applied, same pattern
  // as PdfAuditResultsPage's aiFetchRequestIdRef/aiFetchAppliedIdRef.
  const axes4QuotaRequestIdRef = useRef(0);
  const axes4QuotaAppliedIdRef = useRef(0);
  const fetchAxes4Quota = () => {
    const requestId = ++axes4QuotaRequestIdRef.current;
    getAxes4QuotaStatus()
      .then((q) => {
        if (requestId <= axes4QuotaAppliedIdRef.current) return;
        axes4QuotaAppliedIdRef.current = requestId;
        setAxes4Quota(q);
      })
      .catch(() => {
        if (requestId <= axes4QuotaAppliedIdRef.current) return;
        axes4QuotaAppliedIdRef.current = requestId;
        // Clear rather than leave a stale value showing — a formerly-
        // configured environment must not keep exposing the paid-run
        // control, and a stale exhausted quota must not keep blocking a
        // now-valid run, just because this particular refresh failed.
        setAxes4Quota(null);
      });
  };
  useEffect(() => {
    if (!isOpen) return;
    setAxes4Quota(null);
    fetchAxes4Quota();
  }, [isOpen]);

  // Lifted out of Axes4LiveCheckPanel — TabsContent unmounts inactive tabs,
  // so result/isRunning/error must live here or switching away mid-request
  // and back would both lose the result and (far worse) let a second,
  // separately-billed request start while the first was still in flight.
  const [axes4Result, setAxes4Result] = useState<Axes4LiveResult | null>(null);
  const [isAxes4Running, setIsAxes4Running] = useState(false);
  const [axes4Error, setAxes4Error] = useState<string | null>(null);
  const handleRunAxes4Live = async () => {
    if (isAxes4Running) return;
    setIsAxes4Running(true);
    setAxes4Error(null);
    try {
      const r = await runLivePacCheck(jobId);
      setAxes4Result(r);
      if (r.ran) fetchAxes4Quota();
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        setAxes4Error('axes4 live check rate limit reached — try again in about a minute.');
      } else {
        setAxes4Error(err instanceof Error ? err.message : 'Failed to run live axes4 check.');
      }
    } finally {
      setIsAxes4Running(false);
    }
  };

  // Read via a ref rather than a dependency, so a parent passing an inline
  // callback doesn't re-trigger the fetch below on every render. Updated in
  // a committed effect (not during render) so a discarded render can't leave
  // the fetch effect below holding a callback from work that never landed.
  const onGeneratedRef = useRef(onGenerated);
  useEffect(() => {
    onGeneratedRef.current = onGenerated;
  });

  useEffect(() => {
    if (!isOpen || !jobId) return;
    // Guard against a stale response (close/reopen or jobId change) overwriting
    // current state once an earlier request resolves late.
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    getPacReport(jobId)
      .then((r) => { if (!cancelled) { setReport(r); onGeneratedRef.current?.(); } })
      .catch((err: unknown) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Failed to load PAC report';
        setError(msg);
      })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, jobId]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Matterhorn Protocol 1.1 Compliance Report</DialogTitle>
          <DialogDescription>
            {report
              ? `${report.fileName} · ${report.summary.total} conditions across 31 checkpoints`
              : 'PDF/UA-1 accessibility compliance assessment'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          <Tabs defaultValue="ninja">
            <TabsList>
              <TabsTrigger value="ninja">Ninja Report</TabsTrigger>
              {axes4Quota?.configured && (
                <TabsTrigger value="axes4">axes4 Live Check</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="ninja">
              {isLoading && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Generating report…
                </div>
              )}

              {error && (
                <div className="py-8 text-center text-red-600 text-sm">{error}</div>
              )}

              {report && !isLoading && (
                <>
                  <SummaryBar report={report} />

                  <div className="space-y-1.5">
                    {report.checkpoints.map((cp) => (
                      <CheckpointRow key={cp.id} cp={cp} />
                    ))}
                  </div>

                  <p className="mt-4 text-xs text-gray-400 italic text-center">
                    UNTESTED conditions are not confirmed passing. This report does not constitute
                    full PDF/UA-1 certification.
                  </p>
                </>
              )}
            </TabsContent>

            {axes4Quota?.configured && (
              <TabsContent value="axes4">
                <Axes4LiveCheckPanel
                  quota={axes4Quota}
                  result={axes4Result}
                  isRunning={isAxes4Running}
                  error={axes4Error}
                  onRun={handleRunAxes4Live}
                />
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
