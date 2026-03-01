/**
 * RuleFormModal Component
 *
 * Create/edit rule form with all fields including test rule panel.
 */
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { categoryOptions, ruleTypeOptions, severityOptions, styleGuideOptions } from './constants';
import { RuleTestPanel } from './RuleTestPanel';
import type { RuleFormData } from './houseRulesTypes';

interface TestRuleResult {
  matches: Array<{ matchedText: string; suggestedFix: string }>;
  error?: string;
}

interface RuleFormModalProps {
  isEditing: boolean;
  formData: RuleFormData;
  onFormChange: (field: keyof RuleFormData, value: string | boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  isSaving: boolean;
  testText: string;
  onTestTextChange: (text: string) => void;
  showTestPanel: boolean;
  onToggleTestPanel: () => void;
  onTestRule: () => void;
  isTestingRule: boolean;
  testResult: TestRuleResult | undefined;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1';

export function RuleFormModal({
  isEditing, formData, onFormChange, onSubmit, onClose, isSaving,
  testText, onTestTextChange, showTestPanel, onToggleTestPanel,
  onTestRule, isTestingRule, testResult,
}: RuleFormModalProps) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">
          {isEditing ? 'Edit Rule' : 'Create New Rule'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className={labelCls}>Rule Name <span className="text-red-500">*</span></label>
          <input type="text" value={formData.name} required
            onChange={(e) => onFormChange('name', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Description</label>
          <textarea value={formData.description} rows={2}
            onChange={(e) => onFormChange('description', e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Category</label>
            <select value={formData.category}
              onChange={(e) => onFormChange('category', e.target.value)} className={inputCls}>
              {categoryOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Rule Type</label>
            <select value={formData.ruleType}
              onChange={(e) => onFormChange('ruleType', e.target.value)} className={inputCls}>
              {ruleTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        {formData.ruleType === 'PATTERN' && (
          <div>
            <label className={labelCls}>Regex Pattern</label>
            <input type="text" value={formData.pattern}
              onChange={(e) => onFormChange('pattern', e.target.value)}
              placeholder="e.g., \b(colour|favourite)\b"
              className={`${inputCls} font-mono text-sm`} />
          </div>
        )}
        {formData.ruleType === 'TERMINOLOGY' && (
          <>
            <div>
              <label className={labelCls}>Preferred Term</label>
              <input type="text" value={formData.preferredTerm} placeholder="The term to use"
                onChange={(e) => onFormChange('preferredTerm', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Terms to Avoid (comma-separated)</label>
              <input type="text" value={formData.avoidTerms} placeholder="term1, term2, term3"
                onChange={(e) => onFormChange('avoidTerms', e.target.value)} className={inputCls} />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Severity</label>
            <select value={formData.severity}
              onChange={(e) => onFormChange('severity', e.target.value)} className={inputCls}>
              {severityOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Base Style Guide</label>
            <select value={formData.baseStyleGuide}
              onChange={(e) => onFormChange('baseStyleGuide', e.target.value)} className={inputCls}>
              {styleGuideOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input type="checkbox" id="isActive" checked={formData.isActive}
            onChange={(e) => onFormChange('isActive', e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
          <label htmlFor="isActive" className="text-sm text-gray-700">Rule is active</label>
        </div>
        <RuleTestPanel
          testText={testText} onTestTextChange={onTestTextChange}
          showTestPanel={showTestPanel} onToggleTestPanel={onToggleTestPanel}
          onTestRule={onTestRule} isTestingRule={isTestingRule} testResult={testResult} />
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" isLoading={isSaving}>
            {isEditing ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </form>
    </div>
  );
}
