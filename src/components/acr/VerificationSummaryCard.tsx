import { CheckCircle, Info, HelpCircle } from 'lucide-react';
import type { VerificationItem } from '@/types/verification.types';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

interface VerificationSummaryCardProps {
  items: VerificationItem[];
  verifiedCount: number;
}

interface ConfidenceBreakdown {
  applicable: number;
  high: number;
  medium: number;
  low: number;
  notApplicable: number;
}

export function VerificationSummaryCard({ items, verifiedCount }: VerificationSummaryCardProps) {
  // Calculate confidence breakdown
  const breakdown: ConfidenceBreakdown = items.reduce(
    (acc, item) => {
      // Check if item is N/A (only count as N/A if suggestedStatus is 'not_applicable')
      const isNA = item.naSuggestion?.suggestedStatus === 'not_applicable';

      if (isNA) {
        acc.notApplicable++;
      } else {
        acc.applicable++;
        // Categorize by confidence
        if (item.confidenceScore >= 0.9) {
          acc.high++;
        } else if (item.confidenceScore >= 0.7) {
          acc.medium++;
        } else {
          acc.low++;
        }
      }
      return acc;
    },
    { applicable: 0, high: 0, medium: 0, low: 0, notApplicable: 0 }
  );

  const progressPercentage = breakdown.applicable > 0
    ? Math.round((verifiedCount / breakdown.applicable) * 100)
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Verification Summary</h3>
      </div>

      <div className="space-y-4">
        {/* Applicable Criteria Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-semibold text-gray-900">Applicable Criteria</span>
              <InfoTooltip
                content={
                  <div className="space-y-2">
                    <div className="font-semibold text-white">Needs Review</div>
                    <div className="text-xs text-gray-200">
                      Automated tools detected potential issues or couldn't fully verify compliance.
                      Human review is required to confirm findings and assess context.
                    </div>
                    <div className="text-xs text-gray-300 space-y-1 mt-2">
                      <div><strong className="text-white">Confidence Levels:</strong></div>
                      <div>🟢 High (≥90%): Very likely accurate, verify anyway</div>
                      <div>🟡 Medium (70-89%): Moderate confidence, investigate</div>
                      <div>🟠 Low (&lt;70%): Uncertain, needs detailed review</div>
                    </div>
                  </div>
                }
              >
                <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
              </InfoTooltip>
            </div>
            <span className="text-sm font-medium text-gray-700">{breakdown.applicable} items</span>
          </div>

          {/* Confidence breakdown - indented */}
          <div className="ml-7 space-y-2">
            {/* High Confidence */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-sm text-gray-700">High Confidence (≥90%)</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{breakdown.high} items</span>
            </div>

            {/* Medium Confidence */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <span className="text-sm text-gray-700">Medium Confidence (70-89%)</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{breakdown.medium} items</span>
            </div>

            {/* Low Confidence */}
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-orange-500" />
                <span className="text-sm text-gray-700">Low Confidence (&lt;70%)</span>
              </div>
              <span className="text-sm font-medium text-gray-600">{breakdown.low} items</span>
            </div>
          </div>
        </div>

        {/* Not Applicable Section */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-gray-900">Not Applicable</span>
            <span className="text-xs text-gray-500">Auto-resolved by AI</span>
            <InfoTooltip
              content={
                <div className="space-y-2">
                  <div className="font-semibold text-white">Not Applicable (Auto-Resolved)</div>
                  <div className="text-xs text-gray-200">
                    AI content detection determined these criteria don't apply to your document
                    and automatically excluded them from conformance calculations.
                  </div>
                  <div className="text-xs text-gray-300 space-y-1 mt-2">
                    <div><strong className="text-white">Common N/A scenarios:</strong></div>
                    <div>• Video/audio criteria (static text-only content)</div>
                    <div>• Form validation (no forms present)</div>
                    <div>• Time limits (no timed interactions)</div>
                    <div>• Interactive scripts (no JavaScript detected)</div>
                  </div>
                  <div className="text-xs text-gray-200 mt-2">
                    High-confidence (≥80%) suggestions are auto-applied. You can review and override if needed.
                  </div>
                </div>
              }
            >
              <HelpCircle className="h-4 w-4 text-gray-400 hover:text-gray-600 transition-colors" />
            </InfoTooltip>
          </div>
          <span className="text-sm font-medium text-gray-700">{breakdown.notApplicable} items</span>
        </div>

        {/* Progress Section */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Progress: {verifiedCount} of {breakdown.applicable} applicable verified
            </span>
            <span className="text-sm font-semibold text-gray-900">{progressPercentage}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
