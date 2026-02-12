/**
 * QuickFixModal Component
 *
 * Modal for applying quick fixes to individual issues
 */

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { usePreviewFix, useApplyQuickFix } from '@/hooks/useQuickFix';

interface QuickFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  issueId: string;
  issueCode: string;
  issueDescription: string;
  fixField: 'language' | 'title' | 'metadata' | 'creator';
  onSuccess?: (remediatedFileUrl: string) => void;
}

// Helper function moved outside component to avoid ESLint warning
const getDefaultValue = (field: 'language' | 'title' | 'metadata' | 'creator'): string => {
  switch (field) {
    case 'language':
      return 'en-US';
    case 'creator':
      return 'Ninja Accessibility Tool';
    case 'title':
      return '';
    case 'metadata':
      return 'N/A';
    default:
      return '';
  }
};

export const QuickFixModal: React.FC<QuickFixModalProps> = ({
  isOpen,
  onClose,
  jobId,
  issueId,
  issueCode,
  issueDescription,
  fixField,
  onSuccess,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const applyFixMutation = useApplyQuickFix();

  // Preview query (only runs when showPreview is true)
  const previewQuery = usePreviewFix({
    jobId,
    issueId,
    field: fixField,
    value: inputValue,
  });

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue(getDefaultValue(fixField));
      setShowPreview(false);
    }
  }, [isOpen, fixField]);

  const getFieldLabel = (field: typeof fixField): string => {
    switch (field) {
      case 'language':
        return 'Document Language';
      case 'title':
        return 'Document Title';
      case 'creator':
        return 'Creator/Producer';
      case 'metadata':
        return 'Accessibility Metadata';
      default:
        return field;
    }
  };

  const isValueRequired = fixField === 'title';
  const isValueEditable = fixField !== 'metadata';

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleApply = async () => {
    try {
      const result = await applyFixMutation.mutateAsync({
        jobId,
        issueId,
        field: fixField,
        value: isValueEditable ? inputValue : undefined,
      });

      if (onSuccess) {
        onSuccess(result.remediatedFileUrl);
      }

      onClose();
    } catch (error) {
      // Error handled by mutation onError
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">Quick Fix</h2>
            <p className="text-sm text-gray-600 mt-1">{issueCode}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Issue Description */}
          <Alert variant="info">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{issueDescription}</span>
          </Alert>

          {/* Input Field */}
          <div className="space-y-2">
            <Label htmlFor="fix-value">{getFieldLabel(fixField)}</Label>
            {isValueEditable ? (
              <Input
                id="fix-value"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={`Enter ${getFieldLabel(fixField).toLowerCase()}`}
                required={isValueRequired}
              />
            ) : (
              <div className="p-3 bg-gray-100 rounded border text-sm text-gray-700">
                Will add accessibility metadata (MarkInfo: Marked = true)
              </div>
            )}
            {isValueRequired && !inputValue && (
              <p className="text-xs text-red-600">This field is required</p>
            )}
          </div>

          {/* Preview Section */}
          {showPreview && previewQuery.data && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <h3 className="font-medium text-blue-900">Preview</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">Current Value:</p>
                  <p className="text-gray-900 mt-1">
                    {previewQuery.data.currentValue || '(empty)'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-medium">New Value:</p>
                  <p className="text-green-700 font-medium mt-1">
                    {previewQuery.data.proposedValue}
                  </p>
                </div>
              </div>

              <p className="text-xs text-gray-600 mt-2">
                {previewQuery.data.message}
              </p>
            </div>
          )}

          {previewQuery.isLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading preview...
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>

          {!showPreview && (
            <Button
              variant="secondary"
              onClick={handlePreview}
              disabled={isValueRequired && !inputValue}
            >
              Preview Changes
            </Button>
          )}

          <Button
            variant="primary"
            onClick={handleApply}
            disabled={
              (isValueRequired && !inputValue) || applyFixMutation.isPending
            }
          >
            {applyFixMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              'Apply Fix'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
