/**
 * SaveRuleSetDialog Component
 *
 * Modal dialog for saving extracted rules as a named rule set.
 */

import { Button } from '@/components/ui/Button';
import { styleGuideOptions } from './constants';
import type { StyleGuideType } from '@/types/style';

interface SaveRuleSetDialogProps {
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (desc: string) => void;
  styleGuide: StyleGuideType | '';
  onStyleGuideChange: (guide: StyleGuideType | '') => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
}

export function SaveRuleSetDialog({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  styleGuide,
  onStyleGuideChange,
  onSave,
  onClose,
  isSaving,
}: SaveRuleSetDialogProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="save-dialog-title"
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 id="save-dialog-title" className="text-lg font-medium text-gray-900 mb-4">
          Save as Rule Set
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Enter a name for this rule set. You can select it later when validating documents.
        </p>
        <div className="space-y-4">
          <div>
            <label htmlFor="ruleset-name" className="block text-sm font-medium text-gray-700 mb-1">
              Rule Set Name <span className="text-red-500">*</span>
            </label>
            <input
              id="ruleset-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., Chicago Manual of Style 17th"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="ruleset-description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="ruleset-description"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="ruleset-styleguide" className="block text-sm font-medium text-gray-700 mb-1">
              Base Style Guide
            </label>
            <select
              id="ruleset-styleguide"
              value={styleGuide}
              onChange={(e) => onStyleGuideChange(e.target.value as StyleGuideType | '')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {styleGuideOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            isLoading={isSaving}
            disabled={!name.trim()}
          >
            Save Rule Set
          </Button>
        </div>
      </div>
    </div>
  );
}
