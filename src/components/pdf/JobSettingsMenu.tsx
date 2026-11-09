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
 */

import { useState } from 'react';
import { FileText, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface JobSettingsMenuProps {
  onGenerateAcr: () => void;
  generateAcrPending: boolean;
  generateAcrDisabled?: boolean;
  generateAcrDisabledTitle?: string;
}

export function JobSettingsMenu({ onGenerateAcr, generateAcrPending, generateAcrDisabled, generateAcrDisabledTitle }: JobSettingsMenuProps) {
  const [open, setOpen] = useState(false);

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
          className="absolute right-0 top-10 z-50 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-1"
        >
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
