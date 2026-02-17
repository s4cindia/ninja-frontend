import React from 'react';
import { Badge } from '../ui/Badge';
import { Sparkles, Target } from 'lucide-react';
import type { ComparisonSummary } from '@/types/comparison';

interface ComparisonHeaderProps {
  summary: ComparisonSummary;
  fileName: string;
}

export const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({ summary, fileName }) => {
  const hasDiscoveredFixes = (summary.discovered ?? 0) > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{fileName}</h2>

      {/* Main Statistics */}
      <div className="flex flex-wrap gap-3 items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Total Changes:</span>
          <Badge variant="default">{summary.totalChanges}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Applied:</span>
          <Badge variant="success">{summary.applied}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rejected:</span>
          <Badge variant="error">{summary.rejected}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Skipped:</span>
          <Badge variant="default">{summary.skipped}</Badge>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Failed:</span>
          <Badge variant="error">{summary.failed}</Badge>
        </div>

        {summary.resolutionRate !== undefined && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Resolution Rate:</span>
            <Badge variant="info">{Math.round(summary.resolutionRate)}%</Badge>
          </div>
        )}
      </div>

      {/* Discovered Fixes Section */}
      {hasDiscoveredFixes && (
        <div className="border-t pt-3 mt-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">Planned Fixes:</span>
              <Badge variant="default">{summary.plannedFixes ?? 0}</Badge>
              <span className="text-xs text-gray-500">(from audit)</span>
            </div>

            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-700">Discovered Fixes:</span>
              <Badge variant="info">{summary.discovered}</Badge>
              <span className="text-xs text-gray-500">(found during remediation)</span>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
            <Sparkles className="h-3 w-3 text-purple-500 mt-0.5 flex-shrink-0" />
            <span>
              Additional fixes were discovered and applied during batch processing,
              going beyond the original audit findings for more comprehensive remediation.
            </span>
          </p>
        </div>
      )}
    </div>
  );
};
