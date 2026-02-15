import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Alert } from '../ui/Alert';
import { Loader2, Eye, CheckCircle } from 'lucide-react';
import { useQuickFix } from '../../hooks/useQuickFix';
import type { RemediationTask } from '../../types/pdf-remediation.types';

interface QuickFixModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  task: RemediationTask;
  onSuccess?: () => void;
}

export function QuickFixModal({ isOpen, onClose, jobId, task, onSuccess }: QuickFixModalProps) {
  const [field, setField] = useState<string>('');
  const [value, setValue] = useState<string>('');
  const [showPreview, setShowPreview] = useState(false);

  const {
    previewFix,
    applyQuickFix,
    preview,
    isLoadingPreview,
    isApplying,
  } = useQuickFix();

  // Determine which field to fix based on issue code
  useEffect(() => {
    if (isOpen) {
      const fieldFromIssue = getFieldFromIssueCode(task.issueCode);
      setField(fieldFromIssue);
      setValue('');
      setShowPreview(false);
    }
  }, [isOpen, task]);

  const handlePreview = async () => {
    if (!value.trim()) return;

    try {
      await previewFix(jobId, task.issueId, field, value);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      // Error already handled by previewFix (shows toast)
      // Don't advance modal state on error
    }
  };

  const handleApply = async () => {
    if (!value.trim()) return;

    try {
      const result = await applyQuickFix(jobId, task.issueId, field, value);

      if (result.success) {
        onSuccess?.();
        onClose();
      }
      // If result.success is false, error toast already shown by applyQuickFix
    } catch (error) {
      console.error('Apply failed:', error);
      // Error already handled by applyQuickFix (shows toast)
      // Don't close modal on error
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setValue('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl p-6">
        <DialogHeader className="space-y-2 pb-4">
          <DialogTitle>Quick Fix: {task.issueCode}</DialogTitle>
          <DialogDescription>{task.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Field Selection (if multiple options) */}
          {shouldShowFieldSelector(task.issueCode) && (
            <div className="space-y-2">
              <Label htmlFor="field">Field to Fix</Label>
              <Select value={field} onValueChange={setField}>
                <SelectTrigger id="field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="language">Document Language</SelectItem>
                  <SelectItem value="title">Document Title</SelectItem>
                  <SelectItem value="metadata">Metadata</SelectItem>
                  <SelectItem value="creator">Creator</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Value Input */}
          <div className="space-y-2">
            <Label htmlFor="value">
              {getFieldLabel(field)}
              <span className="text-red-500 ml-1">*</span>
            </Label>
            {renderInputField(field, value, setValue)}
            <p className="text-sm text-gray-500">{getFieldHint(field)}</p>
          </div>

          {/* Preview Section */}
          {showPreview && preview && (
            <Alert variant="info" className="border-blue-200 bg-blue-50">
              <div className="flex items-start gap-2">
                <Eye className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <div className="space-y-2 mt-2">
                    <div>
                      <span className="font-semibold text-gray-900">Current:</span>
                      <span className="ml-2 text-gray-600">
                        {preview.before || '(empty)'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-900">New:</span>
                      <span className="ml-2 text-green-600">{preview.after}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          {!showPreview ? (
            <Button onClick={handlePreview} disabled={!value.trim() || isLoadingPreview}>
              {isLoadingPreview ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading Preview...
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </>
              )}
            </Button>
          ) : (
            <Button onClick={handleApply} disabled={isApplying}>
              {isApplying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Apply Fix
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper Functions

function getFieldFromIssueCode(code: string): string {
  // Normalize code to uppercase for case-insensitive matching
  const normalizedCode = code?.toUpperCase() || '';

  // Use substring matching to handle variations and avoid exact lookup brittleness
  // This matches the strategy in PdfRemediationPlanPage.getFixField()
  if (normalizedCode.includes('LANGUAGE') || normalizedCode === 'MATTERHORN-11-001') {
    return 'language';
  }
  if (normalizedCode.includes('TITLE') || normalizedCode === 'MATTERHORN-01-003' || normalizedCode === 'WCAG-2.4.2') {
    return 'title';
  }
  if (normalizedCode.includes('METADATA') || normalizedCode === 'MATTERHORN-07-001') {
    return 'metadata';
  }
  if (normalizedCode.includes('CREATOR')) {
    return 'creator';
  }

  // Default fallback
  return 'language';
}

function shouldShowFieldSelector(code: string): boolean {
  // Only show field selector for generic metadata issues
  // Use normalized substring matching instead of exact equals
  const normalizedCode = code?.toUpperCase() || '';
  return normalizedCode.includes('METADATA') || normalizedCode === 'MATTERHORN-07-001';
}

function getFieldLabel(field: string): string {
  const labels: Record<string, string> = {
    language: 'Document Language',
    title: 'Document Title',
    metadata: 'Metadata Field',
    creator: 'Creator/Author',
  };
  return labels[field] || 'Value';
}

function getFieldHint(field: string): string {
  const hints: Record<string, string> = {
    language: 'Enter language code (e.g., "en" for English, "es" for Spanish)',
    title: 'Enter a descriptive title for this document',
    metadata: 'Enter accessibility metadata',
    creator: 'Enter author or organization name',
  };
  return hints[field] || '';
}

function renderInputField(
  field: string,
  value: string,
  setValue: (value: string) => void
) {
  if (field === 'language') {
    // Language dropdown for common languages
    return (
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger id="value">
          <SelectValue placeholder="Select language..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English (en)</SelectItem>
          <SelectItem value="es">Spanish (es)</SelectItem>
          <SelectItem value="fr">French (fr)</SelectItem>
          <SelectItem value="de">German (de)</SelectItem>
          <SelectItem value="zh">Chinese (zh)</SelectItem>
          <SelectItem value="ja">Japanese (ja)</SelectItem>
          <SelectItem value="ar">Arabic (ar)</SelectItem>
          <SelectItem value="hi">Hindi (hi)</SelectItem>
          <SelectItem value="pt">Portuguese (pt)</SelectItem>
          <SelectItem value="ru">Russian (ru)</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      id="value"
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={`Enter ${getFieldLabel(field).toLowerCase()}...`}
      autoFocus
    />
  );
}
