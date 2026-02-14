import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronDown, ChevronUp, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NaSuggestion } from '@/types/confidence.types';

interface NaSuggestionBannerProps {
  naSuggestion: NaSuggestion;
  criterionId: string;
  jobId: string;
  onQuickAccept: (data: {
    criterionId: string;
    jobId: string;
    status: 'not_applicable';
    method: 'quick_accept';
    notes: string;
  }) => Promise<void>;
  onAcceptSuccess?: () => void;
}

function getConfidenceLabel(confidence: number): { label: string; colorClass: string } {
  if (confidence >= 90) {
    return { label: 'High Confidence', colorClass: 'bg-green-100 text-green-800' };
  } else if (confidence >= 60) {
    return { label: 'Medium Confidence', colorClass: 'bg-yellow-100 text-yellow-800' };
  } else {
    return { label: 'Low Confidence', colorClass: 'bg-red-100 text-red-800' };
  }
}

function getCheckResultIcon(result: 'pass' | 'fail' | 'warning') {
  switch (result) {
    case 'pass':
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-600" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
  }
}

export function NaSuggestionBanner({
  naSuggestion,
  criterionId,
  jobId,
  onQuickAccept,
  onAcceptSuccess,
}: NaSuggestionBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (naSuggestion.suggestedStatus !== 'not_applicable') {
    return null;
  }

  const { label: confidenceLabel, colorClass: confidenceColorClass } = getConfidenceLabel(naSuggestion.confidence);
  const showQuickAccept = naSuggestion.confidence >= 90;

  const handleQuickAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onQuickAccept({
        criterionId,
        jobId,
        status: 'not_applicable',
        method: 'quick_accept',
        notes: `AI-suggested Not Applicable (${naSuggestion.confidence}% confidence): ${naSuggestion.rationale}`,
      });
      onAcceptSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit verification');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-r-lg">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="text-blue-800 font-medium">AI Suggests: Not Applicable</h4>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', confidenceColorClass)}>
              {naSuggestion.confidence}% {confidenceLabel}
            </span>
          </div>
          <p className="text-sm text-blue-700">{naSuggestion.rationale}</p>

          {error && (
            <div className="mt-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded">
              {error}
            </div>
          )}
        </div>

        {showQuickAccept && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleQuickAccept}
            isLoading={isLoading}
            className="flex-shrink-0"
          >
            {isLoading ? 'Accepting...' : 'Quick Accept N/A'}
          </Button>
        )}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm text-blue-700 hover:text-blue-900 font-medium"
          aria-expanded={isExpanded}
          aria-controls={`detection-checks-${criterionId}`}
        >
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Detection Checks ({naSuggestion.detectionChecks.length})
        </button>

        {isExpanded && (
          <div id={`detection-checks-${criterionId}`} className="mt-3 space-y-3">
            <div className="bg-white rounded-lg p-3 border border-blue-200">
              <h5 className="text-sm font-medium text-gray-700 mb-2">What was checked:</h5>
              <ul className="space-y-2">
                {naSuggestion.detectionChecks.map((check, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    {getCheckResultIcon(check.result)}
                    <div>
                      <span className="text-gray-800">{check.check}</span>
                      {check.details && (
                        <p className="text-gray-500 text-xs mt-0.5">{check.details}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {naSuggestion.edgeCases.length > 0 && (
              <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                <h5 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Edge Cases to Consider:
                </h5>
                <ul className="space-y-1">
                  {naSuggestion.edgeCases.map((edgeCase, idx) => (
                    <li key={idx} className="text-sm text-yellow-700 flex items-start gap-2">
                      <span className="text-yellow-600">•</span>
                      {edgeCase}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
