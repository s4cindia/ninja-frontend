import { useState } from 'react';
import { ChevronRight, ChevronDown, Info, Sparkles } from 'lucide-react';
import type { VerificationItem } from '@/types/verification.types';

interface NotApplicableSectionProps {
  items: VerificationItem[];
}

export function NotApplicableSection({ items }: NotApplicableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white border border-blue-200 rounded-lg overflow-hidden">
      {/* Header - Collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 bg-blue-50 hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 text-blue-600" />
          ) : (
            <ChevronRight className="h-5 w-5 text-blue-600" />
          )}
          <Info className="h-5 w-5 text-blue-600" />
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              Not Applicable ({items.length} items)
            </h3>
            <p className="text-sm text-gray-600">
              These criteria don't apply to your content - no verification needed
            </p>
          </div>
        </div>
      </button>

      {/* Content - Expandable */}
      {isExpanded && (
        <div className="border-t border-blue-200">
          <div className="p-4 bg-blue-50/50">
            <div className="flex items-start gap-2 text-sm text-blue-800 mb-4">
              <Sparkles className="h-4 w-4 flex-shrink-0 mt-0.5" />
              <p>
                <strong>Auto-resolved by AI:</strong> These criteria have been analyzed and determined
                not applicable based on content detection. They are excluded from conformance calculations.
              </p>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {items.map((item) => {
              const confidence = item.naSuggestion?.confidence
                ? Math.round(item.naSuggestion.confidence * 100)
                : 0;
              const rationale = item.naSuggestion?.rationale || 'Not applicable to this content';

              return (
                <div
                  key={item.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-medium text-gray-900">
                          {item.criterionId}
                        </span>
                        <span className="text-sm text-gray-600">
                          {item.criterionName}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-300">
                          <Sparkles className="h-3 w-3" />
                          AI: N/A
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-500">
                          Confidence: <span className="font-medium text-gray-700">{confidence}%</span>
                        </span>
                      </div>

                      <div className="mt-2 text-sm text-gray-700 bg-blue-50 rounded p-3">
                        <span className="font-medium">Reason: </span>
                        {rationale}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
