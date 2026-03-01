/**
 * ViolationFilters Component
 *
 * Filter controls for style violations. Only shows categories/severities/statuses
 * that have actual violations, displayed as clickable chips with counts.
 */

import {
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { categoryOptions, statusOptions } from './constants';
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

const severityConfig: Record<StyleSeverity, { icon: React.ElementType; color: string; activeColor: string; label: string }> = {
  ERROR: { icon: AlertCircle, color: 'text-red-600', activeColor: 'bg-red-100 text-red-800 border-red-300', label: 'Errors' },
  WARNING: { icon: AlertTriangle, color: 'text-amber-600', activeColor: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Warnings' },
  SUGGESTION: { icon: Info, color: 'text-blue-600', activeColor: 'bg-blue-100 text-blue-800 border-blue-300', label: 'Suggestions' },
};

const categoryLabelMap: Record<string, string> = {};
for (const opt of categoryOptions) categoryLabelMap[opt.value] = opt.label;

const statusLabelMap: Record<string, string> = {};
for (const opt of statusOptions) statusLabelMap[opt.value] = opt.label;

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

  // Derive which categories/statuses actually have violations
  const activeCategories = summary?.byCategory
    ? Object.entries(summary.byCategory).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
    : [];
  const activeStatuses = summary?.byStatus
    ? Object.entries(summary.byStatus).filter(([, count]) => count > 0).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <>
      {/* Summary — clickable severity chips that act as filters */}
      {summary && !isLoadingSummary && (
        <div className="flex-shrink-0 border-b px-4 py-3">
          <div className="grid grid-cols-3 gap-3">
            {(['ERROR', 'WARNING', 'SUGGESTION'] as StyleSeverity[]).map((sev) => {
              const count = summary.bySeverity[sev] || 0;
              const cfg = severityConfig[sev];
              const Icon = cfg.icon;
              const isActive = filters.severity === sev;
              return (
                <button
                  key={sev}
                  type="button"
                  onClick={() => onFilterChange('severity', isActive ? undefined : sev)}
                  className={cn(
                    'text-center rounded-lg py-2 transition-all border',
                    isActive
                      ? cfg.activeColor
                      : count > 0
                        ? 'border-transparent hover:bg-gray-50 cursor-pointer'
                        : 'border-transparent opacity-40 cursor-default',
                  )}
                  disabled={count === 0}
                >
                  <div className={cn('flex items-center justify-center gap-1', cfg.color)}>
                    <Icon className="h-4 w-4" />
                    <span className="text-lg font-semibold">{count}</span>
                  </div>
                  <p className="text-xs text-gray-500">{cfg.label}</p>
                </button>
              );
            })}
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
            <button type="button" onClick={onClearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <X className="h-3 w-3" />
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Category filter — only show categories that have violations */}
            {activeCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeCategories.map(([cat, count]) => {
                    const isActive = filters.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => onFilterChange('category', isActive ? undefined : cat)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors border',
                          isActive
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        {categoryLabelMap[cat] || cat}
                        <span className={cn(
                          'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none',
                          isActive ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-500'
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status filter — only show statuses that have violations */}
            {activeStatuses.length > 1 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Status</label>
                <div className="flex flex-wrap gap-1.5">
                  {activeStatuses.map(([st, count]) => {
                    const isActive = filters.status === st;
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => onFilterChange('status', isActive ? undefined : st)}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors border',
                          isActive
                            ? 'bg-primary-100 text-primary-700 border-primary-300'
                            : st === 'FIXED'
                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                              : st === 'IGNORED' || st === 'WONT_FIX'
                                ? 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        )}
                      >
                        {statusLabelMap[st] || st}
                        <span className={cn(
                          'ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] leading-none',
                          isActive ? 'bg-primary-200 text-primary-800' : 'bg-gray-200 text-gray-500'
                        )}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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
