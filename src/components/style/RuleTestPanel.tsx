/**
 * RuleTestPanel Component
 *
 * Collapsible panel for testing a rule against sample text.
 * Shows test results including matches and suggested fixes.
 */

import { Play, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';

interface TestRuleResult {
  matches: Array<{ matchedText: string; suggestedFix: string }>;
  error?: string;
}

interface RuleTestPanelProps {
  testText: string;
  onTestTextChange: (text: string) => void;
  showTestPanel: boolean;
  onToggleTestPanel: () => void;
  onTestRule: () => void;
  isTestingRule: boolean;
  testResult: TestRuleResult | undefined;
}

export function RuleTestPanel({
  testText,
  onTestTextChange,
  showTestPanel,
  onToggleTestPanel,
  onTestRule,
  isTestingRule,
  testResult,
}: RuleTestPanelProps) {
  return (
    <div className="border-t pt-4 mt-4">
      <button
        type="button"
        onClick={onToggleTestPanel}
        className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <Play className="h-4 w-4" />
        Test Rule
        <ChevronDown className={cn('h-4 w-4 transition-transform', showTestPanel && 'rotate-180')} />
      </button>

      {showTestPanel && (
        <div className="mt-3 space-y-3">
          <textarea
            value={testText}
            onChange={(e) => onTestTextChange(e.target.value)}
            placeholder="Enter sample text to test the rule..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={onTestRule}
            isLoading={isTestingRule}
            leftIcon={<Play className="h-4 w-4" />}
          >
            Run Test
          </Button>
          {testResult && (
            <div className="p-3 bg-gray-50 rounded-md">
              <p className="text-sm font-medium text-gray-700">
                {testResult.matches.length} match(es) found
              </p>
              {testResult.matches.map((match, idx) => (
                <div key={idx} className="mt-2 p-2 bg-white rounded border text-sm">
                  <p className="text-red-600 line-through">{match.matchedText}</p>
                  <p className="text-green-600">{match.suggestedFix}</p>
                </div>
              ))}
              {testResult.error && (
                <p className="text-red-600 text-sm mt-2">{testResult.error}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
