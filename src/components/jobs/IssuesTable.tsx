import { useState, useMemo } from 'react';
import { CheckCircle, XCircle, ChevronDown, ChevronUp, AlertCircle, AlertTriangle, Info, LucideIcon } from 'lucide-react';
import { DisplayIssue, SEVERITY_CONFIG, SeverityLevel } from '../../types/job-output.types';

const SEVERITY_ICONS: Record<SeverityLevel, LucideIcon> = {
  critical: AlertCircle,
  serious: AlertTriangle,
  moderate: AlertTriangle,
  minor: Info,
};

interface IssuesTableProps {
  issues: DisplayIssue[];
}

type SortField = 'severity' | 'description' | 'location';
type SortOrder = 'asc' | 'desc';
type FilterSeverity = SeverityLevel | 'all';
type AriaSortValue = 'ascending' | 'descending' | 'none';

function getAriaSortValue(currentField: SortField, targetField: SortField, order: SortOrder): AriaSortValue {
  if (currentField !== targetField) return 'none';
  return order === 'asc' ? 'ascending' : 'descending';
}

const SEVERITY_PRIORITY: Record<DisplayIssue['severity'], number> = {
  critical: 0,
  serious: 1,
  moderate: 2,
  minor: 3,
};

export function IssuesTable({ issues }: IssuesTableProps) {
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
        comparison = SEVERITY_PRIORITY[a.severity] - SEVERITY_PRIORITY[b.severity];
      } else if (sortField === 'description') {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === 'location') {
        comparison = a.location.localeCompare(b.location);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredIssues, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

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

  return (
    <div>
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
            onChange={(e) => setFilterSeverity(e.target.value as FilterSeverity)}
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
              const Icon = SEVERITY_ICONS[issue.severity];
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
                    <div className="text-sm text-gray-900">{issue.description}</div>
                    {issue.wcagCriteria && (
                      <div className="text-xs text-gray-500 mt-1">
                        WCAG: {Array.isArray(issue.wcagCriteria)
                          ? issue.wcagCriteria.join(', ')
                          : issue.wcagCriteria}
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
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
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
}
