import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { tenantConfigService, WorkflowConfig, ExplanationSource } from '../services/tenant-config.service';
import { Loader2, Save, X } from 'lucide-react';

export const TenantWorkflowSettings: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const [currentConfig, reportsConfig] = await Promise.all([
        tenantConfigService.getWorkflowConfig(),
        tenantConfigService.getReportsConfig(),
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
    </div>
  );
};
