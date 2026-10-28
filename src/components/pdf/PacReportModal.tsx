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
import {
  getPacReport,
  runLivePacCheck,
  getAxes4QuotaStatus,
  getJobExternalPacReport,
  uploadJobExternalPacReportFile,
  confirmJobExternalPacReportUpload,
  deleteJobExternalPacReport,
} from '../../services/pac-report.service';
import type {
  PacReport,
  PacCheckpointResult,
  PacCheckpointStatus,
  PacConditionStatus,
  Axes4LiveResult,
  Axes4QuotaStatus,
  Axes4Failure,
  JobExternalPacReport,
  JobExternalPacReportSummary,
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

// ─── External PAC report upload tab ───────────────────────────────────────────
//
// Job-native counterpart to ComparisonTrialReportPage.tsx's own
// ExternalPacReportCard — same upload-a-real-PAC-tool-export-by-hand
// capability, for a regular (non-trial) job. report/isLoading/error/
// isUploading/isDeleting are owned by the parent modal (not this panel) for
// the same reason axes4Result/isAxes4Running live there: TabsContent
// unmounts inactive tabs, and losing track of an in-flight upload/delete on
// a tab switch would be confusing even though (unlike axes4) it isn't a
// billed request. The unsubmitted file/count draft is fine to live locally
// here — losing an unsaved draft on tab switch is normal form behavior, not
// data loss of a completed action.

const EXTERNAL_PAC_SUMMARY_FIELDS: { key: keyof JobExternalPacReportSummary; label: string }[] = [
  { key: 'pass', label: 'Pass' },
  { key: 'fail', label: 'Fail' },
  { key: 'untested', label: 'Untested' },
  { key: 'humanRequired', label: 'Human Required' },
  { key: 'notApplicable', label: 'Not Applicable' },
];

function ExternalPacReportPanel({
  report,
  isLoading,
  error,
  isOwner,
  isUploading,
  isDeleting,
  uploadError,
  onUpload,
  onDelete,
  onRefreshDownload,
}: {
  report: JobExternalPacReport | null;
  isLoading: boolean;
  error: string | null;
  isOwner: boolean;
  isUploading: boolean;
  isDeleting: boolean;
  uploadError: string | null;
  onUpload: (file: File, summary: JobExternalPacReportSummary) => void;
  onDelete: () => void;
  onRefreshDownload: () => Promise<string | null>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [counts, setCounts] = useState<Record<keyof JobExternalPacReportSummary, string>>({
    pass: '', fail: '', untested: '', humanRequired: '', notApplicable: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isRefreshingDownload, setIsRefreshingDownload] = useState(false);

  const handleDownloadClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (isRefreshingDownload) return;
    setIsRefreshingDownload(true);
    try {
      const freshUrl = await onRefreshDownload();
      if (freshUrl) window.location.href = freshUrl;
    } finally {
      setIsRefreshingDownload(false);
    }
  };

  const handleUpload = () => {
    setFormError(null);
    if (!file) {
      setFormError('Choose a PAC report file first.');
      return;
    }
    const summary: JobExternalPacReportSummary = {};
    for (const { key, label } of EXTERNAL_PAC_SUMMARY_FIELDS) {
      const raw = counts[key].trim();
      if (!raw) continue;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        setFormError(`${label} must be a whole number of 0 or more.`);
        return;
      }
      summary[key] = n;
    }
    onUpload(file, summary);
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>;
  }

  if (error) {
    return <div className="py-8 text-center text-red-600 text-sm">{error}</div>;
  }

  if (report) {
    return (
      <div>
        <p className="text-xs text-gray-400 mb-4">{report.originalFileName}</p>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Pass', value: report.pass },
            { label: 'Fail', value: report.fail },
            { label: 'Untested', value: report.untested },
            { label: 'Human Required', value: report.humanRequired },
            { label: 'Not Applicable', value: report.notApplicable },
          ].map((c) => (
            <div key={c.label} className="text-center">
              <p className="text-lg font-bold tabular-nums text-gray-800">{c.value ?? '--'}</p>
              <p className="text-xs text-gray-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <a
            href={report.downloadUrl}
            onClick={handleDownloadClick}
            aria-disabled={isRefreshingDownload}
            className={`text-xs font-medium text-blue-600 hover:text-blue-700 ${isRefreshingDownload ? 'opacity-50 pointer-events-none' : ''}`}
          >
            {isRefreshingDownload ? 'Preparing…' : 'Download'}
          </a>
          {isOwner && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {isDeleting ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!isOwner) {
    return <p className="text-sm text-gray-400 py-8 text-center">No external PAC report has been uploaded for this job.</p>;
  }

  return (
    <div>
      <p className="text-xs text-gray-400 mb-4">
        Upload the real PAC-tool export for this document and enter its summary counts — there's no automated parser, so these are hand-entered.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        <div className="col-span-2 sm:col-span-3">
          <label htmlFor="job-external-pac-report-file" className="block text-xs font-medium text-gray-600 mb-1">PAC Report File</label>
          <input
            id="job-external-pac-report-file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white hover:file:bg-gray-50"
          />
        </div>
        {EXTERNAL_PAC_SUMMARY_FIELDS.map(({ key, label }) => (
          <div key={key}>
            <label htmlFor={`job-external-pac-report-${key}`} className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <input
              id={`job-external-pac-report-${key}`}
              type="number"
              min={0}
              step={1}
              value={counts[key]}
              onChange={(e) => setCounts((prev) => ({ ...prev, [key]: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        ))}
      </div>
      {(formError || uploadError) && <p className="text-sm text-red-600 mb-3">{formError || uploadError}</p>}
      <Button
        variant="outline"
        size="sm"
        onClick={handleUpload}
        disabled={isUploading}
      >
        {isUploading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
        Upload PAC Report
      </Button>
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
  /** Gates upload/delete on the External PAC Report tab — matches the backend's authorizeJob (owner/admin-only) semantics; viewing stays open to anyone who can open this modal. Defaults to false (view-only) so an omitted prop fails closed, not open. */
  isOwner?: boolean;
}

export function PacReportModal({ isOpen, onClose, jobId, onGenerated, isOwner = false }: PacReportModalProps) {
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

  // External PAC Report tab state -- lifted to the modal for the same
  // reason as the axes4 state above (TabsContent unmounts inactive tabs).
  const [externalReport, setExternalReport] = useState<JobExternalPacReport | null>(null);
  const [isExternalLoading, setIsExternalLoading] = useState(false);
  const [externalError, setExternalError] = useState<string | null>(null);
  const [isUploadingExternal, setIsUploadingExternal] = useState(false);
  const [externalUploadError, setExternalUploadError] = useState<string | null>(null);
  const [isDeletingExternal, setIsDeletingExternal] = useState(false);

  const refetchExternalReport = (): Promise<JobExternalPacReport | null> =>
    getJobExternalPacReport(jobId).then((r) => { setExternalReport(r); return r; });

  useEffect(() => {
    if (!isOpen || !jobId) return;
    let cancelled = false;
    setIsExternalLoading(true);
    setExternalError(null);
    getJobExternalPacReport(jobId)
      .then((r) => { if (!cancelled) setExternalReport(r); })
      .catch((err: unknown) => {
        if (cancelled) return;
        setExternalError(err instanceof Error ? err.message : 'Failed to load external PAC report');
      })
      .finally(() => { if (!cancelled) setIsExternalLoading(false); });
    return () => { cancelled = true; };
  }, [isOpen, jobId]);

  const handleUploadExternal = async (file: File, summary: JobExternalPacReportSummary) => {
    setIsUploadingExternal(true);
    setExternalUploadError(null);
    try {
      await uploadJobExternalPacReportFile(jobId, file);
      const report = await confirmJobExternalPacReportUpload(jobId, {
        originalFileName: file.name,
        mimeType: file.type || 'application/pdf',
        summary,
      });
      setExternalReport(report);
    } catch (err) {
      setExternalUploadError(err instanceof Error ? err.message : 'Failed to upload External PAC Report — please retry.');
    } finally {
      setIsUploadingExternal(false);
    }
  };

  const handleDeleteExternal = async () => {
    setIsDeletingExternal(true);
    try {
      await deleteJobExternalPacReport(jobId);
      setExternalReport(null);
    } finally {
      setIsDeletingExternal(false);
    }
  };

  // The presigned URL is generated fresh per fetch, so on a long-lived tab
  // the one baked into externalReport can go stale (S3 403s on click) --
  // refetch right before navigating rather than trusting a URL that may be old.
  const handleRefreshExternalDownload = async (): Promise<string | null> => {
    const fresh = await refetchExternalReport();
    return fresh?.downloadUrl ?? null;
  };

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
              <TabsTrigger value="external">External PAC Report</TabsTrigger>
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

            <TabsContent value="external">
              <ExternalPacReportPanel
                report={externalReport}
                isLoading={isExternalLoading}
                error={externalError}
                isOwner={isOwner}
                isUploading={isUploadingExternal}
                isDeleting={isDeletingExternal}
                uploadError={externalUploadError}
                onUpload={handleUploadExternal}
                onDelete={handleDeleteExternal}
                onRefreshDownload={handleRefreshExternalDownload}
              />
            </TabsContent>
          </Tabs>
        </div>

        <div className="flex justify-end pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
