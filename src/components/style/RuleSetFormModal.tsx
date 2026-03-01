/**
 * RuleSetFormModal Component
 *
 * Modal dialog for creating or editing a rule set.
 * Includes fields for name, description, base style guide,
 * and a default toggle.
 */

import { Button } from '@/components/ui/Button';
import { styleGuideOptions } from './constants';
import type { RuleSetFormData } from './constants';
import type { StyleGuideType, HouseRuleSet, CreateRuleSetInput } from '@/types/style';

interface RuleSetFormModalProps {
  editingRuleSet: HouseRuleSet | null;
  formData: RuleSetFormData;
  onFormDataChange: (data: RuleSetFormData) => void;
  onSubmit: (input: CreateRuleSetInput, isEditing: boolean) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
}

export function RuleSetFormModal({
  editingRuleSet, formData, onFormDataChange, onSubmit, onClose, isSubmitting,
}: RuleSetFormModalProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input: CreateRuleSetInput = {
      name: formData.name,
      description: formData.description || undefined,
      baseStyleGuide: formData.baseStyleGuide || undefined,
      isDefault: formData.isDefault,
    };
    await onSubmit(input, !!editingRuleSet);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingRuleSet ? 'Edit Rule Set' : 'Create Rule Set'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text" value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => onFormDataChange({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Base Style Guide</label>
            <select
              value={formData.baseStyleGuide}
              onChange={(e) => onFormDataChange({ ...formData, baseStyleGuide: e.target.value as StyleGuideType | '' })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {styleGuideOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox" id="isDefault" checked={formData.isDefault}
              onChange={(e) => onFormDataChange({ ...formData, isDefault: e.target.checked })}
              className="rounded border-gray-300"
            />
            <label htmlFor="isDefault" className="text-sm text-gray-700">
              Set as default rule set
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              {editingRuleSet ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
