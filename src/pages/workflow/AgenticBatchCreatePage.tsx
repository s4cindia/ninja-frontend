import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';
import { Upload, X, FileText, Bot, AlertTriangle, Loader2, Play, ChevronDown, ChevronUp, CheckCircle2, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { filesService } from '@/services/files.service';
import {
  workflowService,
  BatchAutoApprovalPolicy,
  BatchGatePolicy,
  ConditionalGatePolicy,
  GatePolicyMode,
  AcrBatchConfig,
} from '@/services/workflowService';
import { useAuthStore } from '@/stores/auth.store';
import { api } from '@/services/api';
import { tenantConfigService } from '@/services/tenant-config.service';

type ErrorStrategy = 'pause-batch' | 'continue-others' | 'fail-batch';

const GATES: { key: keyof BatchAutoApprovalPolicy['gates']; label: string; description: string }[] = [
  { key: 'AI_REVIEW',          label: 'AI Review',           description: 'Validate AI-identified accessibility issues' },
  { key: 'REMEDIATION_REVIEW', label: 'Remediation Review',  description: 'Confirm auto-remediation results' },
  { key: 'CONFORMANCE_REVIEW', label: 'Conformance Review',  description: 'Review WCAG criterion mapping' },
  { key: 'ACR_SIGNOFF',        label: 'ACR Sign-off',        description: 'Final attestation of accessibility report' },
];

// Issue categories available in issueTypeRules
const ISSUE_CATEGORIES = [
  { value: 'alt-text',          label: 'Alt Text' },
  { value: 'color-contrast',    label: 'Color Contrast' },
  { value: 'heading-hierarchy', label: 'Heading Hierarchy' },
  { value: 'link-text',         label: 'Link Text' },
  { value: 'table-headers',     label: 'Table Headers' },
  { value: 'language',          label: 'Language' },
  { value: 'aria',              label: 'ARIA' },
  { value: 'reading-order',     label: 'Reading Order' },
  { value: 'metadata',          label: 'Metadata' },
  { value: 'duplicate-id',      label: 'Duplicate IDs' },
  { value: 'form-labels',       label: 'Form Labels' },
  { value: 'other',             label: 'Other (catch-all)' },
];

type IssueTypeRule = 'auto-accept' | 'auto-reject' | 'manual';

interface GateConfig {
  mode: GatePolicyMode;
  minConfidence: number;          // 0–100 (UI percentage)
  issueTypeRules: Record<string, IssueTypeRule>;
  showAdvanced: boolean;
}

const DEFAULT_GATE_CONFIG: GateConfig = {
  mode: 'require-manual',
  minConfidence: 80,
  issueTypeRules: {},
  showAdvanced: false,
};

function buildPolicy(gateConfigs: Record<string, GateConfig>, errorStrategy: ErrorStrategy): BatchAutoApprovalPolicy {
  const gates: BatchAutoApprovalPolicy['gates'] = {};

  for (const { key } of GATES) {
    const cfg = gateConfigs[key];
    if (!cfg) continue;

    if (cfg.mode === 'auto-accept' || cfg.mode === 'require-manual') {
      gates[key] = cfg.mode;
    } else {
      // conditional
      const conditions: ConditionalGatePolicy['conditions'] = {};
      if (cfg.minConfidence > 0) conditions.minConfidence = cfg.minConfidence / 100;
      const rules = Object.entries(cfg.issueTypeRules).filter(([, v]) => v !== 'manual');
      if (rules.length > 0) {
        conditions.issueTypeRules = Object.fromEntries(rules) as Record<string, 'auto-accept' | 'auto-reject' | 'manual'>;
      }
      gates[key] = { mode: 'conditional', conditions } as BatchGatePolicy;
    }
  }

  return { gates, onError: errorStrategy };
}

// ---------------------------------------------------------------------------

export function AgenticBatchCreatePage() {
  const navigate = useNavigate();

  const [batchName, setBatchName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [gateConfigs, setGateConfigs] = useState<Record<string, GateConfig>>(() =>
    Object.fromEntries(GATES.map(g => [g.key, { ...DEFAULT_GATE_CONFIG }]))
  );
  const [errorStrategy, setErrorStrategy] = useState<ErrorStrategy>('continue-others');
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');

  // ACR report settings
  const [acrVendor, setAcrVendor] = useState('');
  const [acrEmail, setAcrEmail] = useState('');
  const [acrEdition, setAcrEdition] = useState<AcrBatchConfig['edition']>('VPAT2.5-WCAG');
  const [acrMode, setAcrMode] = useState<AcrBatchConfig['mode']>('individual');
  const [acrAggStrategy, setAcrAggStrategy] = useState<AcrBatchConfig['aggregationStrategy']>('conservative');

  // Tenant setting: whether fully headless batches are permitted
  const [allowFullyHeadless, setAllowFullyHeadless] = useState<boolean>(false);
  const [showHeadlessModal, setShowHeadlessModal] = useState(false);
  const [modalToggleValue, setModalToggleValue] = useState(false);
  const [savingHeadless, setSavingHeadless] = useState(false);
  const headlessDialogRef = useRef<HTMLDivElement>(null);
  const headlessTriggerRef = useRef<HTMLButtonElement>(null);

  // Focus the dialog when it opens; restore focus to trigger on close
  useEffect(() => {
    if (showHeadlessModal) {
      headlessDialogRef.current?.focus();
    } else {
      headlessTriggerRef.current?.focus();
    }
  }, [showHeadlessModal]);

  useEffect(() => {
    tenantConfigService.getWorkflowConfig().then(cfg => {
      setAllowFullyHeadless(cfg.batchPolicy?.allowFullyHeadless ?? false);
    }).catch(() => {
      // silently fall back to false (restrictive)
    });
  }, []);

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

  const setGateMode = (key: string, mode: GatePolicyMode) => {
    setGateConfigs(prev => ({ ...prev, [key]: { ...prev[key], mode } }));
  };

  const setMinConfidence = (key: string, value: number) => {
    setGateConfigs(prev => ({ ...prev, [key]: { ...prev[key], minConfidence: value } }));
  };

  const setIssueTypeRule = (gateKey: string, category: string, rule: IssueTypeRule) => {
    setGateConfigs(prev => ({
      ...prev,
      [gateKey]: {
        ...prev[gateKey],
        issueTypeRules: { ...prev[gateKey].issueTypeRules, [category]: rule },
      },
    }));
  };

  const toggleAdvanced = (key: string) => {
    setGateConfigs(prev => ({
      ...prev,
      [key]: { ...prev[key], showAdvanced: !prev[key].showAdvanced },
    }));
  };

  const openHeadlessModal = () => {
    setModalToggleValue(false);
    setShowHeadlessModal(true);
  };

  const saveHeadlessSetting = async () => {
    setSavingHeadless(true);
    try {
      await tenantConfigService.updateWorkflowConfig({ batchPolicy: { allowFullyHeadless: modalToggleValue } });
      setAllowFullyHeadless(modalToggleValue);
      setShowHeadlessModal(false);
      if (modalToggleValue) {
        toast.success('Fully headless batches enabled for this tenant');
      }
    } catch {
      toast.error('Failed to update tenant setting');
    } finally {
      setSavingHeadless(false);
    }
  };

  const allAutoAccept = Object.values(gateConfigs).every(c => c.mode === 'auto-accept');

  const ensureFreshToken = async (): Promise<boolean> => {
    const { refreshToken, setTokens, logout } = useAuthStore.getState();
    if (!refreshToken) { logout(); return false; }
    try {
      const res = await api.post('/auth/refresh', { refreshToken });
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
    if (!acrVendor.trim()) { toast.error('Vendor / Organization name is required for ACR reports'); return; }
    if (!acrEmail.trim()) { toast.error('Contact email is required for ACR reports'); return; }

    const ok = await ensureFreshToken();
    if (!ok) { toast.error('Session expired — please log in again'); return; }

    setSubmitting(true);
    const fileIds: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        setUploadProgress(`Uploading file ${i + 1} of ${files.length}: ${files[i].name}`);
        const uploaded = await filesService.upload(files[i]);
        fileIds.push(uploaded.id);
      }

      setUploadProgress('Creating batch workflow…');
      const policy = buildPolicy(gateConfigs, errorStrategy);
      const acrConfig: AcrBatchConfig = {
        vendor: acrVendor.trim(),
        contactEmail: acrEmail.trim(),
        edition: acrEdition,
        mode: acrMode,
        aggregationStrategy: acrAggStrategy,
      };

      const result = await workflowService.startBatch(batchName.trim(), fileIds, 2, policy, acrConfig);
      toast.success(`Batch started — ${result.workflowCount} workflow(s) queued`);
      navigate(`/workflow/batch/${result.batchId}`);
    } catch (err: unknown) {
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

      {/* File upload */}
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

      {/* ACR Report Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">ACR Report Settings</h2>
          <span className="text-xs text-gray-400">(used when generating Accessibility Conformance Reports)</span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Vendor / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={acrVendor}
              onChange={e => setAcrVendor(e.target.value)}
              disabled={submitting}
              placeholder="e.g., Acme Publishing"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Contact Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={acrEmail}
              onChange={e => setAcrEmail(e.target.value)}
              disabled={submitting}
              placeholder="e.g., accessibility@acme.com"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">VPAT Edition</label>
            <select
              value={acrEdition}
              onChange={e => setAcrEdition(e.target.value as AcrBatchConfig['edition'])}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="VPAT2.5-WCAG">VPAT 2.5 WCAG</option>
              <option value="VPAT2.5-508">VPAT 2.5 Section 508</option>
              <option value="VPAT2.5-EU">VPAT 2.5 EU</option>
              <option value="VPAT2.5-INT">VPAT 2.5 INT</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Report Mode</label>
            <select
              value={acrMode}
              onChange={e => setAcrMode(e.target.value as AcrBatchConfig['mode'])}
              disabled={submitting}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <option value="individual">Individual (one per file)</option>
              <option value="aggregate">Aggregate (one for batch)</option>
            </select>
          </div>
          {acrMode === 'aggregate' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Aggregation Strategy</label>
              <select
                value={acrAggStrategy}
                onChange={e => setAcrAggStrategy(e.target.value as AcrBatchConfig['aggregationStrategy'])}
                disabled={submitting}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
              >
                <option value="conservative">Conservative (any failure = Does Not Support)</option>
                <option value="optimistic">Optimistic (majority pass = Partially Supports)</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Auto-approval policy */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary-600" />
          <h2 className="text-sm font-semibold text-gray-900">Auto-Approval Policy</h2>
        </div>
        <p className="text-xs text-gray-500">
          Choose how each gate should be handled: <strong>Manual</strong> pauses for human review,
          <strong> Auto</strong> skips automatically, <strong> Conditional</strong> auto-approves
          only when confidence and issue-type rules are met.
        </p>

        <div className="space-y-4">
          {GATES.map(({ key, label, description }) => {
            const cfg = gateConfigs[key];
            return (
              <div key={key} className="border border-gray-100 rounded-lg p-4 space-y-3">
                {/* Gate header row */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                  </div>

                  {/* Mode selector */}
                  <div className="flex rounded-md border border-gray-200 overflow-hidden shrink-0">
                    {(['require-manual', 'conditional', 'auto-accept'] as GatePolicyMode[]).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setGateMode(key, mode)}
                        disabled={submitting}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50
                          ${cfg.mode === mode
                            ? mode === 'auto-accept'
                              ? 'bg-green-500 text-white'
                              : mode === 'conditional'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                      >
                        {mode === 'require-manual' ? 'Manual' : mode === 'conditional' ? 'Conditional' : 'Auto'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conditional settings */}
                {cfg.mode === 'conditional' && (
                  <div className="space-y-3 pt-1">
                    {/* Min confidence slider */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">
                          Minimum confidence score
                        </label>
                        <span className="text-xs font-semibold text-blue-600">
                          {cfg.minConfidence}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={cfg.minConfidence}
                        onChange={e => setMinConfidence(key, Number(e.target.value))}
                        disabled={submitting}
                        className="w-full accent-blue-500 disabled:opacity-50"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Auto-approve only when the audit score is ≥ {cfg.minConfidence}%.
                        Set to 0 to skip this check.
                      </p>
                    </div>

                    {/* Issue type rules (AI_REVIEW only) */}
                    {key === 'AI_REVIEW' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleAdvanced(key)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          {cfg.showAdvanced ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          {cfg.showAdvanced ? 'Hide' : 'Configure'} per-issue-type rules
                        </button>

                        {cfg.showAdvanced && (
                          <div className="mt-2 border border-gray-100 rounded-md overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 grid grid-cols-4 gap-2 text-xs font-medium text-gray-500">
                              <span className="col-span-2">Issue Category</span>
                              <span className="col-span-2">Rule</span>
                            </div>
                            {ISSUE_CATEGORIES.map(({ value, label: catLabel }) => {
                              const current = cfg.issueTypeRules[value] ?? 'manual';
                              return (
                                <div key={value} className="px-3 py-2 grid grid-cols-4 gap-2 items-center border-t border-gray-100">
                                  <span className="col-span-2 text-xs text-gray-700">{catLabel}</span>
                                  <div className="col-span-2 flex rounded border border-gray-200 overflow-hidden">
                                    {(['auto-accept', 'auto-reject', 'manual'] as IssueTypeRule[]).map(rule => (
                                      <button
                                        key={rule}
                                        onClick={() => setIssueTypeRule(key, value, rule)}
                                        disabled={submitting}
                                        className={`flex-1 py-1 text-xs transition-colors disabled:opacity-50
                                          ${current === rule
                                            ? rule === 'auto-accept'
                                              ? 'bg-green-500 text-white'
                                              : rule === 'auto-reject'
                                                ? 'bg-red-500 text-white'
                                                : 'bg-gray-600 text-white'
                                            : 'bg-white text-gray-500 hover:bg-gray-50'
                                          }`}
                                      >
                                        {rule === 'auto-accept' ? 'Accept' : rule === 'auto-reject' ? 'Reject' : 'Manual'}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            <div className="px-3 py-2 bg-blue-50 border-t border-blue-100">
                              <p className="text-xs text-blue-700">
                                All issue types must have an Accept or Reject rule for auto-approval to trigger.
                                Any category left on Manual will force human review.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {allAutoAccept && (
          allowFullyHeadless ? (
            <div className="flex items-start gap-2 p-3 bg-purple-50 border border-purple-200 rounded-md">
              <CheckCircle2 className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
              <p className="text-xs text-purple-700">
                All gates are set to Auto. Fully headless mode is enabled for this tenant — no human review will occur.
              </p>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-start gap-2 min-w-0">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  All gates are set to Auto, but your tenant does not permit fully headless batches.
                  At least one gate must remain on Manual or Conditional, or enable the setting below.
                </p>
              </div>
              <button
                ref={headlessTriggerRef}
                type="button"
                onClick={openHeadlessModal}
                className="shrink-0 text-xs font-semibold text-amber-800 underline hover:text-amber-900 whitespace-nowrap"
              >
                Enable →
              </button>
            </div>
          )
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

      {/* Fully Headless Modal */}
      {showHeadlessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            ref={headlessDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="headless-modal-title"
            tabIndex={-1}
            onKeyDown={(e) => e.key === 'Escape' && setShowHeadlessModal(false)}
            className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6 space-y-5 outline-none"
          >
            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 id="headless-modal-title" className="text-base font-semibold text-gray-900">Enable Fully Headless Batches</h2>
                <p className="mt-1 text-sm text-gray-600">
                  This is a <strong>tenant-wide</strong> setting. Once enabled, any batch may run with all HITL
                  gates set to auto-accept, bypassing all human review.
                </p>
              </div>
            </div>

            {/* Risk list */}
            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 space-y-1">
              <p className="text-xs font-medium text-amber-800">Confirm before enabling:</p>
              <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5">
                <li>Your QA process does not require human sign-off on AI decisions</li>
                <li>AI remediation quality meets your acceptance threshold</li>
                <li>ACRs will be generated without a human attestation step</li>
              </ul>
            </div>

            {/* Toggle */}
            <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-md">
              <div>
                <p className="text-sm font-medium text-gray-900">Allow fully headless batches</p>
                <p className="text-xs text-gray-500 mt-0.5">Tenant-wide · affects all future batches</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={modalToggleValue}
                  onChange={e => setModalToggleValue(e.target.checked)}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowHeadlessModal(false)}
                disabled={savingHeadless}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={saveHeadlessSetting}
                disabled={savingHeadless || !modalToggleValue}
              >
                {savingHeadless
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving…</>
                  : 'Save & Continue'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
