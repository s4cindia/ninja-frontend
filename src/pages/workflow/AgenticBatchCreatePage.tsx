import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Upload, X, FileText, Bot, AlertTriangle, Loader2, Play } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { filesService } from '@/services/files.service';
import { workflowService, BatchAutoApprovalPolicy, BatchGatePolicy } from '@/services/workflowService';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/api';

type ErrorStrategy = 'pause-batch' | 'continue-others' | 'fail-batch';

const GATES: { key: keyof BatchAutoApprovalPolicy['gates']; label: string }[] = [
  { key: 'AI_REVIEW',          label: 'AI Review' },
  { key: 'REMEDIATION_REVIEW', label: 'Remediation Review' },
  { key: 'CONFORMANCE_REVIEW', label: 'Conformance Review' },
  { key: 'ACR_SIGNOFF',        label: 'ACR Sign-off' },
];

export function AgenticBatchCreatePage() {
  const navigate = useNavigate();

  const [batchName, setBatchName]     = useState('');
  const [files, setFiles]             = useState<File[]>([]);
  const [gatePolicies, setGatePolicies] = useState<Record<string, BatchGatePolicy>>({
    AI_REVIEW:          'auto-accept',
    REMEDIATION_REVIEW: 'require-manual',
    CONFORMANCE_REVIEW: 'require-manual',
    ACR_SIGNOFF:        'require-manual',
  });
  const [errorStrategy, setErrorStrategy] = useState<ErrorStrategy>('continue-others');
  const [submitting, setSubmitting]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const onDrop = useCallback((accepted: File[]) => {
    const epubs = accepted.filter(f => f.name.toLowerCase().endsWith('.epub'));
    if (epubs.length !== accepted.length) toast.error('Only EPUB files are supported');
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...epubs.filter(f => !existing.has(f.name))];
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/epub+zip': ['.epub'] },
    multiple: true,
    disabled: submitting,
    maxSize: 100 * 1024 * 1024,
    onDropRejected: rejections => {
      rejections.forEach(r => {
        if (r.errors[0]?.code === 'file-too-large')
          toast.error(`${r.file.name}: exceeds 100 MB limit`);
        else
          toast.error(`${r.file.name}: invalid file type`);
      });
    },
  });

  const toggleGate = (key: string) => {
    setGatePolicies(prev => ({
      ...prev,
      [key]: prev[key] === 'auto-accept' ? 'require-manual' : 'auto-accept',
    }));
  };

  const allAutoAccept = Object.values(gatePolicies).every(v => v === 'auto-accept');

  // Proactively refresh the access token before uploading files.
  // Avoids relying on the Axios retry interceptor for FormData requests.
  const ensureFreshToken = async (): Promise<boolean> => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) { logout(); return false; }
    try {
      const res = await axios.post('/api/v1/auth/refresh', { refreshToken });
      const { accessToken: newAccess, refreshToken: newRefresh } = res.data.data;
      setTokens(newAccess, newRefresh);
      api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
      return true;
    } catch {
      logout();
      return false;
    }
  };

  const handleSubmit = async () => {
    if (files.length === 0) { toast.error('Add at least one EPUB file'); return; }
    if (!batchName.trim()) { toast.error('Batch name is required'); return; }

    // Proactively refresh token before starting uploads to avoid mid-upload 401s
    const ok = await ensureFreshToken();
    if (!ok) { toast.error('Session expired — please log in again'); return; }

    setSubmitting(true);
    const fileIds: string[] = [];

    try {
      // Step 1: upload each file individually
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading file ${i + 1} of ${files.length}: ${files[i].name}`);
        console.log(`[AgenticBatch] Uploading file ${i + 1}/${files.length}: ${files[i].name}`);
        const uploaded = await filesService.upload(files[i]);
        console.log(`[AgenticBatch] File uploaded, id=${uploaded.id}`);
        fileIds.push(uploaded.id);
      }

      // Step 2: create the agentic batch
      setUploadProgress('Creating batch workflow…');
      console.log('[AgenticBatch] Creating batch with fileIds:', fileIds);
      const policy: BatchAutoApprovalPolicy = {
        gates: gatePolicies as BatchAutoApprovalPolicy['gates'],
        onError: errorStrategy,
      };

      const result = await workflowService.startBatch(
        batchName.trim(),
        fileIds,
        2,
        policy
      );

      toast.success(`Batch started — ${result.workflowCount} workflow(s) queued`);
      navigate(`/workflow/batch/${result.batchId}`);
    } catch (err: unknown) {
      console.error('[AgenticBatch] Submit failed:', err);
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.error
        || axiosErr?.response?.data?.message
        || axiosErr?.message
        || 'Failed to create batch';
      const status = axiosErr?.response?.status ? ` (${axiosErr.response.status})` : '';
      toast.error(`${msg}${status}`, { duration: 8000 });
    } finally {
      setSubmitting(false);
      setUploadProgress('');
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">New Agentic Batch</h1>
        <p className="mt-1 text-sm text-gray-600">
          Upload EPUB files and configure per-gate approval policy. The workflow runs
          automatically and pauses only at gates you mark as manual.
        </p>
      </div>

      {/* Batch name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Batch Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={batchName}
          onChange={e => setBatchName(e.target.value)}
          disabled={submitting}
          placeholder="e.g., Q2 2026 EPUB Batch"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
        />
      </div>

      {/* File upload zone */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Files</label>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-gray-400'}
            ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
          <p className="text-sm font-medium text-gray-700">
            {isDragActive ? 'Drop EPUB files here' : 'Drag & drop EPUB files, or click to browse'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Max 100 MB per file</p>
        </div>

        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-md border border-gray-200">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{f.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{formatSize(f.size)}</span>
                </div>
                <button
                  onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                  disabled={submitting}
                  className="ml-2 text-gray-400 hover:text-red-500 disabled:opacity-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Auto-approval policy */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Auto-Approval Policy</h2>
        </div>

        <p className="text-xs text-gray-500">
          Toggle each gate on (green = Auto) to let the machine approve automatically,
          or off (gray = Manual) to pause and wait for human review.
        </p>

        <div className="space-y-3">
          {GATES.map(({ key, label }) => {
            const isAuto = gatePolicies[key] === 'auto-accept';
            return (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {isAuto ? 'Machine approves automatically — no human review' : 'Workflow pauses and waits for human decision'}
                  </p>
                </div>
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <span className={`text-xs font-medium ${isAuto ? 'text-gray-400' : 'text-gray-700'}`}>
                    Manual
                  </span>
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isAuto}
                      onChange={() => toggleGate(key)}
                      disabled={submitting}
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors duration-200
                      ${isAuto ? 'bg-green-500' : 'bg-gray-300'}
                      ${submitting ? 'opacity-50' : ''}`}
                    />
                    <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
                      ${isAuto ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </div>
                  <span className={`text-xs font-medium ${isAuto ? 'text-green-600' : 'text-gray-400'}`}>
                    Auto
                  </span>
                </label>
              </div>
            );
          })}
        </div>

        {allAutoAccept && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-700">
              All gates are set to auto-accept. The batch will run fully headless with no
              human review. Ensure your tenant settings allow fully headless batches.
            </p>
          </div>
        )}

        {/* Error strategy */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            On workflow error
          </label>
          <select
            value={errorStrategy}
            onChange={e => setErrorStrategy(e.target.value as ErrorStrategy)}
            disabled={submitting}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
          >
            <option value="continue-others">Continue other files (recommended)</option>
            <option value="pause-batch">Pause entire batch</option>
            <option value="fail-batch">Cancel entire batch</option>
          </select>
        </div>
      </div>

      {/* Upload progress */}
      {submitting && uploadProgress && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          {uploadProgress}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <span className="text-sm text-gray-500">
          {files.length} file{files.length !== 1 ? 's' : ''} selected
        </span>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate(-1)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || files.length === 0}>
            {submitting
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Starting…</>
              : <><Play className="h-4 w-4 mr-2" /> Start Agentic Batch</>}
          </Button>
        </div>
      </div>
    </div>
  );
}
