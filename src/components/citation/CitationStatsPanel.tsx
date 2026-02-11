import { useMemo } from 'react';
import { FileText, CheckCircle, AlertCircle, HelpCircle, TrendingUp } from 'lucide-react';
import { CitationStats, CitationType, CitationStyle } from '@/types/citation.types';
import { Badge } from '@/components/ui/Badge';

interface CitationStatsPanelProps {
  stats: CitationStats | null;
  isLoading?: boolean;
  onFilterByType?: (type: CitationType | null) => void;
  onFilterByStyle?: (style: CitationStyle | null) => void;
  onFilterByReview?: (needsReview: boolean | null) => void;
  activeTypeFilter?: CitationType | null;
  activeStyleFilter?: CitationStyle | null;
  activeReviewFilter?: boolean | null;
}

/**
 * Compact citation statistics panel for document viewer sidebar
 * Displays citation counts, breakdowns, and quick filter buttons
 */
export function CitationStatsPanel({
  stats,
  isLoading,
  onFilterByType,
  onFilterByStyle,
  onFilterByReview,
  activeTypeFilter,
  activeStyleFilter,
  activeReviewFilter,
}: CitationStatsPanelProps): JSX.Element {
  // Calculate percentages
  const parsedPercent = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.parsed / stats.total) * 100);
  }, [stats]);

  const reviewPercent = useMemo(() => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.needsReview / stats.total) * 100);
  }, [stats]);

  // Get top citation types (non-zero counts)
  const topTypes = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byType)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [stats]);

  // Get detected styles (non-zero counts)
  const detectedStyles = useMemo(() => {
    if (!stats) return [];
    return Object.entries(stats.byStyle)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
  }, [stats]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded bg-gray-200 animate-pulse" />
          <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full rounded bg-gray-200 animate-pulse" />
          <div className="h-4 w-3/4 rounded bg-gray-200 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
        <FileText className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p className="text-sm text-gray-600">No citation data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h3 className="font-semibold text-gray-900 text-sm">Citation Summary</h3>
        </div>
        <Badge variant="info" className="border-blue-300">
          {stats.total} total
        </Badge>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onFilterByReview?.(false)}
          className={`p-3 rounded-lg border transition-all hover:shadow-md ${
            activeReviewFilter === false
              ? 'bg-green-100 border-green-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-green-300'
          }`}
          aria-label="Filter by parsed citations"
        >
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
            <span className="text-xs font-medium text-gray-600">Parsed</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{stats.parsed}</span>
            <span className="text-xs text-gray-500">({parsedPercent}%)</span>
          </div>
        </button>

        <button
          onClick={() => onFilterByReview?.(true)}
          className={`p-3 rounded-lg border transition-all hover:shadow-md ${
            activeReviewFilter === true
              ? 'bg-amber-100 border-amber-300 shadow-sm'
              : 'bg-white border-gray-200 hover:border-amber-300'
          }`}
          aria-label="Filter by citations needing review"
        >
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="h-4 w-4 text-amber-600" aria-hidden="true" />
            <span className="text-xs font-medium text-gray-600">Review</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-gray-900">{stats.needsReview}</span>
            <span className="text-xs text-gray-500">({reviewPercent}%)</span>
          </div>
        </button>
      </div>

      {/* Unparsed Count */}
      {stats.unparsed > 0 && (
        <div className="p-2 bg-gray-100 rounded border border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />
            <span className="text-xs text-gray-600">Unparsed</span>
          </div>
          <span className="text-sm font-semibold text-gray-700">{stats.unparsed}</span>
        </div>
      )}

      {/* Average Confidence */}
      <div className="p-3 bg-white rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <span className="text-xs font-medium text-gray-600">Avg. Confidence</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all ${
                stats.averageConfidence >= 80
                  ? 'bg-green-500'
                  : stats.averageConfidence >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              }`}
              style={{ width: `${stats.averageConfidence}%` }}
              role="progressbar"
              aria-valuenow={stats.averageConfidence}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className="text-sm font-bold text-gray-900 min-w-[3ch]">
            {Math.round(stats.averageConfidence)}%
          </span>
        </div>
      </div>

      {/* Citation Types */}
      {topTypes.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Citation Types</h4>
          <div className="space-y-1.5">
            {topTypes.map(([type, count]) => (
              <button
                key={type}
                onClick={() => onFilterByType?.(type as CitationType)}
                className={`w-full flex items-center justify-between p-2 rounded transition-all hover:bg-white hover:shadow-sm ${
                  activeTypeFilter === type
                    ? 'bg-white shadow-sm border border-blue-300'
                    : 'border border-transparent'
                }`}
                aria-label={`Filter by ${type} citations`}
              >
                <span className="text-xs font-medium text-gray-700 capitalize">
                  {type.toLowerCase().replace('_', ' ')}
                </span>
                <Badge variant="default" className="text-xs">
                  {count}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Citation Styles */}
      {detectedStyles.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 mb-2">Detected Styles</h4>
          <div className="flex flex-wrap gap-2">
            {detectedStyles.map(([style, count]) => (
              <button
                key={style}
                onClick={() => onFilterByStyle?.(style as CitationStyle)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:shadow-md ${
                  activeStyleFilter === style
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 border border-gray-200 hover:border-blue-300'
                }`}
                aria-label={`Filter by ${style} style`}
              >
                {style} <span className="ml-1 opacity-75">({count})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear Filters Button */}
      {(activeTypeFilter || activeStyleFilter || activeReviewFilter !== null) && (
        <button
          onClick={() => {
            onFilterByType?.(null);
            onFilterByStyle?.(null);
            onFilterByReview?.(null);
          }}
          className="w-full py-2 px-3 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-colors"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );
}
