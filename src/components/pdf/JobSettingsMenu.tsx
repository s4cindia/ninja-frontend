/**
 * JobSettingsMenu
 *
 * Per-job overflow menu on PdfAuditResultsPage's toolbar. Started as the
 * new home for "Generate ACR" (moved out of the main button row per an
 * explicit request to declutter it) -- a gear-icon trigger opening a
 * hand-rolled popover, same open/close/click-outside-free style as
 * AutoModeStartControl's own inline popover (no portal/overlay library in
 * this codebase yet, so this follows the existing pattern rather than
 * introducing one).
 *
 * Also the visible, editable-any-time home for this job's own fullAutoMode
 * / autoEscalateOnStall overrides (ninja-backend#826) -- previously
 * fullAutoMode was set-and-forget at upload time with no way to see or
 * change it afterward. Each is a three-state control (On / Off / use the
 * tenant default), since `null` ("inherit") is a real, distinct state here,
 * not just a fallback for a missing boolean.
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useJobSettings, useUpdateJobSettings } from '@/hooks/useAutoMode';
import { getErrorMessage } from '@/services/api';
import type { JobSettingOverride } from '@/types/pdfAutoMode.types';

interface JobSettingsMenuProps {
  jobId?: string;
  onGenerateAcr: () => void;
  generateAcrPending: boolean;
  generateAcrDisabled?: boolean;
  generateAcrDisabledTitle?: string;
}

type OverrideSelectValue = 'inherit' | 'on' | 'off';

function toSelectValue(override: boolean | null): OverrideSelectValue {
  if (override === null) return 'inherit';
  return override ? 'on' : 'off';
}

function fromSelectValue(value: OverrideSelectValue): boolean | null {
  if (value === 'inherit') return null;
  return value === 'on';
}

function OverrideRow({
  id,
  label,
  setting,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  setting: JobSettingOverride;
  disabled: boolean;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div className="px-3 py-2">
      <label htmlFor={id} className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </label>
      <select
        id={id}
        value={toSelectValue(setting.override)}
        disabled={disabled}
        onChange={(e) => onChange(fromSelectValue(e.target.value as OverrideSelectValue))}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="inherit">Use tenant default ({setting.tenantDefault ? 'On' : 'Off'})</option>
        <option value="on">On</option>
        <option value="off">Off</option>
      </select>
    </div>
  );
}

export function JobSettingsMenu({ jobId, onGenerateAcr, generateAcrPending, generateAcrDisabled, generateAcrDisabledTitle }: JobSettingsMenuProps) {
  const [open, setOpen] = useState(false);
  const jobSettingsQuery = useJobSettings(jobId, { enabled: open });
  const updateJobSettings = useUpdateJobSettings(jobId);

  const settings = jobSettingsQuery.data;
  const updating = updateJobSettings.isPending;

  const handleOverrideChange = (field: 'fullAutoMode' | 'autoEscalateOnStall', value: boolean | null) => {
    updateJobSettings.mutate(
      { [field]: value },
      { onError: (err) => toast.error(getErrorMessage(err) || 'Failed to update job settings') }
    );
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Settings className="h-4 w-4 mr-1" />
        Settings
      </Button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
        >
          <div className="px-3 py-2 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Auto Mode overrides</p>
          </div>

          {jobSettingsQuery.isLoading && (
            <div className="px-3 py-3 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading…
            </div>
          )}

          {jobSettingsQuery.isError && (
            <p className="px-3 py-2 text-xs text-red-600">Failed to load job settings.</p>
          )}

          {settings && (
            <>
              <OverrideRow
                id="job-settings-full-auto-mode"
                label="Full Auto Mode"
                setting={settings.fullAutoMode}
                disabled={updating}
                onChange={(value) => handleOverrideChange('fullAutoMode', value)}
              />
              <OverrideRow
                id="job-settings-auto-escalate-on-stall"
                label="Auto-escalate on stall"
                setting={settings.autoEscalateOnStall}
                disabled={updating}
                onChange={(value) => handleOverrideChange('autoEscalateOnStall', value)}
              />
            </>
          )}

          <div className="border-t border-gray-100 my-1" />

          <button
            role="menuitem"
            type="button"
            onClick={() => { setOpen(false); onGenerateAcr(); }}
            disabled={generateAcrPending || generateAcrDisabled}
            title={generateAcrDisabled ? generateAcrDisabledTitle : undefined}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            {generateAcrPending
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileText className="h-4 w-4" />
            }
            {generateAcrPending ? 'Validating…' : 'Generate ACR'}
          </button>
        </div>
      )}
    </div>
  );
}
