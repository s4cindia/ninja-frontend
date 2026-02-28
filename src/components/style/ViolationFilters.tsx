/**
 * ViolationFilters Component
 *
 * Filter controls for style violations including category, severity,
 * status, and text search. Also displays the validation summary counts.
 */

import {
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { categoryOptions, severityOptions, statusOptions } from './constants';
import type { StyleCategory, StyleSeverity, ViolationStatus, ValidationSummary } from '@/types/style';

export interface FilterState {
  category?: StyleCategory;
  severity?: StyleSeverity;
  status?: ViolationStatus;
  search?: string;
}

interface ViolationFiltersProps {
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string | undefined) => void;
  onClearFilters: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  summary: ValidationSummary | undefined;
  isLoadingSummary: boolean;
}

const severityIcons: Record<StyleSeverity, React.ElementType> = {
  ERROR: AlertCircle,
  WARNING: AlertTriangle,
  SUGGESTION: Info,
};

export function ViolationFilters({
  filters,
  onFilterChange,
  onClearFilters,
  showFilters,
  onToggleFilters,
  summary,
  isLoadingSummary,
}: ViolationFiltersProps) {
  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <>
      {/* Summary */}
      {summary && !isLoadingSummary && (
        <div className="flex-shrink-0 border-b px-4 py-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.ERROR || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.WARNING || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Warnings</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <Info className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.SUGGESTION || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Suggestions</p>
            </div>
          </div>
          {summary.totalViolations > 0 && (
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{summary.byStatus.FIXED || 0} fixed</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <span>{summary.byStatus.PENDING || 0} pending</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <button type="button"
            onClick={onToggleFilters}
            className={cn(
              'flex items-center gap-2 text-sm',
              hasActiveFilters ? 'text-primary-600' : 'text-gray-600',
              'hover:text-gray-900'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button type="button" onClick={onClearFilters} className="text-sm text-gray-500 hover:text-gray-700">
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Category filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => onFilterChange('category', e.target.value as StyleCategory)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All categories</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
              <div className="flex gap-2">
                {severityOptions.map((opt) => {
                  const Icon = severityIcons[opt.value as StyleSeverity] || Info;
                  const isActive = filters.severity === opt.value;
                  return (
                    <button type="button"
                      key={opt.value}
                      onClick={() => onFilterChange('severity', isActive ? undefined : opt.value)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => onFilterChange('status', e.target.value as ViolationStatus)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => onFilterChange('search', e.target.value)}
                placeholder="Search violations..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
