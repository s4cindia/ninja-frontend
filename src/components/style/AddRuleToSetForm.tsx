/**
 * AddRuleToSetForm Component
 *
 * Inline form for adding a new rule to a rule set.
 * Includes fields for name, description, category, type, severity,
 * pattern, preferred term, and avoid terms.
 */

import { Button } from '@/components/ui/Button';
import {
  categoryOptions, ruleTypeOptions, severityOptions,
} from './constants';
import type { RuleFormData } from './constants';
import type { StyleCategory, HouseRuleType, StyleSeverity } from '@/types/style';

interface AddRuleToSetFormProps {
  formData: RuleFormData;
  onFormDataChange: (data: RuleFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}

export function AddRuleToSetForm({
  formData, onFormDataChange, onSubmit, onCancel, isSubmitting,
}: AddRuleToSetFormProps) {
  const update = <K extends keyof RuleFormData>(key: K, value: RuleFormData[K]) => {
    onFormDataChange({ ...formData, [key]: value });
  };

  return (
    <div className="mb-6 p-4 border rounded-lg bg-gray-50">
      <h4 className="font-medium mb-3">Add New Rule</h4>
      <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
          <input type="text" value={formData.name} onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm" required />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input type="text" value={formData.description} onChange={(e) => update('description', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={formData.category} onChange={(e) => update('category', e.target.value as StyleCategory)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            {categoryOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
          <select value={formData.ruleType} onChange={(e) => update('ruleType', e.target.value as HouseRuleType)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            {ruleTypeOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
          <select value={formData.severity} onChange={(e) => update('severity', e.target.value as StyleSeverity)}
            className="w-full px-3 py-2 border rounded-lg text-sm">
            {severityOptions.map((opt) => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pattern (Regex)</label>
          <input type="text" value={formData.pattern} onChange={(e) => update('pattern', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono" placeholder="e.g., \bcolor\b" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Term</label>
          <input type="text" value={formData.preferredTerm} onChange={(e) => update('preferredTerm', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., colour" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Avoid Terms (comma-separated)</label>
          <input type="text" value={formData.avoidTerms} onChange={(e) => update('avoidTerms', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g., color, colr" />
        </div>
        <div className="col-span-2 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" size="sm" variant="primary" isLoading={isSubmitting}>Add Rule</Button>
        </div>
      </form>
    </div>
  );
}
