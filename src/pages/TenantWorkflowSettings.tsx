import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Alert } from '../components/ui/Alert';
import { tenantConfigService, WorkflowConfig } from '../services/tenant-config.service';
import { Loader2, Save, X, CheckCircle, AlertCircle } from 'lucide-react';

export const TenantWorkflowSettings: React.FC = () => {
  const [config, setConfig] = useState<WorkflowConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [aiReviewTimeout, setAiReviewTimeout] = useState<string>('3600000');
  const [remediationTimeout, setRemediationTimeout] = useState<string>('3600000');
  const [conformanceTimeout, setConformanceTimeout] = useState<string>('3600000');
  const [acrSignoffTimeout, setAcrSignoffTimeout] = useState<string>('null');

  // Load current configuration
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const currentConfig = await tenantConfigService.getWorkflowConfig();
      setConfig(currentConfig);

      // Populate form
      setEnabled(currentConfig.enabled);
      setAiReviewTimeout(String(currentConfig.hitlGates?.AWAITING_AI_REVIEW ?? 3600000));
      setRemediationTimeout(String(currentConfig.hitlGates?.AWAITING_REMEDIATION_REVIEW ?? 3600000));
      setConformanceTimeout(String(currentConfig.hitlGates?.AWAITING_CONFORMANCE_REVIEW ?? 3600000));
      setAcrSignoffTimeout(
        currentConfig.hitlGates?.AWAITING_ACR_SIGNOFF === null ? 'null' : String(currentConfig.hitlGates?.AWAITING_ACR_SIGNOFF)
      );

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
      };

      const updatedConfig = await tenantConfigService.updateWorkflowConfig(updates);
      setConfig(updatedConfig);
      setIsDirty(false);

      toast.success('Configuration saved successfully!', {
        duration: 3000,
        icon: '✅',
      });
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to save configuration. Please try again.', {
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
      setIsDirty(false);
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
    </div>
  );
};
