import { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, AlertTriangle, Info, Sparkles } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { ApplicabilitySuggestion } from '@/types/acr.types';

interface NASuggestionBannerProps {
  suggestion: ApplicabilitySuggestion;
  onAccept: () => void;
  isAccepting?: boolean;
}

export function NASuggestionBanner({ suggestion, onAccept, isAccepting }: NASuggestionBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  // Don't show banner for "applicable" suggestions (criterion applies)
  if (suggestion.suggestedStatus === 'applicable') {
    return null;
  }

  // Determine confidence level styling
  const getConfidenceConfig = (confidence: number) => {
    if (confidence >= 90) {
      return {
        label: 'High Confidence',
        bgClass: 'bg-blue-50 border-blue-200',
        textClass: 'text-blue-900',
        badgeClass: 'bg-blue-100 text-blue-700',
        iconClass: 'text-blue-600',
      };
    } else if (confidence >= 70) {
      return {
        label: 'Medium Confidence',
        bgClass: 'bg-yellow-50 border-yellow-200',
        textClass: 'text-yellow-900',
        badgeClass: 'bg-yellow-100 text-yellow-700',
        iconClass: 'text-yellow-600',
      };
    } else {
      return {
        label: 'Low Confidence',
        bgClass: 'bg-orange-50 border-orange-200',
        textClass: 'text-orange-900',
        badgeClass: 'bg-orange-100 text-orange-700',
        iconClass: 'text-orange-600',
      };
    }
  };

  const config = getConfidenceConfig(suggestion.confidence);

  const getSuggestionLabel = () => {
    if (suggestion.suggestedStatus === 'not_applicable') {
      return 'AI Suggests: Not Applicable';
    } else if (suggestion.suggestedStatus === 'uncertain') {
      return 'AI Suggests: Uncertain - Review Required';
    }
    return 'AI Suggestion Available';
  };

  const getSuggestionIcon = () => {
    if (suggestion.suggestedStatus === 'not_applicable' && suggestion.confidence >= 90) {
      return <CheckCircle className="h-5 w-5" />;
    } else if (suggestion.suggestedStatus === 'uncertain') {
      return <AlertTriangle className="h-5 w-5" />;
    }
    return <Info className="h-5 w-5" />;
  };

  // Only show "Quick Accept" for high-confidence N/A suggestions
  const showQuickAccept = suggestion.suggestedStatus === 'not_applicable' && suggestion.confidence >= 80;

  return (
    <div className={cn(
      'rounded-lg border-2 p-4 mb-4',
      config.bgClass
    )}>
      <div className="flex items-start gap-3">
        <div className={cn('flex-shrink-0 mt-0.5', config.iconClass)}>
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className={cn('text-sm font-semibold', config.textClass)}>
              {getSuggestionLabel()}
            </h4>
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', config.badgeClass)}>
              {suggestion.confidence}% {config.label}
            </span>
          </div>

          <p className={cn('text-sm mb-3', config.textClass)}>
            {suggestion.rationale}
          </p>

          {/* Edge Cases Warning */}
          {suggestion.edgeCases && suggestion.edgeCases.length > 0 && (
            <div className="mb-3 text-xs bg-white/50 border border-current/20 rounded px-3 py-2">
              <p className="font-medium mb-1">⚠️ Important Considerations:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {suggestion.edgeCases.map((edgeCase, idx) => (
                  <li key={idx}>{edgeCase}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detection Details (Collapsible) */}
          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className={cn(
              'flex items-center gap-1 text-xs font-medium hover:underline',
              config.textClass
            )}
          >
            {showDetails ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {showDetails ? 'Hide' : 'Show'} Detection Details ({suggestion.detectionChecks.length} checks)
          </button>

          {showDetails && (
            <div className="mt-2 space-y-1.5">
              {suggestion.detectionChecks.map((check, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs bg-white/50 rounded px-2 py-1.5 border border-current/20">
                  <span className="flex-shrink-0 mt-0.5">
                    {check.result === 'pass' && (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    )}
                    {check.result === 'fail' && (
                      <AlertTriangle className="h-3 w-3 text-red-600" />
                    )}
                    {check.result === 'warning' && (
                      <AlertTriangle className="h-3 w-3 text-yellow-600" />
                    )}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium">{check.check}</p>
                    {check.details && (
                      <p className="text-gray-600 mt-0.5">{check.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Accept Button */}
        {showQuickAccept && (
          <div className="flex-shrink-0">
            <Button
              size="sm"
              variant="default"
              onClick={onAccept}
              disabled={isAccepting}
              isLoading={isAccepting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Quick Accept N/A
            </Button>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-gray-600 mt-3 italic">
        AI-generated suggestion based on content analysis. Human verification is still recommended.
      </p>
    </div>
  );
}
