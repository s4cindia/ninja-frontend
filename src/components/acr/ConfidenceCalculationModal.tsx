import { X, TrendingUp, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { CriterionConfidence } from '@/services/api';
import type { CriterionConfidenceWithIssues } from '@/types/confidence.types';

interface ConfidenceCalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: CriterionConfidence[] | CriterionConfidenceWithIssues[];
  overallConfidence: number;
}

interface ConfidenceBreakdown {
  total: number;
  applicable: number;
  notApplicable: number;
  high: { count: number; avgScore: number; criteria: Array<CriterionConfidence | CriterionConfidenceWithIssues> };
  medium: { count: number; avgScore: number; criteria: Array<CriterionConfidence | CriterionConfidenceWithIssues> };
  low: { count: number; avgScore: number; criteria: Array<CriterionConfidence | CriterionConfidenceWithIssues> };
}

export function ConfidenceCalculationModal({
  isOpen,
  onClose,
  criteria,
  overallConfidence,
}: ConfidenceCalculationModalProps) {
  if (!isOpen) return null;

  // Calculate breakdown
  const breakdown: ConfidenceBreakdown = criteria.reduce(
    (acc, c) => {
      const score = typeof c.confidenceScore === 'number' ? c.confidenceScore : 0;

      // Check if N/A (multiple ways to mark as N/A)
      const isNA =
        ('naSuggestion' in c && c.naSuggestion?.suggestedStatus === 'not_applicable') ||
        ('status' in c && c.status === 'not_applicable') ||
        ('isNotApplicable' in c && c.isNotApplicable === true);

      if (isNA) {
        acc.notApplicable++;
      } else {
        acc.applicable++;

        if (score >= 0.9) {
          acc.high.count++;
          acc.high.criteria.push(c);
        } else if (score >= 0.7) {
          acc.medium.count++;
          acc.medium.criteria.push(c);
        } else {
          acc.low.count++;
          acc.low.criteria.push(c);
        }
      }

      return acc;
    },
    {
      total: criteria.length,
      applicable: 0,
      notApplicable: 0,
      high: { count: 0, avgScore: 0, criteria: [] as Array<CriterionConfidence | CriterionConfidenceWithIssues> },
      medium: { count: 0, avgScore: 0, criteria: [] as Array<CriterionConfidence | CriterionConfidenceWithIssues> },
      low: { count: 0, avgScore: 0, criteria: [] as Array<CriterionConfidence | CriterionConfidenceWithIssues> },
    }
  );

  // Calculate average scores for each level
  breakdown.high.avgScore = breakdown.high.criteria.length > 0
    ? Math.round(breakdown.high.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / breakdown.high.criteria.length * 100)
    : 0;

  breakdown.medium.avgScore = breakdown.medium.criteria.length > 0
    ? Math.round(breakdown.medium.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / breakdown.medium.criteria.length * 100)
    : 0;

  breakdown.low.avgScore = breakdown.low.criteria.length > 0
    ? Math.round(breakdown.low.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0) / breakdown.low.criteria.length * 100)
    : 0;

  // Calculate contributions
  const highContribution = breakdown.high.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0);
  const mediumContribution = breakdown.medium.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0);
  const lowContribution = breakdown.low.criteria.reduce((sum, c) => sum + (c.confidenceScore || 0), 0);
  const totalContribution = highContribution + mediumContribution + lowContribution;

  const displayOverallConfidence = Math.round(overallConfidence * 100);

  // Get confidence label
  const getConfidenceLabel = (score: number): string => {
    if (score >= 90) return 'High';
    if (score >= 70) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-orange-600';
  };

  // Combine all applicable criteria for table
  const allApplicableCriteria = [
    ...breakdown.high.criteria,
    ...breakdown.medium.criteria,
    ...breakdown.low.criteria,
  ].sort((a, b) => (b.confidenceScore || 0) - (a.confidenceScore || 0));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Confidence Score Calculation</h2>
              <p className="text-sm text-gray-600">How we calculated your {displayOverallConfidence}% confidence score</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          {/* Overall Score */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Overall Confidence</h3>
            </div>
            <div className="text-4xl font-bold text-blue-600 mb-1">{displayOverallConfidence}%</div>
            <div className="text-sm text-gray-600">
              {getConfidenceLabel(displayOverallConfidence)} Confidence
            </div>
          </div>

          <div className="border-t border-gray-200 my-6" />

          {/* Criteria Breakdown */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Criteria Breakdown</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Total Criteria Evaluated</div>
                <div className="text-2xl font-bold text-gray-900">{breakdown.total}</div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Applicable Criteria</div>
                <div className="text-2xl font-bold text-blue-600">{breakdown.applicable}</div>
              </div>
            </div>

            {breakdown.notApplicable > 0 && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                <strong>{breakdown.notApplicable} criteria</strong> marked as Not Applicable and excluded from calculations
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 my-6" />

          {/* Confidence Distribution */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Confidence Distribution</h3>

            <div className="space-y-4">
              {/* High Confidence */}
              {breakdown.high.count > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="font-semibold text-gray-900">High Confidence (90-100%)</span>
                    </div>
                    <span className="text-sm text-gray-600">{breakdown.high.count} criteria</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    Average score: <span className="font-semibold">{breakdown.high.avgScore}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Contribution: {breakdown.high.count} × {breakdown.high.avgScore / 100} = {highContribution.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Medium Confidence */}
              {breakdown.medium.count > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
                      <span className="font-semibold text-gray-900">Medium Confidence (70-89%)</span>
                    </div>
                    <span className="text-sm text-gray-600">{breakdown.medium.count} criteria</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    Average score: <span className="font-semibold">{breakdown.medium.avgScore}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Contribution: {breakdown.medium.count} × {breakdown.medium.avgScore / 100} = {mediumContribution.toFixed(2)}
                  </div>
                </div>
              )}

              {/* Low Confidence */}
              {breakdown.low.count > 0 && (
                <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="font-semibold text-gray-900">Low Confidence (50-69%)</span>
                    </div>
                    <span className="text-sm text-gray-600">{breakdown.low.count} criteria</span>
                  </div>
                  <div className="text-sm text-gray-700 mb-1">
                    Average score: <span className="font-semibold">{breakdown.low.avgScore}%</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    Contribution: {breakdown.low.count} × {breakdown.low.avgScore / 100} = {lowContribution.toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 my-6" />

          {/* Final Calculation */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🧮 Final Calculation</h3>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 font-mono text-sm">
              <div className="mb-2">
                <span className="text-gray-700">Overall Confidence = </span>
                <span className="text-blue-600 font-semibold">Total / Applicable Criteria</span>
              </div>
              <div className="mb-2 ml-4">
                <span className="text-gray-700">= ({highContribution.toFixed(2)} + {mediumContribution.toFixed(2)} + {lowContribution.toFixed(2)}) / {breakdown.applicable}</span>
              </div>
              <div className="mb-2 ml-4">
                <span className="text-gray-700">= {totalContribution.toFixed(2)} / {breakdown.applicable}</span>
              </div>
              <div className="ml-4">
                <span className="text-gray-700">= </span>
                <span className="text-blue-600 font-bold text-lg">{displayOverallConfidence}%</span>
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              <strong>Note:</strong> The overall confidence score is the weighted average of all applicable criteria.
              N/A criteria are excluded from conformance calculations. Individual scores reflect the automation
              tool's confidence in its assessment for each criterion.
            </div>
          </div>

          <div className="border-t border-gray-200 my-6" />

          {/* Individual Criterion Scores Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Individual Criterion Scores</h3>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Criterion
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confidence
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allApplicableCriteria.map((criterion) => {
                    const score = Math.round((criterion.confidenceScore || 0) * 100);
                    const label = getConfidenceLabel(score);
                    const colorClass = getConfidenceColor(score);

                    return (
                      <tr key={criterion.criterionId} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {criterion.criterionId}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate">
                          {criterion.name}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                          <span className="px-2 py-1 rounded-full bg-gray-100 text-xs font-medium">
                            Level {criterion.level}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          <span className={`font-semibold ${colorClass}`}>{score}%</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {label === 'High' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                              <div className="w-2 h-2 rounded-full bg-green-500" />
                              {label}
                            </span>
                          )}
                          {label === 'Medium' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                              <div className="w-2 h-2 rounded-full bg-yellow-500" />
                              {label}
                            </span>
                          )}
                          {label === 'Low' && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                              <div className="w-2 h-2 rounded-full bg-orange-500" />
                              {label}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allApplicableCriteria.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No applicable criteria to display
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <Button onClick={onClose} variant="primary">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
