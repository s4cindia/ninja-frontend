import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import {
  useComparisonTrial,
  useLogPdfxtData,
  useValidateTrial,
  useDeleteTrial,
  useUpdateAutoModeConfig,
} from '@/hooks/useComparisonStudy';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import { getErrorMessage } from '@/services/api';
import { useJobPolling } from '@/hooks/useJobPolling';
import { PdfJobProgressPanel } from '@/components/pdf/PdfJobProgressPanel';
import type { ComparisonTrialMode } from '@/types/comparisonStudy.types';

type AutoColorContrastModeInput = 'inherit' | 'guidance-only' | 'disabled' | 'apply-to-pdf';

const CONTENT_TYPE_LABELS: Record<string, string> = {
  'text-dominant': 'Text Dominant',
  'table-heavy': 'Table Heavy',
  'figure-heavy': 'Figure Heavy',
  mixed: 'Mixed',
};

/** Accepts "mm:ss", "h:mm:ss", or a plain number of seconds (a raw stopwatch reading). */
function parseTimeToMs(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (trimmed.includes(':')) {
    const parts = trimmed.split(':').map(Number);
    if (parts.some((n) => Number.isNaN(n))) return null;
    if (parts.length === 2) return Math.round((parts[0] * 60 + parts[1]) * 1000);
    if (parts.length === 3) return Math.round((parts[0] * 3600 + parts[1] * 60 + parts[2]) * 1000);
    return null;
  }
  const n = Number(trimmed);
  return Number.isNaN(n) ? null : Math.round(n * 1000);
}

function DeleteTrialDialog({
  onConfirm,
  onCancel,
  isPending,
  error,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
  error: string | null;
}) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-900">Delete Trial</h3>
      <p className="text-sm text-gray-600 mb-4">
        This permanently removes the trial from Comparison Study. The underlying Ninja job and its data are not affected.
      </p>
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <div className="flex gap-3">
        <button
          onClick={onConfirm}
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
        >
          {isPending && <Loader2 className="animate-spin h-4 w-4" />}
          Delete Trial
        </button>
        <button
          onClick={onCancel}
          disabled={isPending}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function ComparisonTrialWorkspacePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: trial, isLoading, refetch: refetchTrial } = useComparisonTrial(id);
  const logPdfxt = useLogPdfxtData(id!);
  const validateTrial = useValidateTrial(id!);
  const deleteTrial = useDeleteTrial(id!);
  const updateAutoModeConfig = useUpdateAutoModeConfig(id!);

  const { status: ninjaJobStatus, data: ninjaJobData, startPolling } = useJobPolling({ interval: 2000 });

  useEffect(() => {
    if (trial?.ninjaJobId && trial?.job?.status && trial.job.status !== 'COMPLETED' && trial.job.status !== 'FAILED') {
      startPolling(trial.ninjaJobId);
    }
  }, [trial?.ninjaJobId, trial?.job?.status, startPolling]);

  useEffect(() => {
    if (ninjaJobStatus === 'COMPLETED' || ninjaJobStatus === 'FAILED') {
      refetchTrial();
    }
  }, [ninjaJobStatus, refetchTrial]);

  // Poll while an Auto Mode run is active so autoStatus/autoRoundsCompleted/
  // autoCostSpentUsd don't go stale if the operator leaves this workspace
  // page open during a run — mirrors the audit results page's own 5s poll
  // for the same status, but this page has no other reason to refetch.
  useEffect(() => {
    if (trial?.autoStatus !== 'running') return;
    const intervalId = setInterval(() => { refetchTrial(); }, 5000);
    return () => clearInterval(intervalId);
  }, [trial?.autoStatus, refetchTrial]);

  const [pdfxtTime, setPdfxtTime] = useState('');
  const [pdfxtPageCount, setPdfxtPageCount] = useState('');
  const [pdfxtCost, setPdfxtCost] = useState('');
  const [pdfxtFile, setPdfxtFile] = useState<File | null>(null);
  const [isUploadingPdfxt, setIsUploadingPdfxt] = useState(false);
  const [pdfxtError, setPdfxtError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Config form state — synced from the trial once loaded (and again if the
  // trial identity changes), not on every refetch, so it doesn't clobber
  // an in-progress edit the moment a background poll refreshes trial data.
  const [autoMode, setAutoMode] = useState<ComparisonTrialMode>('manual');
  const [autoMaxRoundsInput, setAutoMaxRoundsInput] = useState('10');
  const [autoCostLimitInput, setAutoCostLimitInput] = useState('2');
  // 'inherit' represents autoColorContrastMode === null (not explicitly
  // overridden) — distinct from the three real modes, not an empty/unset
  // string, since the backend treats an explicit null PATCH as "revert to
  // inheriting the tenant default" rather than "leave unspecified."
  const [autoColorContrastModeInput, setAutoColorContrastModeInput] = useState<AutoColorContrastModeInput>('inherit');
  const [autoModeError, setAutoModeError] = useState<string | null>(null);
  useEffect(() => {
    if (!trial) return;
    setAutoMode(trial.mode);
    setAutoMaxRoundsInput(String(trial.autoMaxRounds));
    setAutoCostLimitInput(String(trial.autoCostLimitUsd));
    setAutoColorContrastModeInput(trial.autoColorContrastMode ?? 'inherit');
    // Deliberately keyed on trial.id alone — re-syncing on every trial
    // field change (e.g. a background poll refetch) would clobber an
    // in-progress edit the operator hasn't saved yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trial?.id]);

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  if (!trial) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back</Link>
        <div className="text-center py-12 text-gray-400">Trial not found.</div>
      </div>
    );
  }

  const handleSavePdfxtData = async () => {
    setPdfxtError(null);
    const timeMs = parseTimeToMs(pdfxtTime);
    if (pdfxtTime.trim() && timeMs === null) {
      setPdfxtError('Could not parse time — use mm:ss or a plain number of seconds.');
      return;
    }
    const pageCount = pdfxtPageCount.trim() ? Number(pdfxtPageCount) : undefined;
    const costUsd = pdfxtCost.trim() ? Number(pdfxtCost) : undefined;

    try {
      let pdfxtS3Key: string | undefined;
      if (pdfxtFile) {
        setIsUploadingPdfxt(true);
        const { uploadUrl, s3Key } = await comparisonStudyService.getUploadUrl(
          pdfxtFile.name,
          pdfxtFile.type || 'application/pdf'
        );
        const s3Res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': pdfxtFile.type || 'application/pdf' },
          body: pdfxtFile,
        });
        if (!s3Res.ok) throw new Error(`S3 upload failed: ${s3Res.status}`);
        pdfxtS3Key = s3Key;
      }

      logPdfxt.mutate(
        {
          ...(pdfxtS3Key ? { pdfxtS3Key } : {}),
          ...(timeMs !== null ? { pdfxtTimeMs: timeMs } : {}),
          ...(pageCount !== undefined && !Number.isNaN(pageCount) ? { pdfxtPageCount: pageCount } : {}),
          ...(costUsd !== undefined && !Number.isNaN(costUsd) ? { pdfxtCostUsd: costUsd } : {}),
        },
        {
          onError: () => setPdfxtError('Failed to save pdfxt data — please retry.'),
        }
      );
    } catch (err) {
      setPdfxtError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploadingPdfxt(false);
    }
  };

  const handleDeleteTrial = () => {
    setDeleteError(null);
    deleteTrial.mutate(undefined, {
      onSuccess: () => {
        navigate('/comparison-study');
      },
      onError: () => {
        setDeleteError('Failed to delete trial — please retry.');
      },
    });
  };

  const handleSaveAutoModeConfig = () => {
    setAutoModeError(null);
    const maxRounds = Number(autoMaxRoundsInput);
    const costLimit = Number(autoCostLimitInput);
    if (!Number.isInteger(maxRounds) || maxRounds <= 0) {
      setAutoModeError('Max rounds must be a positive whole number.');
      return;
    }
    if (!Number.isFinite(costLimit) || costLimit <= 0) {
      setAutoModeError('Cost limit must be a positive number.');
      return;
    }
    updateAutoModeConfig.mutate(
      {
        mode: autoMode,
        autoMaxRounds: maxRounds,
        autoCostLimitUsd: costLimit,
        autoColorContrastMode: autoColorContrastModeInput === 'inherit' ? null : autoColorContrastModeInput,
      },
      {
        // 409 when mode is changed while a run is actively in progress —
        // surface the real backend message (e.g. "stop the run first")
        // rather than a generic failure.
        onError: (err) => setAutoModeError(getErrorMessage(err)),
      }
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Link to="/comparison-study" className="text-sm text-gray-500 hover:text-gray-700">&larr; Back to Comparison Study</Link>
        <button
          onClick={() => {
            setDeleteError(null);
            setShowDeleteConfirm(true);
          }}
          className="text-xs text-red-600 hover:text-red-800 hover:underline"
        >
          Delete Trial
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{trial.sourceFileName}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {CONTENT_TYPE_LABELS[trial.contentType] ?? trial.contentType} &middot; Status:{' '}
              <span className="font-medium">{trial.status}</span>
              {trial.job && (
                <>
                  {' '}&middot; Ninja job: <span className="font-medium">{trial.job.status}</span>
                </>
              )}
            </p>
          </div>
          <button
            onClick={() => navigate(`/pdf/audit/${trial.ninjaJobId}?comparisonTrialId=${trial.id}`)}
            disabled={!trial.ninjaJobId}
            title={!trial.ninjaJobId ? 'Ninja audit job has not been created yet' : undefined}
            className="shrink-0 px-4 py-2 text-sm font-medium rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {trial.job?.status === 'COMPLETED' ? 'View Ninja Results' : 'Start Ninja Remediation'}
          </button>
        </div>
        {(ninjaJobStatus === 'QUEUED' || ninjaJobStatus === 'PROCESSING') && (
          <div className="mt-4">
            <PdfJobProgressPanel jobData={ninjaJobData} progress={ninjaJobData?.progress ?? 0} />
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-1">Auto Remediation Mode</h3>
        <p className="text-sm text-gray-500 mb-4">
          Manual: drive each analyze/approve/apply/re-audit round by hand from the audit results page.
          Auto: the backend loops on its own until no AI-actionable fixes remain, or a round/cost limit is hit.
        </p>
        <div className="flex items-center gap-4 mb-4">
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="autoMode"
              checked={autoMode === 'manual'}
              onChange={() => setAutoMode('manual')}
              disabled={trial.autoStatus === 'running'}
            />
            Manual
          </label>
          <label className="flex items-center gap-1.5 text-sm cursor-pointer">
            <input
              type="radio"
              name="autoMode"
              checked={autoMode === 'auto'}
              onChange={() => setAutoMode('auto')}
              disabled={trial.autoStatus === 'running'}
            />
            Auto
          </label>
        </div>
        {autoMode === 'auto' && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="auto-max-rounds" className="block text-xs font-medium text-gray-600 mb-1">Max rounds</label>
              <input
                id="auto-max-rounds"
                type="number"
                min={1}
                value={autoMaxRoundsInput}
                onChange={(e) => setAutoMaxRoundsInput(e.target.value)}
                disabled={trial.autoStatus === 'running'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label htmlFor="auto-cost-limit" className="block text-xs font-medium text-gray-600 mb-1">Cost limit (USD)</label>
              <input
                id="auto-cost-limit"
                type="number"
                min={0}
                step="0.01"
                value={autoCostLimitInput}
                onChange={(e) => setAutoCostLimitInput(e.target.value)}
                disabled={trial.autoStatus === 'running'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
              />
            </div>
            <div className="col-span-2">
              <label htmlFor="auto-color-contrast-mode" className="block text-xs font-medium text-gray-600 mb-1">Color-contrast handling</label>
              <select
                id="auto-color-contrast-mode"
                value={autoColorContrastModeInput}
                onChange={(e) => setAutoColorContrastModeInput(e.target.value as AutoColorContrastModeInput)}
                disabled={trial.autoStatus === 'running'}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
              >
                <option value="inherit">Inherit tenant/default</option>
                <option value="guidance-only">Guidance only — flag but never auto-apply</option>
                <option value="disabled">Disabled — skip contrast entirely</option>
                <option value="apply-to-pdf">Auto-apply — let auto mode fix contrast automatically</option>
              </select>
            </div>
          </div>
        )}
        {autoModeError && <p className="text-sm text-red-600 mb-3">{autoModeError}</p>}
        <button
          onClick={handleSaveAutoModeConfig}
          disabled={updateAutoModeConfig.isPending || trial.autoStatus === 'running'}
          title={trial.autoStatus === 'running' ? 'Stop the current run (from the audit results page) before changing config' : undefined}
          className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {updateAutoModeConfig.isPending && <Loader2 className="animate-spin h-4 w-4" />}
          Save
        </button>
        {updateAutoModeConfig.isSuccess && <p className="text-sm text-green-700 mt-2">Saved.</p>}
        {trial.mode === 'auto' && trial.autoStatus && (
          <p className="text-xs text-gray-500 mt-3">
            {trial.autoStatus === 'running'
              ? `Running — round ${trial.autoRoundsCompleted} of ${trial.autoMaxRounds}, $${trial.autoCostSpentUsd.toFixed(2)} of $${trial.autoCostLimitUsd.toFixed(2)} spent.`
              : `Last run: ${trial.autoStopReason ?? 'stopped'} after ${trial.autoRoundsCompleted} round(s), $${trial.autoCostSpentUsd.toFixed(2)} spent.`}
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">pdfxt Data Entry</h3>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Time (mm:ss or seconds)</label>
            <input
              type="text"
              value={pdfxtTime}
              onChange={(e) => setPdfxtTime(e.target.value)}
              placeholder="e.g. 4:32 or 272"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Page Count</label>
            <input
              type="number"
              min={1}
              value={pdfxtPageCount}
              onChange={(e) => setPdfxtPageCount(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cost (USD)</label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={pdfxtCost}
              onChange={(e) => setPdfxtCost(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">pdfxt Output PDF</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdfxtFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-3 file:py-1 file:px-2 file:rounded file:border file:border-gray-300 file:text-xs file:bg-white hover:file:bg-gray-50"
            />
          </div>
        </div>
        {pdfxtError && <p className="text-sm text-red-600 mb-3">{pdfxtError}</p>}
        <button
          onClick={handleSavePdfxtData}
          disabled={isUploadingPdfxt || logPdfxt.isPending}
          className="px-4 py-2 text-sm font-medium rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {(isUploadingPdfxt || logPdfxt.isPending) && <Loader2 className="animate-spin h-4 w-4" />}
          Save pdfxt Data
        </button>
        {logPdfxt.isSuccess && <p className="text-sm text-green-700 mt-2">Saved.</p>}
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-sm font-semibold mb-4">Validation</h3>
        <p className="text-sm text-gray-500 mb-4">
          Runs veraPDF against both the Ninja-remediated and pdfxt outputs — can take a few seconds.
        </p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => validateTrial.mutate()}
            disabled={validateTrial.isPending || trial.status === 'registered'}
            title={trial.status === 'registered' ? 'Log pdfxt data first' : undefined}
            className="px-4 py-2 text-sm font-medium rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {validateTrial.isPending && <Loader2 className="animate-spin h-4 w-4" />}
            Run Validation
          </button>
          {trial.status === 'validated' && (
            <Link
              to={`/comparison-study/trials/${trial.id}/report`}
              className="text-sm font-medium text-teal-700 hover:text-teal-900 hover:underline"
            >
              View Report &rarr;
            </Link>
          )}
        </div>
        {validateTrial.isError && (
          <p className="text-sm text-red-600 mt-3">Validation failed — please retry.</p>
        )}
      </div>

      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-md">
          <DeleteTrialDialog
            onConfirm={handleDeleteTrial}
            onCancel={() => setShowDeleteConfirm(false)}
            isPending={deleteTrial.isPending}
            error={deleteError}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
