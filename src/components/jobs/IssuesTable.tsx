import React, { useState, useMemo, useCallback } from 'react';
import { List } from 'react-window';
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { DisplayIssue, SEVERITY_CONFIG, SeverityLevel } from '../../types/job-output.types';
import { sanitizeText } from '@/utils/sanitize';

const ROW_HEIGHT = 64;
const VISIBLE_ROWS = 10;
const VIRTUALIZATION_THRESHOLD = 50;

interface IssuesTableProps {
  issues: DisplayIssue[];
}

type SortField = 'severity' | 'description' | 'location';
type SortOrder = 'asc' | 'desc';
type FilterSeverity = SeverityLevel | 'all';
type AriaSortValue = 'ascending' | 'descending' | 'none';

interface VirtualizedRowProps {
  data: DisplayIssue[];
}

function getAriaSortValue(currentField: SortField, targetField: SortField, order: SortOrder): AriaSortValue {
  if (currentField !== targetField) return 'none';
  return order === 'asc' ? 'ascending' : 'descending';
}

function VirtualizedRowComponent({ index, style, data }: {
  ariaAttributes: { "aria-posinset": number; "aria-setsize": number; role: "listitem" };
  index: number;
  style: React.CSSProperties;
  data: DisplayIssue[];
}): React.ReactElement | null {
  const issue = data[index];
  const config = SEVERITY_CONFIG[issue.severity];
  const Icon = config.icon;

  return (
    <div
      style={style}
      className={`flex items-center border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gray-100`}
    >
      <div className="w-28 px-4 py-2 flex-shrink-0">
        <span
          className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}
        >
          <Icon className="w-3.5 h-3.5" /> {config.label}
        </span>
      </div>
      <div className="flex-1 px-4 py-2 min-w-0">
        <div className="text-sm text-gray-900 truncate">{sanitizeText(issue.description)}</div>
        {issue.wcagCriteria && (
          <div className="text-xs text-gray-500 mt-0.5 truncate">
            WCAG: {sanitizeText(issue.wcagCriteria)}
          </div>
        )}
      </div>
      <div className="w-32 px-4 py-2 flex-shrink-0">
        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700 truncate block">
          {issue.location}
        </code>
      </div>
      <div className="w-20 px-4 py-2 flex-shrink-0 flex justify-center">
        {issue.autoFixable ? (
          <CheckCircle
            className="w-5 h-5 text-green-500"
            role="img"
            aria-label="Auto-fix available"
          />
        ) : (
          <XCircle
            className="w-5 h-5 text-gray-400"
            role="img"
            aria-label="Auto-fix not available"
          />
        )}
      </div>
    </div>
  );
}

export const IssuesTable = React.memo(function IssuesTable({ issues }: IssuesTableProps) {
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [filterSeverity, setFilterSeverity] = useState<FilterSeverity>('all');

  const filteredIssues = useMemo(() => {
    if (filterSeverity === 'all') return issues;
    return issues.filter((issue) => issue.severity === filterSeverity);
  }, [issues, filterSeverity]);

  const sortedIssues = useMemo(() => {
    const sorted = [...filteredIssues].sort((a, b) => {
      let comparison = 0;

      if (sortField === 'severity') {
        comparison = SEVERITY_CONFIG[a.severity].order - SEVERITY_CONFIG[b.severity].order;
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === 'location') {
        comparison = a.location.localeCompare(b.location);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredIssues, sortField, sortOrder]);

  const useVirtualization = sortedIssues.length > VIRTUALIZATION_THRESHOLD;

  const handleSort = useCallback((field: SortField) => {
    setSortOrder(prev => sortField === field && prev === 'asc' ? 'desc' : 'asc');
    setSortField(field);
  }, [sortField]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterSeverity(e.target.value as FilterSeverity);
  }, []);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    );
  };

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-green-800 font-medium">
          No issues found - This document passed all accessibility checks
        </p>
      </div>
    );
  }

  const tableHeader = (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-semibold text-gray-900">
        Issues ({filteredIssues.length} of {issues.length})
      </h3>
      <div className="flex items-center gap-2">
        <label htmlFor="severity-filter" className="sr-only">
          Filter by severity
        </label>
        <select
          id="severity-filter"
          value={filterSeverity}
          onChange={handleFilterChange}
          className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="serious">Serious</option>
          <option value="moderate">Moderate</option>
          <option value="minor">Minor</option>
        </select>
      </div>
    </div>
  );

  if (useVirtualization) {
    return (
      <div>
        {tableHeader}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="flex bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
            <div className="w-28 px-4 py-3 flex-shrink-0">Severity</div>
            <div className="flex-1 px-4 py-3">Description</div>
            <div className="w-32 px-4 py-3 flex-shrink-0">Location</div>
            <div className="w-20 px-4 py-3 flex-shrink-0 text-center">Auto-Fix</div>
          </div>
          <List<VirtualizedRowProps>
            rowCount={sortedIssues.length}
            rowHeight={ROW_HEIGHT}
            rowComponent={VirtualizedRowComponent}
            rowProps={{ data: sortedIssues }}
            style={{ height: ROW_HEIGHT * Math.min(VISIBLE_ROWS, sortedIssues.length) }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Showing {sortedIssues.length} issues (virtualized for performance)
        </p>
      </div>
    );
  }

  return (
    <div>
      {tableHeader}
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                aria-sort={getAriaSortValue(sortField, 'severity', sortOrder)}
              >
                <button
                  type="button"
                  onClick={() => handleSort('severity')}
                  className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                >
                  Severity
                  <SortIcon field="severity" />
                </button>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                aria-sort={getAriaSortValue(sortField, 'description', sortOrder)}
              >
                <button
                  type="button"
                  onClick={() => handleSort('description')}
                  className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                >
                  Description
                  <SortIcon field="description" />
                </button>
              </th>
              <th
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                aria-sort={getAriaSortValue(sortField, 'location', sortOrder)}
              >
                <button
                  type="button"
                  onClick={() => handleSort('location')}
                  className="inline-flex items-center gap-1 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                >
                  Location
                  <SortIcon field="location" />
                </button>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Auto-Fix
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedIssues.map((issue) => {
              const config = SEVERITY_CONFIG[issue.severity];
              const Icon = config.icon;
              return (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {config.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{sanitizeText(issue.description)}</div>
                    {issue.wcagCriteria && (
                      <div className="text-xs text-gray-500 mt-1">
                        WCAG: {sanitizeText(issue.wcagCriteria)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono text-gray-700">
                      {issue.location}
                    </code>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {issue.autoFixable ? (
                      <CheckCircle
                        className="w-5 h-5 text-green-500"
                        role="img"
                        aria-label="Auto-fix available"
                      />
                    ) : (
                      <XCircle
                        className="w-5 h-5 text-gray-400"
                        role="img"
                        aria-label="Auto-fix not available"
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
});
