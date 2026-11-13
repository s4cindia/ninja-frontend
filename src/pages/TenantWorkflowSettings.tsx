import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { tenantConfigService, WorkflowConfig, ExplanationSource, Axes4Config, AiRemediationConfig, ComplianceConfig } from '../services/tenant-config.service';
import { Loader2, Save, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export const TenantWorkflowSettings: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'ADMIN';

  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form state — axes4 tenant toggle. Readable by everyone, but only an
  // ADMIN can actually change it (enforced both here and by the backend).
  const [axes4Config, setAxes4Config] = useState<Axes4Config | null>(null);
  const [axes4Enabled, setAxes4Enabled] = useState(false);
  const [savingAxes4, setSavingAxes4] = useState(false);

  // Form state — workflow
  const [enabled, setEnabled] = useState(false);
  const [aiReviewTimeout, setAiReviewTimeout] = useState<string>('3600000');
  const [remediationTimeout, setRemediationTimeout] = useState<string>('3600000');
  const [conformanceTimeout, setConformanceTimeout] = useState<string>('3600000');
  const [acrSignoffTimeout, setAcrSignoffTimeout] = useState<string>('null');
  const [allowFullyHeadless, setAllowFullyHeadless] = useState<boolean>(false);

  // Form state — reports
  const [explanationSource, setExplanationSource] = useState<ExplanationSource>('hardcoded');
  const [savingReports, setSavingReports] = useState(false);

  // Form state — PDF AI remediation tenant defaults. Readable by everyone,
  // but only an ADMIN can actually change them (enforced both here and by
  // the backend's own authorize('ADMIN') on the PATCH route) — same pattern
  // as axes4 above. This is the tenant-wide default every job falls back to
  // when it doesn't send its own per-run override (the Re-run AI Analysis
  // checkboxes, Auto Remediation's own popover) on PdfAuditResultsPage.
  const [aiRemediationConfig, setAiRemediationConfig] = useState<AiRemediationConfig | null>(null);
  const [altTextMode, setAltTextMode] = useState<AiRemediationConfig['altTextMode']>('apply-to-pdf');
  const [colorContrastMode, setColorContrastMode] = useState<AiRemediationConfig['colorContrastMode']>('guidance-only');
  const [linkTextMode, setLinkTextMode] = useState<AiRemediationConfig['linkTextMode']>('guidance-only');
  const [fullAutoModeDefault, setFullAutoModeDefault] = useState(false);
  const [savingAiRemediation, setSavingAiRemediation] = useState(false);

  // Form state — compliance tenant toggle. Readable by everyone, but only
  // an ADMIN can actually change it (enforced both here and by the
  // backend). Scoped to the single-job PDF Audit Results page's own
  // Compliance phase indicator only — never read by the separate Workflow
  // Agent, whose own ACR sign-off gate (Gate 4) stays non-skippable
  // regardless of this setting; see compliance-tenant-config.service.ts's
  // header on the backend.
  const [complianceConfig, setComplianceConfig] = useState<ComplianceConfig | null>(null);
  const [acrRequired, setAcrRequired] = useState(true);
  const [savingCompliance, setSavingCompliance] = useState(false);

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [currentConfig, reportsConfig, currentAxes4Config, currentAiRemediationConfig, currentComplianceConfig] = await Promise.all([
        tenantConfigService.getWorkflowConfig(),
        tenantConfigService.getReportsConfig(),
        tenantConfigService.getAxes4Config(),
        tenantConfigService.getAiRemediationConfig(),
        tenantConfigService.getComplianceConfig(),
      ]);
      setConfig(currentConfig);

      // Populate form
      setEnabled(currentConfig.enabled);
      setAiReviewTimeout(String(currentConfig.hitlGates?.AWAITING_AI_REVIEW ?? 3600000));
      setRemediationTimeout(String(currentConfig.hitlGates?.AWAITING_REMEDIATION_REVIEW ?? 3600000));
      setConformanceTimeout(String(currentConfig.hitlGates?.AWAITING_CONFORMANCE_REVIEW ?? 3600000));
      setAcrSignoffTimeout(
        currentConfig.hitlGates?.AWAITING_ACR_SIGNOFF === null ? 'null' : String(currentConfig.hitlGates?.AWAITING_ACR_SIGNOFF)
      );
      setAllowFullyHeadless(currentConfig.batchPolicy?.allowFullyHeadless ?? false);
      setExplanationSource(reportsConfig.explanationSource);
      setAxes4Config(currentAxes4Config);
      setAxes4Enabled(currentAxes4Config.enabled);
      setAiRemediationConfig(currentAiRemediationConfig);
      setAltTextMode(currentAiRemediationConfig.altTextMode);
      setColorContrastMode(currentAiRemediationConfig.colorContrastMode);
      setLinkTextMode(currentAiRemediationConfig.linkTextMode);
      setFullAutoModeDefault(currentAiRemediationConfig.fullAutoModeDefault);
      setComplianceConfig(currentComplianceConfig);
      setAcrRequired(currentComplianceConfig.acrRequired);

      setIsDirty(false);
    } catch (err) {
      toast.error('Failed to load configuration. Please try again.');
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate inputs
      const errors: string[] = [];

      const aiTimeout = aiReviewTimeout === 'null' ? null : parseInt(aiReviewTimeout);
      const remTimeout = remediationTimeout === 'null' ? null : parseInt(remediationTimeout);
      const confTimeout = conformanceTimeout === 'null' ? null : parseInt(conformanceTimeout);
      const acrTimeout = acrSignoffTimeout === 'null' ? null : parseInt(acrSignoffTimeout);

      if (aiTimeout !== null && (isNaN(aiTimeout) || aiTimeout < 0)) {
        errors.push('AI Review timeout must be a positive number or null');
      }
      if (remTimeout !== null && (isNaN(remTimeout) || remTimeout < 0)) {
        errors.push('Remediation Review timeout must be a positive number or null');
      }
      if (confTimeout !== null && (isNaN(confTimeout) || confTimeout < 0)) {
        errors.push('Conformance Review timeout must be a positive number or null');
      }
      if (acrTimeout !== null && (isNaN(acrTimeout) || acrTimeout < 0)) {
        errors.push('ACR Signoff timeout must be a positive number or null');
      }

      if (errors.length > 0) {
        toast.error(errors.join('. '), { duration: 5000 });
        return;
      }

      // Build update payload
      const updates = {
        enabled,
        hitlGates: {
          AWAITING_AI_REVIEW: aiTimeout,
          AWAITING_REMEDIATION_REVIEW: remTimeout,
          AWAITING_CONFORMANCE_REVIEW: confTimeout,
          AWAITING_ACR_SIGNOFF: acrTimeout,
        },
        batchPolicy: {
          allowFullyHeadless,
        },
      };

      const updatedConfig = await tenantConfigService.updateWorkflowConfig(updates);
      setConfig(updatedConfig);
      setIsDirty(false);

      toast.success('Configuration saved successfully!', {
        duration: 3000,
        icon: '✅',
      });
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to save configuration. Please try again.';
      toast.error(errorMessage, {
        duration: 5000,
      });
      console.error('Failed to save config:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (config) {
      setEnabled(config.enabled);
      setAiReviewTimeout(String(config.hitlGates?.AWAITING_AI_REVIEW ?? 3600000));
      setRemediationTimeout(String(config.hitlGates?.AWAITING_REMEDIATION_REVIEW ?? 3600000));
      setConformanceTimeout(String(config.hitlGates?.AWAITING_CONFORMANCE_REVIEW ?? 3600000));
      setAcrSignoffTimeout(
        config.hitlGates?.AWAITING_ACR_SIGNOFF === null ? 'null' : String(config.hitlGates?.AWAITING_ACR_SIGNOFF)
      );
      setAllowFullyHeadless(config.batchPolicy?.allowFullyHeadless ?? false);
      setIsDirty(false);
    }
  };

  const handleSaveReportsConfig = async () => {
    try {
      setSavingReports(true);
      await tenantConfigService.updateReportsConfig({ explanationSource });
      toast.success('Reports configuration saved!', { duration: 3000, icon: '✅' });
    } catch {
      toast.error('Failed to save reports configuration. Please try again.', { duration: 5000 });
    } finally {
      setSavingReports(false);
    }
  };

  const handleSaveAxes4Config = async () => {
    try {
      setSavingAxes4(true);
      const updated = await tenantConfigService.updateAxes4Config({ enabled: axes4Enabled });
      setAxes4Config(updated);
      setAxes4Enabled(updated.enabled);
      toast.success('axes4 setting saved!', { duration: 3000, icon: '✅' });
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to save axes4 setting. Please try again.';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSavingAxes4(false);
    }
  };

  const handleSaveAiRemediationConfig = async () => {
    try {
      setSavingAiRemediation(true);
      const updated = await tenantConfigService.updateAiRemediationConfig({ altTextMode, colorContrastMode, linkTextMode, fullAutoModeDefault });
      setAiRemediationConfig(updated);
      setAltTextMode(updated.altTextMode);
      setColorContrastMode(updated.colorContrastMode);
      setLinkTextMode(updated.linkTextMode);
      setFullAutoModeDefault(updated.fullAutoModeDefault);
      toast.success('PDF AI remediation settings saved!', { duration: 3000, icon: '✅' });
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to save PDF AI remediation settings. Please try again.';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSavingAiRemediation(false);
    }
  };

  const handleSaveComplianceConfig = async () => {
    try {
      setSavingCompliance(true);
      const updated = await tenantConfigService.updateComplianceConfig({ acrRequired });
      setComplianceConfig(updated);
      setAcrRequired(updated.acrRequired);
      toast.success('Compliance setting saved!', { duration: 3000, icon: '✅' });
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Failed to save compliance setting. Please try again.';
      toast.error(errorMessage, { duration: 5000 });
    } finally {
      setSavingCompliance(false);
    }
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const msToReadable = (ms: number | null): string => {
    if (ms === null) return 'Manual approval required';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''}`;
    if (minutes > 0) return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Workflow Configuration</h1>
        <p className="mt-2 text-gray-600">
          Configure agentic workflow behavior and HITL (Human-in-the-Loop) gate timeouts
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
        {/* Workflow Enabled Toggle */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Agentic Workflow</h3>
              <p className="mt-1 text-sm text-gray-600">
                Enable automatic workflow processing for file uploads. When enabled, files are automatically
                processed through the full accessibility workflow without requiring manual audit triggers.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={enabled}
                onChange={(e) => {
                  setEnabled(e.target.checked);
                  markDirty();
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Batch Policy */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">Allow Fully Headless Batches</h3>
              <p className="mt-1 text-sm text-gray-600">
                When enabled, batch jobs may set all HITL gates to auto-accept, bypassing all human review.
                By default, at least one gate must remain as manual review.
              </p>
              <p className="mt-1 text-xs text-amber-700 font-medium">
                ⚠️ Only enable this if your organization's quality assurance processes do not require human review.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={allowFullyHeadless}
                onChange={(e) => {
                  setAllowFullyHeadless(e.target.checked);
                  markDirty();
                }}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* HITL Gate Timeouts */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">HITL Gate Timeouts</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configure timeout durations for Human-in-the-Loop gates. Set to "null" for manual approval (no timeout).
            Values are in milliseconds.
          </p>

          <div className="space-y-4">
            {/* AI Review Timeout */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label htmlFor="aiReview" className="block text-sm font-medium text-gray-700 mb-1">
                  AI Review Gate
                </label>
                <input
                  id="aiReview"
                  type="text"
                  value={aiReviewTimeout}
                  onChange={(e) => {
                    setAiReviewTimeout(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="3600000 or null"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Current: {msToReadable(aiReviewTimeout === 'null' ? null : parseInt(aiReviewTimeout))}
                </p>
              </div>
            </div>

            {/* Remediation Review Timeout */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label htmlFor="remediation" className="block text-sm font-medium text-gray-700 mb-1">
                  Remediation Review Gate
                </label>
                <input
                  id="remediation"
                  type="text"
                  value={remediationTimeout}
                  onChange={(e) => {
                    setRemediationTimeout(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="3600000 or null"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Current: {msToReadable(remediationTimeout === 'null' ? null : parseInt(remediationTimeout))}
                </p>
              </div>
            </div>

            {/* Conformance Review Timeout */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label htmlFor="conformance" className="block text-sm font-medium text-gray-700 mb-1">
                  Conformance Review Gate
                </label>
                <input
                  id="conformance"
                  type="text"
                  value={conformanceTimeout}
                  onChange={(e) => {
                    setConformanceTimeout(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="3600000 or null"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Current: {msToReadable(conformanceTimeout === 'null' ? null : parseInt(conformanceTimeout))}
                </p>
              </div>
            </div>

            {/* ACR Signoff Timeout */}
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label htmlFor="acrSignoff" className="block text-sm font-medium text-gray-700 mb-1">
                  ACR Signoff Gate
                </label>
                <input
                  id="acrSignoff"
                  type="text"
                  value={acrSignoffTimeout}
                  onChange={(e) => {
                    setAcrSignoffTimeout(e.target.value);
                    markDirty();
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="null (recommended)"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Current: {msToReadable(acrSignoffTimeout === 'null' ? null : parseInt(acrSignoffTimeout))}
                  <span className="ml-2 text-amber-600">(Recommended: null for manual approval)</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Timeout Examples:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 30000 = 30 seconds</li>
              <li>• 60000 = 1 minute</li>
              <li>• 3600000 = 1 hour (default)</li>
              <li>• null = No timeout (manual approval required)</li>
            </ul>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={!isDirty || saving}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Current Configuration Display */}
      <div className="mt-6 bg-gray-50 rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Current Configuration</h3>
        <pre className="text-xs text-gray-600 overflow-x-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
      </div>

      {/* Reports / Explainability Configuration */}
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports Configuration</h1>
        <p className="mt-2 text-gray-600">
          Configure how AI-generated explanations are sourced for issue explainability reports.
        </p>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">AI Explanation Source</h3>
        <p className="text-sm text-gray-600 mb-5">
          Controls how the platform explains why each issue is classified as auto-fix, quick-fix, or manual.
          "Hardcoded" is instant and free. "Gemini" provides richer, dynamic explanations using the Gemini API.
          "Hybrid" uses the catalog first and falls back to Gemini for unknown codes.
        </p>

        <div className="space-y-3">
          {(
            [
              {
                value: 'hardcoded' as ExplanationSource,
                label: 'Hardcoded Catalog',
                description: 'Fast, deterministic explanations from a built-in catalog. No API cost. Recommended for most tenants.',
              },
              {
                value: 'gemini' as ExplanationSource,
                label: 'Gemini AI',
                description: 'Rich, dynamic explanations generated by Gemini for every issue. Uses Gemini API quota.',
              },
              {
                value: 'hybrid' as ExplanationSource,
                label: 'Hybrid (Catalog + Gemini)',
                description: 'Uses the catalog for known codes and Gemini for unrecognised or future codes. Balances cost and coverage.',
              },
            ] as { value: ExplanationSource; label: string; description: string }[]
          ).map(opt => (
            <label
              key={opt.value}
              className={`flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                explanationSource === opt.value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="explanationSource"
                value={opt.value}
                checked={explanationSource === opt.value}
                onChange={() => setExplanationSource(opt.value)}
                className="mt-0.5 accent-indigo-600"
              />
              <div>
                <span className="font-medium text-gray-900">{opt.label}</span>
                <p className="text-sm text-gray-500 mt-0.5">{opt.description}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-end mt-5">
          <Button onClick={handleSaveReportsConfig} disabled={savingReports}>
            {savingReports ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Reports Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* axes4 PAC Cloud Configuration */}
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-gray-900">axes4 PAC Cloud</h1>
        <p className="mt-2 text-gray-600">
          Controls per-organization access to the paid axes4 live PDF/UA check.
        </p>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Enable axes4 PAC Cloud live checks</h3>
            <p className="mt-1 text-sm text-gray-600">
              Enables the paid, per-page-billed axes4 live PDF/UA check for your team. Off by
              default; turn on only if your organization has decided to use it.
            </p>
            {axes4Config?.enabledAt && (
              <p className="mt-1 text-xs text-gray-400">
                Last changed by {axes4Config.enabledBy ?? 'unknown'} on{' '}
                {new Date(axes4Config.enabledAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
            {!isAdmin && (
              <p className="mt-1 text-xs text-amber-600">Only administrators can change this setting.</p>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              aria-label="Enable axes4 PAC Cloud live checks"
              className="sr-only peer"
              checked={axes4Enabled}
              disabled={!isAdmin || savingAxes4}
              onChange={(e) => setAxes4Enabled(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        {isAdmin && (
          <div className="flex justify-end mt-5">
            <Button
              onClick={handleSaveAxes4Config}
              disabled={savingAxes4 || axes4Enabled === (axes4Config?.enabled ?? false)}
            >
              {savingAxes4 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save axes4 Setting
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Compliance Configuration */}
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-gray-900">Compliance</h1>
        <p className="mt-2 text-gray-600">
          Controls what the single-job PDF Audit Results page's "Compliance" progress step requires
          to show done.
        </p>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">Require ACR for Compliance</h3>
            <p className="mt-1 text-sm text-gray-600">
              When on (default), a job's Compliance step needs both a generated PAC Report and a
              generated ACR to show done. Turn off to let the PAC Report alone count as done, for
              teams that don't produce an ACR for every job.
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Scope: this only changes the single-job Audit Results page's own Compliance indicator.
              It does not affect the separate agentic Workflow's ACR Sign-off gate above, which stays
              a mandatory, non-skippable attestation step regardless of this setting.
            </p>
            {complianceConfig?.acrRequiredChangedAt && (
              <p className="mt-1 text-xs text-gray-400">
                Last changed by {complianceConfig.acrRequiredChangedBy ?? 'unknown'} on{' '}
                {new Date(complianceConfig.acrRequiredChangedAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
              </p>
            )}
            {!isAdmin && (
              <p className="mt-1 text-xs text-amber-600">Only administrators can change this compliance setting.</p>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer ml-4">
            <input
              type="checkbox"
              aria-label="Require ACR for Compliance"
              className="sr-only peer"
              checked={acrRequired}
              disabled={!isAdmin || savingCompliance}
              onChange={(e) => setAcrRequired(e.target.checked)}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
          </label>
        </div>

        {isAdmin && (
          <div className="flex justify-end mt-5">
            <Button
              onClick={handleSaveComplianceConfig}
              disabled={savingCompliance || acrRequired === (complianceConfig?.acrRequired ?? true)}
            >
              {savingCompliance ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Compliance Setting
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* PDF AI Remediation Configuration */}
      <div className="mt-8">
        <h1 className="text-3xl font-bold text-gray-900">PDF AI Remediation</h1>
        <p className="mt-2 text-gray-600">
          Tenant-wide defaults for the PDF accessibility AI pipeline. Every job falls back to these
          unless it sends its own per-run override (the Re-run AI Analysis checkboxes, or Auto
          Remediation's own popover, on the Audit Results page) — changing these does not affect a
          run already in progress.
        </p>
      </div>

      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-6 space-y-5">
        {!isAdmin && (
          <p className="text-xs text-amber-600">Only administrators can change these settings.</p>
        )}

        <div>
          <label htmlFor="altTextMode" className="block text-sm font-medium text-gray-700 mb-1">
            Alt text
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Set to guidance-only when clients generally supply their own alt text — operators can
            still override per job from the Audit Results page for a one-off exception either way.
          </p>
          <select
            id="altTextMode"
            value={altTextMode}
            disabled={!isAdmin || savingAiRemediation}
            onChange={(e) => setAltTextMode(e.target.value as AiRemediationConfig['altTextMode'])}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="apply-to-pdf">Generate AI alt text</option>
            <option value="guidance-only">Guidance only — clients supply their own</option>
          </select>
        </div>

        <div>
          <label htmlFor="colorContrastMode" className="block text-sm font-medium text-gray-700 mb-1">
            Color contrast
          </label>
          <select
            id="colorContrastMode"
            value={colorContrastMode}
            disabled={!isAdmin || savingAiRemediation}
            onChange={(e) => setColorContrastMode(e.target.value as AiRemediationConfig['colorContrastMode'])}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="guidance-only">Guidance only — flag but never auto-apply</option>
            <option value="disabled">Disabled — skip contrast entirely</option>
            <option value="apply-to-pdf">Auto-apply — fix contrast automatically</option>
          </select>
        </div>

        <div>
          <label htmlFor="linkTextMode" className="block text-sm font-medium text-gray-700 mb-1">
            Link text
          </label>
          <select
            id="linkTextMode"
            value={linkTextMode}
            disabled={!isAdmin || savingAiRemediation}
            onChange={(e) => setLinkTextMode(e.target.value as AiRemediationConfig['linkTextMode'])}
            className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="guidance-only">Guidance only — flag but never auto-apply</option>
            <option value="disabled">Disabled — skip link text entirely</option>
            <option value="apply-to-pdf">Auto-apply — fix link text automatically</option>
          </select>
        </div>

        <div className="border-t border-gray-200 pt-5">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-700">Full Auto Mode</h4>
              <p className="mt-1 text-xs text-gray-500">
                When on, a newly uploaded PDF automatically starts Auto Remediation's own
                analyze / apply / re-audit loop as soon as its initial audit and AI analysis
                complete, instead of waiting for an operator to click "Start Auto Remediation".
                An upload-time override on the PDF upload page always wins over this tenant
                default when set. Off by default.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer ml-4">
              <input
                type="checkbox"
                aria-label="Full Auto Mode"
                className="sr-only peer"
                checked={fullAutoModeDefault}
                disabled={!isAdmin || savingAiRemediation}
                onChange={(e) => setFullAutoModeDefault(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        </div>

        {isAdmin && (
          <div className="flex justify-end pt-1">
            <Button
              onClick={handleSaveAiRemediationConfig}
              disabled={
                savingAiRemediation ||
                (altTextMode === (aiRemediationConfig?.altTextMode ?? 'apply-to-pdf') &&
                  colorContrastMode === (aiRemediationConfig?.colorContrastMode ?? 'guidance-only') &&
                  linkTextMode === (aiRemediationConfig?.linkTextMode ?? 'guidance-only') &&
                  fullAutoModeDefault === (aiRemediationConfig?.fullAutoModeDefault ?? false))
              }
            >
              {savingAiRemediation ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save PDF AI Remediation Settings
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
