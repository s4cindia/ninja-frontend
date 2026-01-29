import { useCallback } from 'react';
import { Filter, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import {
  CITATION_TYPE_OPTIONS,
  CITATION_STYLE_OPTIONS,
  CONFIDENCE_THRESHOLDS,
} from '@/types/citation.types';
import type { CitationType, CitationStyle, CitationFilters } from '@/types/citation.types';

interface CitationTypeFilterProps {
  filters: CitationFilters;
  onFilterChange: (filters: CitationFilters) => void;
}

const CONFIDENCE_LEVELS = [
  { label: 'All', value: undefined },
  { label: `High (${CONFIDENCE_THRESHOLDS.HIGH}%+)`, value: CONFIDENCE_THRESHOLDS.HIGH },
  { label: `Medium (${CONFIDENCE_THRESHOLDS.MEDIUM}%+)`, value: CONFIDENCE_THRESHOLDS.MEDIUM },
  { label: `Low (<${CONFIDENCE_THRESHOLDS.MEDIUM}%)`, value: 0 },
];

export function CitationTypeFilter({ filters, onFilterChange }: CitationTypeFilterProps) {
  const hasActiveFilters = filters.type || filters.style || filters.minConfidence || filters.needsReview;

  const handleTypeChange = useCallback((type: CitationType | undefined) => {
    onFilterChange({ ...filters, type, page: 1 });
  }, [filters, onFilterChange]);

  const handleStyleChange = useCallback((style: CitationStyle | undefined) => {
    onFilterChange({ ...filters, style, page: 1 });
  }, [filters, onFilterChange]);

  const handleConfidenceChange = useCallback((minConfidence: number | undefined) => {
    onFilterChange({ ...filters, minConfidence, page: 1 });
  }, [filters, onFilterChange]);

  const handleNeedsReviewChange = useCallback((needsReview: boolean | undefined) => {
    onFilterChange({ ...filters, needsReview, page: 1 });
  }, [filters, onFilterChange]);

  const clearFilters = useCallback(() => {
    onFilterChange({ page: 1, limit: filters.limit });
  }, [filters.limit, onFilterChange]);

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Citation Type */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Type
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              !filters.type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleTypeChange(undefined)}
          >
            All
          </Badge>
          {CITATION_TYPE_OPTIONS.map((type) => (
            <Badge
              key={type}
              className={cn(
                'cursor-pointer transition-colors',
                filters.type === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              onClick={() => handleTypeChange(type)}
            >
              {type.toLowerCase().replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Citation Style */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Style
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              !filters.style ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleStyleChange(undefined)}
          >
            All
          </Badge>
          {CITATION_STYLE_OPTIONS.map((style) => (
            <Badge
              key={style}
              className={cn(
                'cursor-pointer transition-colors',
                filters.style === style ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              onClick={() => handleStyleChange(style)}
            >
              {style}
            </Badge>
          ))}
        </div>
      </div>

      {/* Confidence Level */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Confidence Level
        </label>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <Badge
              key={level.label}
              className={cn(
                'cursor-pointer transition-colors',
                filters.minConfidence === level.value ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              onClick={() => handleConfidenceChange(level.value)}
            >
              {level.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* AC-26: Needs Review Filter */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Review Status
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === undefined ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(undefined)}
          >
            All
          </Badge>
          <Badge
            className={cn(
              'cursor-pointer transition-colors flex items-center gap-1',
              filters.needsReview === true ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(true)}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs Review
          </Badge>
          <Badge
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === false ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(false)}
          >
            No Issues
          </Badge>
        </div>
      </div>
    </div>
  );
}
