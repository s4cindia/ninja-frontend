import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Dialog, DialogContent } from '@/components/ui/Dialog';
import { useComparisonTrial, useLogPdfxtData, useValidateTrial, useDeleteTrial } from '@/hooks/useComparisonStudy';
import { comparisonStudyService } from '@/services/comparisonStudy.service';
import { useJobPolling } from '@/hooks/useJobPolling';
import { PdfJobProgressPanel } from '@/components/pdf/PdfJobProgressPanel';

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

  const [pdfxtTime, setPdfxtTime] = useState('');
  const [pdfxtPageCount, setPdfxtPageCount] = useState('');
  const [pdfxtCost, setPdfxtCost] = useState('');
  const [pdfxtFile, setPdfxtFile] = useState<File | null>(null);
  const [isUploadingPdfxt, setIsUploadingPdfxt] = useState(false);
  const [pdfxtError, setPdfxtError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
