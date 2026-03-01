/**
 * ValidatorPanel - Unified panel with tabs for Integrity Check, Plagiarism Check, and Style Check.
 * Replaces separate IntegrityCheckPanel, PlagiarismCheckPanel, and StyleValidationPanel in the editor sidebar.
 */

import { useState } from 'react';
import { X, ShieldCheck, Search, CheckSquare } from 'lucide-react';
import { IntegrityCheckContent } from '@/components/integrity/IntegrityCheckPanel';
import { PlagiarismCheckContent } from '@/components/plagiarism/PlagiarismCheckPanel';
import { StyleCheckContent } from '@/components/style/StyleValidationPanel';

type ValidatorTab = 'integrity' | 'plagiarism' | 'style';

interface Props {
  documentId: string;
  onClose: () => void;
  onGoToLocation?: (text: string) => void;
  onApplyFix?: (originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => void;
  defaultTab?: ValidatorTab;
}

export function ValidatorPanel({ documentId, onClose, onGoToLocation, onApplyFix, defaultTab = 'integrity' }: Props) {
  const [activeTab, setActiveTab] = useState<ValidatorTab>(defaultTab);

  return (
    <div className="w-[400px] border-l border-gray-200 bg-white flex flex-col h-full overflow-hidden">
      {/* Header with tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
          <h3 className="font-semibold text-sm text-gray-800">Checks</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close panel">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex">
          <button type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'integrity'
                ? 'border-teal-600 text-teal-700 bg-teal-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('integrity')}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Integrity
          </button>
          <button type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'plagiarism'
                ? 'border-amber-600 text-amber-700 bg-amber-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('plagiarism')}
          >
            <Search className="w-3.5 h-3.5" />
            Plagiarism
          </button>
          <button type="button"
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'style'
                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setActiveTab('style')}
          >
            <CheckSquare className="w-3.5 h-3.5" />
            Style
          </button>
        </div>
      </div>

      {/* Tab content — hidden via CSS to keep components mounted during checks */}
      <div className={activeTab === 'integrity' ? 'flex-1 overflow-hidden flex flex-col' : 'hidden'}>
        <IntegrityCheckContent
          documentId={documentId}
          onGoToLocation={onGoToLocation}
          onApplyFix={onApplyFix}
        />
      </div>
      <div className={activeTab === 'plagiarism' ? 'flex-1 overflow-hidden flex flex-col' : 'hidden'}>
        <PlagiarismCheckContent
          documentId={documentId}
          onGoToLocation={onGoToLocation}
          onApplyFix={onApplyFix}
        />
      </div>
      <div className={activeTab === 'style' ? 'flex-1 overflow-hidden flex flex-col' : 'hidden'}>
        <StyleCheckContent
          documentId={documentId}
          onGoToLocation={onGoToLocation}
          onApplyFix={onApplyFix}
        />
      </div>
    </div>
  );
}
