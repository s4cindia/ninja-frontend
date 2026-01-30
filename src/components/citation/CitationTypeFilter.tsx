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

interface ConfidenceLevel {
  label: string;
  min?: number;
  max?: number;
}

const CONFIDENCE_LEVELS: ConfidenceLevel[] = [
  { label: 'All' },
  { label: `High (${CONFIDENCE_THRESHOLDS.HIGH}%+)`, min: CONFIDENCE_THRESHOLDS.HIGH },
  { label: `Medium (${CONFIDENCE_THRESHOLDS.MEDIUM}%+)`, min: CONFIDENCE_THRESHOLDS.MEDIUM },
  { label: `Low (<${CONFIDENCE_THRESHOLDS.MEDIUM}%)`, max: CONFIDENCE_THRESHOLDS.MEDIUM },
];

export function CitationTypeFilter({ filters, onFilterChange }: CitationTypeFilterProps) {
  const hasActiveFilters = filters.type || filters.style || filters.minConfidence !== undefined || filters.maxConfidence !== undefined || typeof filters.needsReview === 'boolean';

  const handleTypeChange = useCallback((type: CitationType | undefined) => {
    onFilterChange({ ...filters, type, page: 1 });
  }, [filters, onFilterChange]);

  const handleStyleChange = useCallback((style: CitationStyle | undefined) => {
    onFilterChange({ ...filters, style, page: 1 });
  }, [filters, onFilterChange]);

  const handleConfidenceChange = useCallback((level: ConfidenceLevel) => {
    onFilterChange({
      ...filters,
      minConfidence: level.min,
      maxConfidence: level.max,
      page: 1,
    });
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
        <label id="filter-type-label" className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Type
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-type-label">
          <Badge
            as="button"
            className={cn(
              'cursor-pointer transition-colors',
              !filters.type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleTypeChange(undefined)}
            aria-pressed={!filters.type}
          >
            All
          </Badge>
          {CITATION_TYPE_OPTIONS.map((type) => (
            <Badge
              as="button"
              key={type}
              className={cn(
                'cursor-pointer transition-colors',
                filters.type === type ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              onClick={() => handleTypeChange(type)}
              aria-pressed={filters.type === type}
            >
              {type.toLowerCase().replace(/_/g, ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Citation Style */}
      <div>
        <label id="filter-style-label" className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Style
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-style-label">
          <Badge
            as="button"
            className={cn(
              'cursor-pointer transition-colors',
              !filters.style ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleStyleChange(undefined)}
            aria-pressed={!filters.style}
          >
            All
          </Badge>
          {CITATION_STYLE_OPTIONS.map((style) => (
            <Badge
              as="button"
              key={style}
              className={cn(
                'cursor-pointer transition-colors',
                filters.style === style ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              )}
              onClick={() => handleStyleChange(style)}
              aria-pressed={filters.style === style}
            >
              {style}
            </Badge>
          ))}
        </div>
      </div>

      {/* Confidence Level */}
      <div>
        <label id="filter-confidence-label" className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Confidence Level
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-confidence-label">
          {CONFIDENCE_LEVELS.map((level) => {
            const isActive = filters.minConfidence === level.min && filters.maxConfidence === level.max;
            return (
              <Badge
                as="button"
                key={level.label}
                className={cn(
                  'cursor-pointer transition-colors',
                  isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                )}
                onClick={() => handleConfidenceChange(level)}
                aria-pressed={isActive}
              >
                {level.label}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Needs Review Filter */}
      <div>
        <label id="filter-review-label" className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Review Status
        </label>
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="filter-review-label">
          <Badge
            as="button"
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === undefined ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(undefined)}
            aria-pressed={filters.needsReview === undefined}
          >
            All
          </Badge>
          <Badge
            as="button"
            className={cn(
              'cursor-pointer transition-colors flex items-center gap-1',
              filters.needsReview === true ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(true)}
            aria-pressed={filters.needsReview === true}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs Review
          </Badge>
          <Badge
            as="button"
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === false ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            )}
            onClick={() => handleNeedsReviewChange(false)}
            aria-pressed={filters.needsReview === false}
          >
            No Issues
          </Badge>
        </div>
      </div>
    </div>
  );
}
