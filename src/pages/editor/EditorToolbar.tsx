/**
 * EditorToolbar
 *
 * Toolbar with save, export, validator, version history, upload, and fullscreen buttons.
 */
import { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft, PanelRightClose, PanelRight,
  Maximize2, Minimize2, Upload, Download, Save, Loader2, History, ShieldCheck,
  ChevronDown, FileText, FileCheck, Table,
} from 'lucide-react';

export type ExportMode = 'clean' | 'tracked';

interface EditorToolbarProps {
  documentName: string;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  saving: boolean;
  exporting: boolean;
  showVersionPanel: boolean;
  showValidatorPanel: boolean;
  isFullscreen: boolean;
  onBack: () => void;
  onSave: () => void;
  onDownload: (mode: ExportMode) => void;
  onConsolidatedReport: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleVersionPanel: () => void;
  onToggleValidatorPanel: () => void;
  onToggleFullscreen: () => void;
}

/** Compact toolbar for fullscreen mode (dark background). */
export function FullscreenToolbar({
  documentName, showValidatorPanel, onToggleValidatorPanel, onToggleFullscreen,
}: Pick<EditorToolbarProps, 'documentName' | 'showValidatorPanel' | 'onToggleValidatorPanel' | 'onToggleFullscreen'>) {
  return (
    <div className="flex items-center justify-between bg-slate-800 px-4 py-2">
      <span className="text-white text-sm font-medium truncate max-w-xs">{documentName}</span>
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={onToggleValidatorPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
            showValidatorPanel ? 'bg-teal-600 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Checks
        </button>
        <button type="button"
          onClick={onToggleFullscreen}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-700 text-white rounded hover:bg-slate-600 transition-colors text-sm"
        >
          <Minimize2 className="w-4 h-4" />
          Exit Fullscreen
        </button>
      </div>
    </div>
  );
}

/** Full toolbar for normal (non-fullscreen) mode. */
export function EditorToolbar({
  documentName, hasUnsavedChanges, lastSaved, saving, exporting,
  showVersionPanel, showValidatorPanel,
  onBack, onSave, onDownload, onConsolidatedReport, onFileUpload,
  onToggleVersionPanel, onToggleValidatorPanel, onToggleFullscreen,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center justify-between bg-white border-b px-4 py-2">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-gray-600 hover:text-gray-900 text-sm">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <span className="text-sm font-medium text-gray-700 truncate max-w-md">{documentName}</span>
        {hasUnsavedChanges && <span className="text-xs text-amber-600">-- Unsaved changes</span>}
        {lastSaved && !hasUnsavedChanges && (
          <span className="text-xs text-gray-400">Saved {lastSaved.toLocaleTimeString()}</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button type="button"
          onClick={onSave} disabled={saving || !hasUnsavedChanges}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
            hasUnsavedChanges ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save'}
        </button>
        <div className="h-5 w-px bg-gray-300" />
        <label className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm cursor-pointer">
          <Upload className="w-4 h-4" /> Upload
          <input type="file" accept=".docx,.pdf" onChange={onFileUpload} className="hidden" />
        </label>
        <ExportDropdown onDownload={onDownload} onConsolidatedReport={onConsolidatedReport} exporting={exporting} />
        <div className="h-5 w-px bg-gray-300" />
        <button type="button"
          onClick={onToggleValidatorPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
            showValidatorPanel ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {showValidatorPanel ? <PanelRightClose className="w-4 h-4" /> : <PanelRight className="w-4 h-4" />}
          Checks
        </button>
        <button type="button"
          onClick={onToggleVersionPanel}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition-colors text-sm ${
            showVersionPanel ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <History className="w-4 h-4" /> History
        </button>
        <button type="button"
          onClick={onToggleFullscreen}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white rounded hover:bg-slate-700 transition-colors text-sm"
        >
          <Maximize2 className="w-4 h-4" /> Fullscreen
        </button>
      </div>
    </div>
  );
}

function ExportDropdown({ onDownload, onConsolidatedReport, exporting }: { onDownload: (mode: ExportMode) => void; onConsolidatedReport: () => void; exporting: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button type="button"
        onClick={() => setOpen(!open)}
        disabled={exporting}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm disabled:opacity-50"
      >
        {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {exporting ? 'Exporting...' : 'Export'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-md shadow-lg border z-50">
          <button type="button"
            onClick={() => { setOpen(false); onDownload('clean'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-md"
          >
            <FileCheck className="w-4 h-4 text-green-600" />
            <div className="text-left">
              <div className="font-medium">Clean Document</div>
              <div className="text-xs text-gray-500">All changes accepted</div>
            </div>
          </button>
          <button type="button"
            onClick={() => { setOpen(false); onDownload('tracked'); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            <div className="text-left">
              <div className="font-medium">With Track Changes</div>
              <div className="text-xs text-gray-500">Shows insertions &amp; deletions</div>
            </div>
          </button>
          <button type="button"
            onClick={() => { setOpen(false); onConsolidatedReport(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-md border-t"
          >
            <Table className="w-4 h-4 text-purple-600" />
            <div className="text-left">
              <div className="font-medium">Consolidated Report</div>
              <div className="text-xs text-gray-500">Excel with all checks (3 sheets)</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
