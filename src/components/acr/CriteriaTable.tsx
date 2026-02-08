import React, { useState, useMemo } from 'react';
import { AlertCircle, Search, MinusCircle, CheckCircle, ChevronDown, ChevronUp, ExternalLink, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { NaSuggestion } from '@/types/confidence.types';

interface AuditIssue {
  code: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  message: string;
  affectedFiles?: string[];
  issueCount?: number;
}

interface Evidence {
  source: string;
  description: string;
  auditIssues?: AuditIssue[];
  affectedFiles?: string[];
  issueCount?: number;
}

interface ManualTest {
  title: string;
  whatToCheck: string[];
}

interface AutomatedCheck {
  id: string;
  description: string;
  passed: boolean;
}

export interface CriterionRow {
  id: string;
  number: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidence: number;
  status: 'fail' | 'needs_verification' | 'likely_na' | 'pass';
  evidence?: Evidence;
  automatedChecks?: AutomatedCheck[];
  manualTest?: ManualTest;
  remarks?: string;
  conformanceLevel?: 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable';
  naSuggestion?: NaSuggestion;
}

interface CriteriaTableProps {
  criteria: CriterionRow[];
  mode: 'preview' | 'interactive';
  onViewDetails?: (criterion: CriterionRow) => void;
  onStartReview?: (criterion: CriterionRow) => void;
  onViewAuditIssue?: (issueCode: string) => void;
  showFilters?: boolean;
}

const getLevelBadgeColor = (level: string) => {
  switch (level) {
    case 'A': return 'bg-blue-100 text-blue-800';
    case 'AA': return 'bg-green-100 text-green-800';
    case 'AAA': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'fail': return <AlertCircle className="h-4 w-4 text-red-600" aria-hidden="true" />;
    case 'needs_verification': return <Search className="h-4 w-4 text-orange-600" aria-hidden="true" />;
    case 'likely_na': return <MinusCircle className="h-4 w-4 text-gray-500" aria-hidden="true" />;
    case 'pass': return <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />;
    default: return null;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'fail': return 'Does Not Support';
    case 'needs_verification': return 'Needs Verification';
    case 'likely_na': return 'Likely N/A';
    case 'pass': return 'Supports';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'fail': return 'text-red-700';
    case 'needs_verification': return 'text-orange-700';
    case 'likely_na': return 'text-gray-700';
    case 'pass': return 'text-green-700';
    default: return 'text-gray-700';
  }
};

export const CriteriaTable: React.FC<CriteriaTableProps> = ({
  criteria,
  mode,
  onViewDetails,
  onStartReview,
  onViewAuditIssue,
  showFilters = true,
}) => {
  const [filterLevel, setFilterLevel] = useState<'all' | 'A' | 'AA' | 'AAA'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'fail' | 'needs_verification' | 'likely_na' | 'pass'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'number' | 'status' | 'confidence'>('number');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredCriteria = useMemo(() => {
    let filtered = [...criteria];

    if (filterLevel !== 'all') {
      filtered = filtered.filter(c => c.level === filterLevel);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    filtered.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'number') {
        const aParts = a.number.split('.').map(Number);
        const bParts = b.number.split('.').map(Number);
        for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
          const aVal = aParts[i] || 0;
          const bVal = bParts[i] || 0;
          if (aVal !== bVal) {
            comparison = aVal - bVal;
            break;
          }
        }
      } else if (sortBy === 'status') {
        const statusOrder: Record<string, number> = { fail: 0, needs_verification: 1, likely_na: 2, pass: 3 };
        comparison = (statusOrder[a.status] ?? 4) - (statusOrder[b.status] ?? 4);
      } else if (sortBy === 'confidence') {
        comparison = a.confidence - b.confidence;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [criteria, filterLevel, filterStatus, sortBy, sortOrder]);

  const toggleRowExpansion = (criterionId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(criterionId)) {
      newExpanded.delete(criterionId);
    } else {
      newExpanded.add(criterionId);
    }
    setExpandedRows(newExpanded);
  };

  const handleSort = (column: 'number' | 'status' | 'confidence') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const handleStartReview = (criterion: CriterionRow) => {
    if (!onStartReview) return;
    onStartReview(criterion);
  };

  return (
    <div className="space-y-4">
      {showFilters && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Level:</span>
              <div className="flex gap-1" role="group" aria-label="Filter by WCAG level">
                {(['all', 'A', 'AA', 'AAA'] as const).map(level => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    aria-pressed={filterLevel === level}
                    className={`px-3 py-1 text-xs font-semibold rounded transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      filterLevel === level
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level === 'all' ? 'All' : level}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">Status:</label>
              <select
                id="status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="px-3 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="fail">Issues Found</option>
                <option value="needs_verification">Needs Verification</option>
                <option value="likely_na">Likely N/A</option>
                <option value="pass">Passed</option>
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm font-medium text-gray-700">Sort by:</span>
              <div className="flex gap-1" role="group" aria-label="Sort criteria">
                {(['number', 'status', 'confidence'] as const).map(column => (
                  <button
                    key={column}
                    onClick={() => handleSort(column)}
                    aria-pressed={sortBy === column}
                    className={`px-3 py-1 text-xs font-medium rounded transition flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                      sortBy === column
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {column === 'number' ? 'Criterion' : column === 'status' ? 'Status' : 'Confidence'}
                    {sortBy === column && (
                      sortOrder === 'asc' 
                        ? <ChevronUp className="h-3 w-3" aria-hidden="true" /> 
                        : <ChevronDown className="h-3 w-3" aria-hidden="true" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-sm text-gray-600" aria-live="polite">
              Showing {filteredCriteria.length} of {criteria.length} criteria
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th scope="col" className="w-8 px-4 py-3">
                  <span className="sr-only">Expand</span>
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Criterion
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Level
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Confidence
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Evidence / Testing
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCriteria.map(criterion => {
                const isExpanded = expandedRows.has(criterion.id);
                return (
                  <React.Fragment key={criterion.id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleRowExpansion(criterion.id)}
                          className="p-1 hover:bg-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-expanded={isExpanded}
                          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for criterion ${criterion.number}`}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-600" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-600" aria-hidden="true" />
                          )}
                        </button>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <span className="font-mono text-sm font-semibold text-gray-900">
                            {criterion.number}
                          </span>
                          <span className="text-sm text-gray-700">
                            {criterion.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded font-semibold ${getLevelBadgeColor(criterion.level)}`}>
                          {criterion.level}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div 
                            className="flex-1 bg-gray-200 rounded-full h-2 max-w-[80px]"
                            role="progressbar"
                            aria-valuenow={criterion.confidence}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${criterion.confidence}% confidence`}
                          >
                            <div
                              className={`h-2 rounded-full ${
                                criterion.confidence === 0 ? 'bg-gray-400' :
                                criterion.confidence < 40 ? 'bg-red-500' :
                                criterion.confidence < 70 ? 'bg-orange-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${criterion.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-mono">
                            {criterion.confidence}%
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(criterion.status)}
                          <span className={`text-xs font-medium ${getStatusColor(criterion.status)}`}>
                            {getStatusText(criterion.status)}
                          </span>
                          {criterion.naSuggestion && (
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                              title={`AI suggests N/A (${criterion.naSuggestion.confidence}% confidence)`}
                            >
                              <Lightbulb className="h-3 w-3" aria-hidden="true" />
                              N/A
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {criterion.evidence ? (
                          <div className="text-xs text-gray-700">
                            <span className="font-medium">{criterion.evidence.description}</span>
                            {criterion.evidence.auditIssues && criterion.evidence.auditIssues.length > 0 && (
                              <div className="mt-1 text-gray-600">
                                {criterion.evidence.auditIssues.length} audit {criterion.evidence.auditIssues.length === 1 ? 'issue' : 'issues'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500 italic">
                            Manual testing required
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {onViewDetails && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(criterion)}
                              className="text-xs"
                            >
                              View Details
                            </Button>
                          )}
                          {mode === 'interactive' && criterion.status === 'needs_verification' && onStartReview && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleStartReview(criterion)}
                              className="text-xs"
                            >
                              Start Review
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-4 pl-8">
                            {criterion.evidence && criterion.evidence.auditIssues && criterion.evidence.auditIssues.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Related Audit Issues:
                                </h4>
                                <div className="space-y-2">
                                  {criterion.evidence.auditIssues.map((issue, idx) => (
                                    <div
                                      key={idx}
                                      className="bg-white border border-red-200 rounded p-3 text-sm"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-mono text-xs font-semibold text-red-700">
                                            {issue.code}
                                          </span>
                                          <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                            issue.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                            issue.severity === 'serious' ? 'bg-orange-100 text-orange-800' :
                                            issue.severity === 'moderate' ? 'bg-yellow-100 text-yellow-800' :
                                            'bg-blue-100 text-blue-800'
                                          }`}>
                                            {issue.severity}
                                          </span>
                                        </div>
                                        {onViewAuditIssue && (
                                          <button
                                            onClick={() => onViewAuditIssue(issue.code)}
                                            className="text-xs text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded flex items-center gap-1"
                                          >
                                            View in Audit
                                            <ExternalLink className="h-3 w-3" aria-hidden="true" />
                                          </button>
                                        )}
                                      </div>
                                      <p className="text-gray-700 mb-2">{issue.message}</p>
                                      {issue.affectedFiles && issue.affectedFiles.length > 0 && (
                                        <div className="text-xs text-gray-600">
                                          Affected: {issue.affectedFiles.slice(0, 3).join(', ')}
                                          {issue.affectedFiles.length > 3 && ` +${issue.affectedFiles.length - 3} more`}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {criterion.automatedChecks && criterion.automatedChecks.length > 0 && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Automated Checks:
                                </h4>
                                <ul className="space-y-1">
                                  {criterion.automatedChecks.map((check) => (
                                    <li key={check.id} className="flex items-start gap-2 text-sm">
                                      {check.passed ? (
                                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" aria-hidden="true" />
                                      )}
                                      <span className={check.passed ? 'text-gray-600' : 'text-red-700'}>
                                        {check.description}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {criterion.manualTest && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  {criterion.manualTest.title}
                                </h4>
                                <ul className="space-y-1">
                                  {criterion.manualTest.whatToCheck.map((check, idx) => (
                                    <li key={idx} className="flex gap-2 text-sm text-gray-700">
                                      <span className="text-blue-600" aria-hidden="true">✓</span>
                                      <span>{check}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            {mode === 'interactive' && criterion.remarks && (
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                                  Reviewer Remarks:
                                </h4>
                                <p className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-3">
                                  {criterion.remarks}
                                </p>
                              </div>
                            )}

                            {!criterion.evidence?.auditIssues?.length && !criterion.automatedChecks?.length && !criterion.manualTest && !criterion.remarks && (
                              <p className="text-sm text-gray-500 italic">
                                No additional details available for this criterion.
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>

          {filteredCriteria.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No criteria match the selected filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
