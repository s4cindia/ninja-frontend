/**
 * ExtractedRulesReview Component
 *
 * Displays extracted rules from a style guide upload with
 * checkboxes for selecting which rules to save.
 */

import { CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ExtractedRule, ExtractionResult } from './houseRulesTypes';

interface ExtractedRulesReviewProps {
  extractedRules: ExtractedRule[];
  selectedRules: Set<number>;
  extractionResult: ExtractionResult | null;
  onToggleRule: (idx: number) => void;
  onToggleAll: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export function ExtractedRulesReview({
  extractedRules,
  selectedRules,
  extractionResult,
  onToggleRule,
  onToggleAll,
  onCancel,
  onSave,
}: ExtractedRulesReviewProps) {
  return (
    <>
      {/* Extraction Summary */}
      {extractionResult && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h4 className="font-medium text-green-800">
              {extractionResult.totalRulesExtracted} Rules Extracted
            </h4>
          </div>
          {extractionResult.documentTitle && (
            <p className="text-sm text-green-700 mb-2">
              From: {extractionResult.documentTitle}
            </p>
          )}
          <div className="flex flex-wrap gap-2 mb-2">
            {Object.entries(extractionResult.categories).map(([cat, count]) => (
              <span
                key={cat}
                className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
              >
                {cat}: {count}
              </span>
            ))}
          </div>
          {extractionResult.warnings.length > 0 && (
            <div className="mt-2 pt-2 border-t border-green-200">
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {extractionResult.warnings.length} warning(s)
              </p>
            </div>
          )}
        </div>
      )}

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedRules.size === extractedRules.length}
            onChange={onToggleAll}
            className="rounded border-gray-300 text-primary-600"
          />
          <span className="text-sm text-gray-700">
            Select All ({selectedRules.size} of {extractedRules.length} selected)
          </span>
        </label>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={onSave}
            disabled={selectedRules.size === 0}
          >
            Save {selectedRules.size} Rule(s) as Rule Set
          </Button>
        </div>
      </div>

      {/* Extracted Rules List */}
      <div className="space-y-3">
        {extractedRules.map((rule, idx) => (
          <div
            key={idx}
            className={cn(
              'p-4 border rounded-lg cursor-pointer transition-colors',
              selectedRules.has(idx)
                ? 'border-primary-300 bg-primary-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            )}
            onClick={() => onToggleRule(idx)}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedRules.has(idx)}
                onChange={() => onToggleRule(idx)}
                onClick={(e) => e.stopPropagation()}
                className="mt-1 rounded border-gray-300 text-primary-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-gray-900">{rule.name}</h4>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-xs font-medium',
                      rule.severity === 'ERROR' && 'bg-red-100 text-red-700',
                      rule.severity === 'WARNING' && 'bg-amber-100 text-amber-700',
                      rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-700'
                    )}
                  >
                    {rule.severity}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {rule.category}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                    {rule.ruleType}
                  </span>
                  {rule.sourceSection && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                      Source: {rule.sourceSection}
                    </span>
                  )}
                </div>
                {rule.examples && rule.examples.length > 0 && (
                  <div className="mt-2 text-xs">
                    <span className="text-gray-500">Example: </span>
                    <span className="text-red-600 line-through">
                      {rule.examples[0].incorrect}
                    </span>
                    <span className="text-gray-400 mx-1">{'\u2192'}</span>
                    <span className="text-green-600">{rule.examples[0].correct}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
