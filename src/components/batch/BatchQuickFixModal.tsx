import { useState, useEffect } from 'react';
import { X, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { BatchFileIssue } from '@/types/batch.types';

interface QuickFixField {
  issueCode: string;
  label: string;
  value: string;
  placeholder: string;
  defaultValue: string;
}

const METADATA_DEFAULTS: Record<string, { label: string; placeholder: string; defaultValue: string }> = {
  'METADATA-ACCESSMODE': {
    label: 'Access Mode',
    placeholder: 'e.g., textual, visual',
    defaultValue: 'textual, visual',
  },
  'METADATA-ACCESSMODESUFFICIENT': {
    label: 'Access Mode Sufficient',
    placeholder: 'e.g., textual',
    defaultValue: 'textual',
  },
  'METADATA-ACCESSIBILITYFEATURE': {
    label: 'Accessibility Features',
    placeholder: 'e.g., structuralNavigation, tableOfContents',
    defaultValue: 'structuralNavigation, tableOfContents, readingOrder',
  },
  'METADATA-ACCESSIBILITYHAZARD': {
    label: 'Accessibility Hazards',
    placeholder: 'e.g., none',
    defaultValue: 'none',
  },
  'METADATA-ACCESSIBILITYSUMMARY': {
    label: 'Accessibility Summary',
    placeholder: 'Description of accessibility features',
    defaultValue: 'This publication meets WCAG 2.1 AA standards.',
  },
};

interface BatchQuickFixModalProps {
  issues: BatchFileIssue[];
  mode: 'individual' | 'batch';
  onApply: (quickFixes: Array<{ issueCode: string; value: string }>) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export function BatchQuickFixModal({
  issues,
  mode,
  onApply,
  onClose,
  isLoading = false,
}: BatchQuickFixModalProps) {
  const [fields, setFields] = useState<QuickFixField[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const initialFields = issues.map((issue) => {
      const code = issue.code?.toUpperCase() || '';
      const defaults = METADATA_DEFAULTS[code] || {
        label: issue.title || code,
        placeholder: 'Enter value...',
        defaultValue: '',
      };

      return {
        issueCode: issue.code || '',
        label: defaults.label,
        value: mode === 'batch' ? defaults.defaultValue : '',
        placeholder: defaults.placeholder,
        defaultValue: defaults.defaultValue,
      };
    });
    setFields(initialFields);
  }, [issues, mode]);

  const handleFieldChange = (index: number, value: string) => {
    setFields((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    const validFixes = fields
      .filter((f) => f.value.trim() !== '')
      .map((f) => ({ issueCode: f.issueCode, value: f.value.trim() }));

    if (validFixes.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onApply(validFixes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledCount = fields.filter((f) => f.value.trim() !== '').length;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'batch' ? 'Batch Apply Quick-Fixes' : 'Apply Quick-Fixes'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            {mode === 'batch'
              ? 'Review and edit the pre-filled values below, then apply all fixes at once.'
              : 'Fill in the values for each metadata field below.'}
          </p>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.issueCode} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor={`field-${index}`}
                    className="font-medium text-gray-900"
                  >
                    {field.label}
                  </label>
                  <span className="text-xs font-mono text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                    {field.issueCode}
                  </span>
                </div>
                <input
                  id={`field-${index}`}
                  type="text"
                  value={field.value}
                  onChange={(e) => handleFieldChange(index, e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
                {mode === 'individual' && field.defaultValue && (
                  <button
                    type="button"
                    onClick={() => handleFieldChange(index, field.defaultValue)}
                    className="mt-1 text-xs text-amber-600 hover:text-amber-700"
                  >
                    Use default: {field.defaultValue}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            {filledCount} of {fields.length} fields filled
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting || isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={filledCount === 0 || isSubmitting || isLoading}
              leftIcon={
                isSubmitting || isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )
              }
            >
              {isSubmitting || isLoading
                ? 'Applying...'
                : `Apply ${filledCount} Fix${filledCount !== 1 ? 'es' : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
