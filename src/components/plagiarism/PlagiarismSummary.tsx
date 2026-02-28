/**
 * PlagiarismSummary - displays match statistics grouped by type and classification
 */

import type { PlagiarismSummary as PlagiarismSummaryType } from '@/types/plagiarism';
import { MATCH_TYPE_LABELS, CLASSIFICATION_LABELS } from '@/types/plagiarism';

interface Props {
  summary: PlagiarismSummaryType;
}

export function PlagiarismSummary({ summary }: Props) {
  if (summary.total === 0) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-green-600 font-medium">No plagiarism matches found</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-700">{summary.total} matches found</span>
        <span className="text-xs text-gray-500">
          Avg similarity: {(summary.averageSimilarity * 100).toFixed(0)}%
        </span>
      </div>

      {/* By type */}
      {Object.keys(summary.byType).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">By Type</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.byType).map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800"
              >
                {MATCH_TYPE_LABELS[type as keyof typeof MATCH_TYPE_LABELS]?.label || type}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* By classification */}
      {Object.keys(summary.byClassification).length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">By Classification</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(summary.byClassification).map(([cls, count]) => (
              <span
                key={cls}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800"
              >
                {CLASSIFICATION_LABELS[cls as keyof typeof CLASSIFICATION_LABELS]?.label || cls}
                <span className="font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
