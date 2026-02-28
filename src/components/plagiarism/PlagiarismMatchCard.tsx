/**
 * PlagiarismMatchCard - Individual match card with Locate/Fix/Dismiss actions
 * matching the IntegrityIssueCard pattern for track-changes support.
 */

import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, Check, X, MapPin, ChevronDown, ChevronUp, Quote } from 'lucide-react';
import type { PlagiarismMatch, MatchReviewStatus } from '@/types/plagiarism';
import { MATCH_TYPE_LABELS, CLASSIFICATION_LABELS } from '@/types/plagiarism';

interface Props {
  match: PlagiarismMatch;
  onReview: (matchId: string, status: Exclude<MatchReviewStatus, 'PENDING'>) => void;
  onGoToLocation?: (text: string) => void;
  onApplyFix?: (originalText: string, fixText: string) => boolean | void;
  isReviewing: boolean;
}

const SEVERITY_CONFIG = {
  VERBATIM_COPY: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', label: 'High' },
  PARAPHRASED: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', label: 'Medium' },
  NEEDS_REVIEW: { icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200', label: 'Review' },
  COMMON_PHRASE: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', label: 'Low' },
  PROPERLY_CITED: { icon: Info, color: 'text-green-600', bg: 'bg-green-50 border-green-200', label: 'OK' },
  COINCIDENTAL: { icon: Info, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200', label: 'Info' },
} as const;

function buildCitationFix(sourceText: string): string {
  const trimmed = sourceText.trim();
  const preview = trimmed.length > 80 ? trimmed.slice(0, 80) + '...' : trimmed;
  return `"${preview}" [Citation needed]`;
}

export function PlagiarismMatchCard({ match, onReview, onGoToLocation, onApplyFix, isReviewing }: Props) {
  const [expanded, setExpanded] = useState(false);

  const sev = SEVERITY_CONFIG[match.classification] || SEVERITY_CONFIG.NEEDS_REVIEW;
  const SevIcon = sev.icon;
  const isResolved = match.status !== 'PENDING';
  const similarityPct = (match.similarityScore * 100).toFixed(0);
  const matchTypeLabel = MATCH_TYPE_LABELS[match.matchType]?.label || match.matchType;
  const classLabel = CLASSIFICATION_LABELS[match.classification]?.label || match.classification;

  const handleLocate = () => {
    if (onGoToLocation) {
      const searchText = match.sourceText.slice(0, 150);
      onGoToLocation(searchText);
    }
  };

  const handleFix = () => {
    if (onApplyFix) {
      const searchText = match.sourceText.slice(0, 150);
      const fixText = buildCitationFix(match.sourceText);
      const result = onApplyFix(searchText, fixText);
      // Only update review status if the fix was applied successfully
      if (result !== false) {
        onReview(match.id, 'PROPERLY_ATTRIBUTED');
      }
    }
  };

  const handleDismiss = () => {
    onReview(match.id, 'DISMISSED');
  };

  return (
    <div className={`border rounded-lg p-3 ${isResolved ? 'opacity-60 bg-gray-50' : sev.bg}`}>
      {/* Header: severity icon + title + badges */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <SevIcon className={`w-4 h-4 flex-shrink-0 ${sev.color}`} />
          <span className="font-medium text-sm truncate">
            {classLabel} ({similarityPct}% match)
          </span>
        </div>
        <span className="text-xs text-gray-500 flex-shrink-0">{matchTypeLabel}</span>
      </div>

      {/* Description */}
      <p className="text-xs text-gray-600 mb-2">
        {match.aiReasoning || CLASSIFICATION_LABELS[match.classification]?.description || 'Similarity detected'}
      </p>

      {/* Source vs Matched comparison (like expected vs actual) */}
      <div className="space-y-1.5 mb-2">
        <div>
          <span className="text-xs text-gray-500">Found in document:</span>
          <p className="text-xs text-red-700 font-mono bg-white bg-opacity-60 rounded px-2 py-1 mt-0.5 line-clamp-2 break-all">
            {match.sourceText}
          </p>
        </div>
        <div>
          <span className="text-xs text-gray-500">Matches with:</span>
          <p className="text-xs text-amber-700 font-mono bg-white bg-opacity-60 rounded px-2 py-1 mt-0.5 line-clamp-2 break-all">
            {match.matchedText}
          </p>
        </div>
      </div>

      {/* Suggested fix preview */}
      {!isResolved && (match.classification === 'VERBATIM_COPY' || match.classification === 'PARAPHRASED') && (
        <div className="text-xs mb-2 bg-white bg-opacity-60 rounded px-2 py-1">
          <span className="text-gray-500">Fix:</span>{' '}
          <span className="text-gray-700">Add citation marker via track changes</span>
        </div>
      )}

      {/* Expandable details */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Full Source Text:</p>
            <p className="text-xs text-gray-800 bg-white p-2 rounded max-h-32 overflow-y-auto">{match.sourceText}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Full Matched Text:</p>
            <p className="text-xs text-gray-800 bg-white p-2 rounded max-h-32 overflow-y-auto">{match.matchedText}</p>
          </div>
          {/* Similarity bar */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Similarity:</span>
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  match.similarityScore >= 0.8 ? 'bg-red-500' :
                  match.similarityScore >= 0.5 ? 'bg-amber-500' :
                  'bg-yellow-500'
                }`}
                style={{ width: `${similarityPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-gray-600">{similarityPct}%</span>
          </div>
          {match.confidence > 0 && (
            <p className="text-xs text-gray-500">AI Confidence: {match.confidence}%</p>
          )}
        </div>
      )}

      {/* Status badge for resolved */}
      {isResolved && (
        <div className="text-xs mb-2">
          <span className={`px-1.5 py-0.5 rounded ${
            match.status === 'PROPERLY_ATTRIBUTED' ? 'bg-green-100 text-green-700' :
            match.status === 'CONFIRMED_PLAGIARISM' ? 'bg-red-100 text-red-700' :
            'bg-gray-200 text-gray-600'
          }`}>
            {match.status.replace(/_/g, ' ')}
          </span>
          {match.reviewNotes && <span className="ml-2 text-gray-400">{match.reviewNotes}</span>}
        </div>
      )}

      {/* Actions - matching IntegrityIssueCard pattern */}
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <button type="button"
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less' : 'More'}
        </button>

        {!isResolved && (
          <>
            {onGoToLocation && (
              <button type="button"
                className="flex items-center gap-1 px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50"
                onClick={handleLocate}
                title="Go to location in document"
              >
                <MapPin className="w-3 h-3" /> Locate
              </button>
            )}
            {onApplyFix && (match.classification === 'VERBATIM_COPY' || match.classification === 'PARAPHRASED' || match.classification === 'NEEDS_REVIEW') && (
              <button type="button"
                className="flex items-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                onClick={handleFix}
                disabled={isReviewing}
                title="Add citation marker with track changes"
              >
                <Quote className="w-3 h-3" /> Cite
              </button>
            )}
            <button type="button"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50"
              onClick={() => onReview(match.id, 'CONFIRMED_PLAGIARISM')}
              disabled={isReviewing}
              title="Confirm as plagiarism"
            >
              <Check className="w-3 h-3" /> Confirm
            </button>
            <button type="button"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 disabled:opacity-50"
              onClick={handleDismiss}
              disabled={isReviewing}
              title="Dismiss this match"
            >
              <X className="w-3 h-3" /> Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
