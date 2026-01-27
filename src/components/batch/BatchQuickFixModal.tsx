import { useState } from 'react';
import { X, Zap, Loader2, Code } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { AccessModeSelector } from './AccessModeSelector';
import { AccessModeSufficientSelector } from './AccessModeSufficientSelector';
import { AccessibilityHazardsSelector } from './AccessibilityHazardsSelector';
import {
  DEFAULT_METADATA_VALUES,
  formatAccessMode,
} from '@/constants/epubMetadata';
import type { BatchFileIssue } from '@/types/batch.types';

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
  const [accessMode, setAccessMode] = useState<string[]>(
    mode === 'batch' ? [...DEFAULT_METADATA_VALUES.accessMode] : []
  );
  const [accessModeSufficient, setAccessModeSufficient] = useState<string>(
    mode === 'batch' ? DEFAULT_METADATA_VALUES.accessModeSufficient : ''
  );
  const [accessibilityFeature, setAccessibilityFeature] = useState(
    mode === 'batch' ? DEFAULT_METADATA_VALUES.accessibilityFeature : ''
  );
  const [accessibilityHazard, setAccessibilityHazard] = useState<string | string[]>(
    mode === 'batch' ? DEFAULT_METADATA_VALUES.accessibilityHazard : 'none'
  );
  const [accessibilitySummary, setAccessibilitySummary] = useState(
    mode === 'batch' ? DEFAULT_METADATA_VALUES.accessibilitySummary : ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const issueCodes = issues.map(i => i.code?.toUpperCase() || '');
  const hasAccessMode = issueCodes.some(c => c.includes('ACCESSMODE') && !c.includes('SUFFICIENT'));
  const hasAccessModeSufficient = issueCodes.some(c => c.includes('ACCESSMODESUFFICIENT'));
  const hasAccessibilityFeature = issueCodes.some(c => c.includes('ACCESSIBILITYFEATURE'));
  const hasAccessibilityHazard = issueCodes.some(c => c.includes('ACCESSIBILITYHAZARD'));
  const hasAccessibilitySummary = issueCodes.some(c => c.includes('ACCESSIBILITYSUMMARY'));

  const isValid =
    (!hasAccessMode || accessMode.length > 0) &&
    (!hasAccessModeSufficient || accessModeSufficient) &&
    (!hasAccessibilityFeature || accessibilityFeature.trim().length > 0) &&
    (!hasAccessibilityHazard || (typeof accessibilityHazard === 'string' || accessibilityHazard.length > 0)) &&
    (!hasAccessibilitySummary || accessibilitySummary.trim().length >= 20);

  const handleSubmit = async () => {
    const quickFixes: Array<{ issueCode: string; value: string }> = [];

    if (hasAccessMode && accessMode.length > 0) {
      quickFixes.push({
        issueCode: 'METADATA-ACCESSMODE',
        value: formatAccessMode(accessMode),
      });
    }

    if (hasAccessModeSufficient && accessModeSufficient) {
      quickFixes.push({
        issueCode: 'METADATA-ACCESSMODESUFFICIENT',
        value: accessModeSufficient,
      });
    }

    if (hasAccessibilityFeature && accessibilityFeature.trim()) {
      quickFixes.push({
        issueCode: 'METADATA-ACCESSIBILITYFEATURE',
        value: accessibilityFeature.trim(),
      });
    }

    if (hasAccessibilityHazard) {
      const isValidString = typeof accessibilityHazard === 'string' && accessibilityHazard.trim() !== '';
      const isValidArray = Array.isArray(accessibilityHazard) && accessibilityHazard.length > 0;
      
      if (isValidString || isValidArray) {
        const hazardValue = Array.isArray(accessibilityHazard)
          ? accessibilityHazard.join(', ')
          : accessibilityHazard;
        quickFixes.push({
          issueCode: 'METADATA-ACCESSIBILITYHAZARD',
          value: hazardValue,
        });
      }
    }

    if (hasAccessibilitySummary && accessibilitySummary.trim()) {
      quickFixes.push({
        issueCode: 'METADATA-ACCESSIBILITYSUMMARY',
        value: accessibilitySummary.trim(),
      });
    }

    if (quickFixes.length === 0) return;

    setIsSubmitting(true);
    try {
      await onApply(quickFixes);
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewXML = `<!-- Access Mode -->
${accessMode.map(mode => `<meta property="schema:accessMode">${mode}</meta>`).join('\n')}

<!-- Access Mode Sufficient -->
<meta property="schema:accessModeSufficient">${accessModeSufficient}</meta>

<!-- Accessibility Features -->
${accessibilityFeature.split(',').map(feat =>
  `<meta property="schema:accessibilityFeature">${feat.trim()}</meta>`
).join('\n')}

<!-- Accessibility Hazards -->
${Array.isArray(accessibilityHazard)
  ? accessibilityHazard.map(h => `<meta property="schema:accessibilityHazard">${h}</meta>`).join('\n')
  : `<meta property="schema:accessibilityHazard">${accessibilityHazard}</meta>`
}

<!-- Accessibility Summary -->
<meta property="schema:accessibilitySummary">${accessibilitySummary}</meta>`;

  const filledCount = [
    hasAccessMode && accessMode.length > 0,
    hasAccessModeSufficient && accessModeSufficient,
    hasAccessibilityFeature && accessibilityFeature.trim(),
    hasAccessibilityHazard && (typeof accessibilityHazard === 'string' || accessibilityHazard.length > 0),
    hasAccessibilitySummary && accessibilitySummary.trim(),
  ].filter(Boolean).length;

  const totalFields = [
    hasAccessMode,
    hasAccessModeSufficient,
    hasAccessibilityFeature,
    hasAccessibilityHazard,
    hasAccessibilitySummary,
  ].filter(Boolean).length;

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
          <p className="text-sm text-gray-600 mb-6">
            {mode === 'batch'
              ? 'Review and edit the pre-filled values below, then apply all fixes at once.'
              : 'Select values for each metadata field below.'}
          </p>

          <div className="space-y-6">
            {hasAccessMode && (
              <AccessModeSelector
                value={accessMode}
                onChange={setAccessMode}
              />
            )}

            {hasAccessModeSufficient && (
              <AccessModeSufficientSelector
                value={accessModeSufficient}
                onChange={setAccessModeSufficient}
                accessModes={accessMode}
              />
            )}

            {hasAccessibilityFeature && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    Accessibility Features
                  </label>
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    METADATA-ACCESSIBILITYFEATURE
                  </span>
                </div>
                <input
                  type="text"
                  value={accessibilityFeature}
                  onChange={(e) => setAccessibilityFeature(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="structuralNavigation, tableOfContents, readingOrder"
                />
                <p className="text-xs text-gray-500">
                  Comma-separated list. Will be replaced with checkboxes in next update.
                </p>
              </div>
            )}

            {hasAccessibilityHazard && (
              <AccessibilityHazardsSelector
                value={accessibilityHazard}
                onChange={setAccessibilityHazard}
              />
            )}

            {hasAccessibilitySummary && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-900">
                    Accessibility Summary
                  </label>
                  <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                    METADATA-ACCESSIBILITYSUMMARY
                  </span>
                </div>
                <textarea
                  value={accessibilitySummary}
                  onChange={(e) => setAccessibilitySummary(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="This publication meets WCAG 2.1 AA standards..."
                />
                <p className="text-xs text-gray-500">
                  {accessibilitySummary.length} / 500 characters
                  {accessibilitySummary.length < 20 && accessibilitySummary.length > 0 && (
                    <span className="text-orange-600 ml-2">
                      (minimum 20 characters)
                    </span>
                  )}
                </p>
              </div>
            )}

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <Code className="h-4 w-4" />
                {showPreview ? 'Hide XML Preview' : 'Show XML Preview'}
              </button>

              {showPreview && (
                <div className="mt-3 p-3 bg-gray-900 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-100 font-mono whitespace-pre">
                    {previewXML}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            {filledCount} of {totalFields} fields filled
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting || isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting || isLoading}
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
