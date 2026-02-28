/**
 * ValidationHeader Component
 *
 * Displays the validate button, document info, rule set picker,
 * validation progress, and error/help messages.
 */

import {
  Play,
  RefreshCw,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ValidationSummary, ValidationProgress, RuleSet } from '@/types/style';

interface ValidationHeaderProps {
  documentId: string;
  summary: ValidationSummary | undefined;
  isValidating: boolean;
  isStartPending: boolean;
  jobProgress: ValidationProgress | undefined;
  validationError: string | null;
  onDismissError: () => void;
  onStartValidation: () => void;
  selectedRuleSets: string[];
  setSelectedRuleSets: React.Dispatch<React.SetStateAction<string[]>>;
  showRuleSetPicker: boolean;
  setShowRuleSetPicker: React.Dispatch<React.SetStateAction<boolean>>;
  builtInRuleSets: RuleSet[];
  customRuleSets: RuleSet[];
  allRuleSets: RuleSet[];
}

export function ValidationHeader({
  documentId,
  summary,
  isValidating,
  isStartPending,
  jobProgress,
  validationError,
  onDismissError,
  onStartValidation,
  selectedRuleSets,
  setSelectedRuleSets,
  showRuleSetPicker,
  setShowRuleSetPicker,
  builtInRuleSets,
  customRuleSets,
  allRuleSets,
}: ValidationHeaderProps) {
  const handleRuleSetToggle = (ruleSetId: string, checked: boolean) => {
    if (checked) {
      setSelectedRuleSets((prev) => [...prev, ruleSetId]);
    } else {
      setSelectedRuleSets((prev) => prev.filter((id) => id !== ruleSetId));
    }
  };

  return (
    <div className="flex-shrink-0 border-b px-4 py-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
        <Button
          size="sm"
          variant="primary"
          onClick={onStartValidation}
          isLoading={isStartPending || isValidating}
          leftIcon={isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </Button>
      </div>

      {/* Document Info */}
      <div className="mt-2 text-sm font-medium text-gray-700 truncate" title={summary?.fileName || documentId}>
        {summary?.fileName || `Document ${documentId.slice(0, 8)}...`}
      </div>

      {/* Rule Set Picker */}
      <div className="mt-2">
        <button type="button"
          onClick={() => setShowRuleSetPicker(!showRuleSetPicker)}
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
        >
          {selectedRuleSets.length > 0
            ? selectedRuleSets.includes('general')
              ? 'General Quality' + (selectedRuleSets.length > 1 ? ` + ${selectedRuleSets.length - 1} more` : '')
              : `${selectedRuleSets.length} rule set(s) selected`
            : 'General Quality (default)'}
          <ChevronDown className={cn('h-4 w-4 transition-transform', showRuleSetPicker && 'rotate-180')} />
        </button>
        {showRuleSetPicker && allRuleSets.length > 0 && (
          <div className="mt-2 p-2 bg-gray-50 rounded-md space-y-2">
            {/* Built-in Rule Sets */}
            {builtInRuleSets.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Built-in Rule Sets</p>
                <div className="space-y-1">
                  {builtInRuleSets.map((rs) => (
                    <label key={rs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRuleSets.includes(rs.id)}
                        onChange={(e) => handleRuleSetToggle(rs.id, e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">{rs.name}</span>
                      <span className="text-xs text-gray-500">({rs.ruleCount} rules)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Rule Sets */}
            {customRuleSets.length > 0 && (
              <div className={builtInRuleSets.length > 0 ? 'pt-2 border-t border-gray-200' : ''}>
                <p className="text-xs font-medium text-gray-500 mb-1">Your Custom Rule Sets</p>
                <div className="space-y-1">
                  {customRuleSets.map((rs) => (
                    <label key={rs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRuleSets.includes(rs.id)}
                        onChange={(e) => handleRuleSetToggle(rs.id, e.target.checked)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-gray-700">{rs.name}</span>
                      {rs.styleGuide && (
                        <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded">
                          {rs.styleGuide}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">({rs.ruleCount} rules)</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Validation Progress */}
      {isValidating && jobProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
            <span>{jobProgress.currentPhase || 'Processing...'}</span>
            <span>{jobProgress.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-600 transition-all duration-300"
              style={{ width: `${jobProgress.progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {jobProgress.violationsFound} violations found
          </p>
        </div>
      )}

      {/* Validation Error */}
      {validationError && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-700">{validationError}</p>
              <button type="button"
                onClick={onDismissError}
                className="text-xs text-red-600 hover:text-red-800 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help tip */}
      {!isValidating && !validationError && !summary && (
        <div className="mt-3 p-2 bg-blue-50 rounded-md">
          <p className="text-xs text-blue-700">
            <strong>Tip:</strong> Save your document (Ctrl+S) before validating to ensure all changes are checked.
          </p>
        </div>
      )}
    </div>
  );
}
