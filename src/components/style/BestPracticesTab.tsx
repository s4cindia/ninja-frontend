/**
 * BestPracticesTab Component
 *
 * Displays default best practices rules that can be imported
 * into the user's house rules.
 */

import { Upload, Loader2, BookOpen } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface BestPracticeRule {
  name: string;
  description: string;
  category: string;
  ruleType: string;
  severity: string;
  examples?: Array<{ incorrect: string; correct: string }>;
}

interface BestPracticesTabProps {
  bestPractices: BestPracticeRule[];
  isLoading: boolean;
  categories?: Record<string, unknown>;
  selectedPractices: Set<string>;
  onTogglePractice: (name: string) => void;
  onToggleAll: () => void;
  onImport: () => void;
  isImporting: boolean;
}

export function BestPracticesTab({
  bestPractices,
  isLoading,
  categories,
  selectedPractices,
  onTogglePractice,
  onToggleAll,
  onImport,
  isImporting,
}: BestPracticesTabProps) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Editorial Best Practices</h3>
        <p className="text-sm text-gray-600">
          Import proven editorial rules from industry standards. These rules cover common
          style, grammar, and formatting guidelines used by professional publishers.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      ) : bestPractices.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            No Best Practices Available
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Best practices rules are not configured on the server.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Categories Summary */}
          {categories && (
            <div className="flex flex-wrap gap-2 pb-4 border-b">
              {Object.entries(categories).map(([cat, count]) => (
                <span
                  key={cat}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                >
                  {cat}: {count as number}
                </span>
              ))}
            </div>
          )}

          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedPractices.size === bestPractices.length}
                onChange={onToggleAll}
                className="rounded border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">
                Select All ({selectedPractices.size} of {bestPractices.length} selected)
              </span>
            </label>
            <Button
              size="sm"
              variant="primary"
              onClick={onImport}
              isLoading={isImporting}
              disabled={selectedPractices.size === 0}
              leftIcon={<Upload className="h-4 w-4" />}
            >
              Import {selectedPractices.size > 0 ? `${selectedPractices.size} Rule(s)` : 'Selected'}
            </Button>
          </div>

          {/* Best Practices List */}
          <div className="space-y-3">
            {bestPractices.map((rule) => (
              <div
                key={rule.name}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-colors',
                  selectedPractices.has(rule.name)
                    ? 'border-primary-300 bg-primary-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                )}
                onClick={() => onTogglePractice(rule.name)}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedPractices.has(rule.name)}
                    onChange={() => onTogglePractice(rule.name)}
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
        </div>
      )}
    </div>
  );
}
