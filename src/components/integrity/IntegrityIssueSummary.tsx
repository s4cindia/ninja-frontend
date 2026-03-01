/**
 * IntegrityIssueSummary - counts grouped by check type with severity indicators
 */

import type { IntegritySummaryMap } from '@/types/integrity';
import { getCheckTypeLabel } from '@/types/integrity';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

interface Props {
  summary: IntegritySummaryMap;
}

export function IntegrityIssueSummary({ summary }: Props) {
  const entries = Object.entries(summary);

  if (entries.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-green-700 bg-green-50 rounded-lg border border-green-200">
        No integrity issues found. Document looks clean!
      </div>
    );
  }

  const totalErrors = entries.reduce((s, [, v]) => s + v.errors, 0);
  const totalWarnings = entries.reduce((s, [, v]) => s + v.warnings, 0);
  const totalSuggestions = entries.reduce((s, [, v]) => s + v.suggestions, 0);

  return (
    <div className="space-y-2">
      {/* Totals bar */}
      <div className="flex items-center gap-4 text-sm px-1">
        {totalErrors > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertCircle className="w-3.5 h-3.5" /> {totalErrors} errors
          </span>
        )}
        {totalWarnings > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <AlertTriangle className="w-3.5 h-3.5" /> {totalWarnings} warnings
          </span>
        )}
        {totalSuggestions > 0 && (
          <span className="flex items-center gap-1 text-blue-600">
            <Info className="w-3.5 h-3.5" /> {totalSuggestions} suggestions
          </span>
        )}
      </div>

      {/* Per check-type rows */}
      <div className="grid gap-1.5">
        {entries.map(([type, counts]) => {
          const label = getCheckTypeLabel(type);
          return (
            <div
              key={type}
              className="flex items-center justify-between px-3 py-1.5 bg-gray-50 rounded text-sm"
            >
              <span className="text-gray-700 font-medium">{label}</span>
              <div className="flex items-center gap-3 text-xs">
                {counts.errors > 0 && (
                  <span className="flex items-center gap-0.5 text-red-600">
                    <AlertCircle className="w-3 h-3" /> {counts.errors} {counts.errors === 1 ? 'error' : 'errors'}
                  </span>
                )}
                {counts.warnings > 0 && (
                  <span className="flex items-center gap-0.5 text-amber-600">
                    <AlertTriangle className="w-3 h-3" /> {counts.warnings} {counts.warnings === 1 ? 'warning' : 'warnings'}
                  </span>
                )}
                {counts.suggestions > 0 && (
                  <span className="flex items-center gap-0.5 text-blue-600">
                    <Info className="w-3 h-3" /> {counts.suggestions} {counts.suggestions === 1 ? 'suggestion' : 'suggestions'}
                  </span>
                )}
                <span className="text-gray-400">
                  {counts.fixed}/{counts.total} fixed
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
