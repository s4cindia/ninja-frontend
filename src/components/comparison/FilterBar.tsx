import React from 'react';
import { Button } from '../ui/Button';
import type { ComparisonFilters } from '@/types/comparison';

interface FilterBarProps {
  filters: ComparisonFilters;
  onFilterChange: (filters: ComparisonFilters) => void;
  changeTypes: string[];
}

const SEVERITY_OPTIONS = ['All', 'CRITICAL', 'MAJOR', 'MINOR'];
const STATUS_OPTIONS = ['All', 'APPLIED', 'REJECTED', 'REVERTED', 'SKIPPED', 'FAILED'];

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  changeTypes,
}) => {
  const handleChange = (key: keyof ComparisonFilters, value: string) => {
    onFilterChange({
      ...filters,
      [key]: value === 'All' ? undefined : value,
    });
  };

  const handleReset = () => {
    onFilterChange({});
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Change Type</label>
          <select
            value={filters.changeType || 'All'}
            onChange={(e) => handleChange('changeType', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="All">All</option>
            {changeTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Severity</label>
          <select
            value={filters.severity || 'All'}
            onChange={(e) => handleChange('severity', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-500">Status</label>
          <select
            value={filters.status || 'All'}
            onChange={(e) => handleChange('status', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset Filters
          </Button>
        </div>
      </div>
    </div>
  );
};
