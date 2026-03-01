/**
 * StyleGuideUploadTab Component
 *
 * Upload style guide document and trigger AI extraction.
 * Shows the upload area when no rules have been extracted yet.
 */

import { useRef } from 'react';
import { FileText, Upload, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ExtractedRulesReview } from './ExtractedRulesReview';
import { SaveRuleSetDialog } from './SaveRuleSetDialog';
import type { ExtractedRule, ExtractionResult, TabType } from './houseRulesTypes';
import type { StyleGuideType } from '@/types/style';

interface StyleGuideUploadTabProps {
  styleGuideFile: File | null;
  onFileChange: (file: File | null) => void;
  onUpload: () => void;
  isUploading: boolean;
  extractedRules: ExtractedRule[];
  selectedExtractedRules: Set<number>;
  extractionResult: ExtractionResult | null;
  onToggleRule: (idx: number) => void;
  onToggleAll: () => void;
  onClearExtraction: () => void;
  onOpenSaveDialog: () => void;
  showSaveDialog: boolean;
  onCloseSaveDialog: () => void;
  saveRuleSetName: string;
  onSaveRuleSetNameChange: (name: string) => void;
  saveRuleSetDescription: string;
  onSaveRuleSetDescriptionChange: (desc: string) => void;
  saveRuleSetStyleGuide: StyleGuideType | '';
  onSaveRuleSetStyleGuideChange: (guide: StyleGuideType | '') => void;
  onSaveExtractedRules: () => void;
  isSaving: boolean;
  onTabChange: (tab: TabType) => void;
}

export function StyleGuideUploadTab({
  styleGuideFile,
  onFileChange,
  onUpload,
  isUploading,
  extractedRules,
  selectedExtractedRules,
  extractionResult,
  onToggleRule,
  onToggleAll,
  onClearExtraction,
  onOpenSaveDialog,
  showSaveDialog,
  onCloseSaveDialog,
  saveRuleSetName,
  onSaveRuleSetNameChange,
  saveRuleSetDescription,
  onSaveRuleSetDescriptionChange,
  saveRuleSetStyleGuide,
  onSaveRuleSetStyleGuideChange,
  onSaveExtractedRules,
  isSaving,
}: StyleGuideUploadTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (extractedRules.length > 0) {
    return (
      <div className="p-6 space-y-4">
        <ExtractedRulesReview
          extractedRules={extractedRules}
          selectedRules={selectedExtractedRules}
          extractionResult={extractionResult}
          onToggleRule={onToggleRule}
          onToggleAll={onToggleAll}
          onCancel={onClearExtraction}
          onSave={onOpenSaveDialog}
        />
        {showSaveDialog && (
          <SaveRuleSetDialog
            name={saveRuleSetName}
            onNameChange={onSaveRuleSetNameChange}
            description={saveRuleSetDescription}
            onDescriptionChange={onSaveRuleSetDescriptionChange}
            styleGuide={saveRuleSetStyleGuide}
            onStyleGuideChange={onSaveRuleSetStyleGuideChange}
            onSave={onSaveExtractedRules}
            onClose={onCloseSaveDialog}
            isSaving={isSaving}
          />
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
        <FileText className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          Upload Your Style Guide
        </h3>
        <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
          Upload a PDF or Word document containing your style guide. We'll extract
          the rules automatically using AI and let you review them before saving.
        </p>
        <div className="mt-6">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => onFileChange(e.target.files?.[0] || null)}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<Upload className="h-4 w-4" />}
          >
            Select File
          </Button>
        </div>
        {styleGuideFile && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-gray-700">{styleGuideFile.name}</span>
            <Button
              size="sm"
              variant="primary"
              onClick={onUpload}
              isLoading={isUploading}
            >
              Extract Rules
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onFileChange(null)}
            >
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Supported Formats</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>{'\u2022'} PDF documents (up to 50MB)</li>
          <li>{'\u2022'} Microsoft Word (.docx, .doc)</li>
        </ul>
        <h4 className="text-sm font-medium text-blue-800 mt-4 mb-2">What Gets Extracted</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>{'\u2022'} Terminology preferences (use/avoid terms)</li>
          <li>{'\u2022'} Punctuation and capitalization rules</li>
          <li>{'\u2022'} Formatting guidelines</li>
          <li>{'\u2022'} Grammar and style requirements</li>
          <li>{'\u2022'} Citation and reference standards</li>
        </ul>
      </div>
    </div>
  );
}
