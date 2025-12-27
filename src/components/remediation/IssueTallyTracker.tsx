import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ListChecks
} from 'lucide-react';

interface TallyData {
  audit: {
    total: number;
    bySource: { epubCheck: number; ace: number; jsAuditor: number };
    bySeverity: { critical: number; serious: number; moderate: number; minor: number };
  };
  plan: {
    total: number;
    bySource: { epubCheck: number; ace: number; jsAuditor: number };
    byClassification: { autoFixable: number; quickFix: number; manual: number };
  };
  validation: {
    isValid: boolean;
    errors: string[];
    discrepancies: { field: string; expected: number; actual: number; difference: number }[];
  };
}

interface CompletionStats {
  fixed: number;
  failed: number;
  skipped: number;
  pending: number;
}

interface IssueTallyTrackerProps {
  tally: TallyData;
  completionStats?: CompletionStats;
}

const SourceRow: React.FC<{ label: string; audit: number; plan: number }> = ({
  label,
  audit,
  plan
}) => {
  const matches = audit === plan;
  return (
    <tr className={!matches ? 'text-red-600 bg-red-50' : ''}>
      <td className="py-1">{label}</td>
      <td className="text-right py-1">{audit}</td>
      <td className="text-right py-1">{plan}</td>
      <td className="text-right py-1">
        {matches ? (
          <CheckCircle className="h-3 w-3 text-green-500 inline" />
        ) : (
          <XCircle className="h-3 w-3 text-red-500 inline" />
        )}
      </td>
    </tr>
  );
};

export const IssueTallyTracker: React.FC<IssueTallyTrackerProps> = ({
  tally,
  completionStats,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasDiscrepancy = tally.audit.total !== tally.plan.total;
  const completedCount = completionStats
    ? completionStats.fixed + completionStats.skipped
    : 0;

  return (
    <div className="bg-white border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-label="Toggle issue tally details"
      >
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">Issue Tally Tracker</span>
          {tally.validation.isValid ? (
            <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="h-3 w-3" />
              Valid
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
              <XCircle className="h-3 w-3" />
              Mismatch
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </button>

      <div className="px-4 pb-4">
        <div className="flex items-center justify-center gap-2">
          <div className="text-center px-4 py-2 bg-gray-100 rounded-lg">
            <div className="text-xl font-bold text-gray-700">{tally.audit.total}</div>
            <div className="text-xs text-gray-500">Audit</div>
          </div>

          <ArrowRight className={`h-5 w-5 ${hasDiscrepancy ? 'text-red-500' : 'text-green-500'}`} />

          <div className={`text-center px-4 py-2 rounded-lg ${
            hasDiscrepancy
              ? 'bg-red-50 border border-red-200'
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className={`text-xl font-bold ${hasDiscrepancy ? 'text-red-600' : 'text-green-600'}`}>
              {tally.plan.total}
            </div>
            <div className="text-xs text-gray-500">Plan</div>
          </div>

          {completionStats && (
            <>
              <ArrowRight className="h-5 w-5 text-blue-500" />

              <div className="text-center px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-xl font-bold text-blue-600">{completedCount}</div>
                <div className="text-xs text-gray-500">Done</div>
              </div>
            </>
          )}
        </div>

        {hasDiscrepancy && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>
              {tally.audit.total > tally.plan.total
                ? `${tally.audit.total - tally.plan.total} issues missing from plan`
                : `${tally.plan.total - tally.audit.total} extra issues in plan`}
            </span>
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="border-t px-4 py-4 bg-gray-50 space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">By Source</h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="text-left py-1">Source</th>
                  <th className="text-right py-1">Audit</th>
                  <th className="text-right py-1">Plan</th>
                  <th className="text-right py-1">Status</th>
                </tr>
              </thead>
              <tbody>
                <SourceRow
                  label="EPUBCheck"
                  audit={tally.audit.bySource.epubCheck}
                  plan={tally.plan.bySource.epubCheck}
                />
                <SourceRow
                  label="ACE"
                  audit={tally.audit.bySource.ace}
                  plan={tally.plan.bySource.ace}
                />
                <SourceRow
                  label="JS Auditor"
                  audit={tally.audit.bySource.jsAuditor}
                  plan={tally.plan.bySource.jsAuditor}
                />
                <tr className="font-medium border-t">
                  <td className="py-1">Total</td>
                  <td className="text-right py-1">{tally.audit.total}</td>
                  <td className="text-right py-1">{tally.plan.total}</td>
                  <td className="text-right py-1">
                    {tally.audit.total === tally.plan.total ? (
                      <CheckCircle className="h-4 w-4 text-green-500 inline" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500 inline" />
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">By Severity</h4>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-red-50 rounded p-2">
                <div className="font-bold text-red-600">{tally.audit.bySeverity.critical}</div>
                <div className="text-gray-500">Critical</div>
              </div>
              <div className="bg-orange-50 rounded p-2">
                <div className="font-bold text-orange-600">{tally.audit.bySeverity.serious}</div>
                <div className="text-gray-500">Serious</div>
              </div>
              <div className="bg-yellow-50 rounded p-2">
                <div className="font-bold text-yellow-600">{tally.audit.bySeverity.moderate}</div>
                <div className="text-gray-500">Moderate</div>
              </div>
              <div className="bg-blue-50 rounded p-2">
                <div className="font-bold text-blue-600">{tally.audit.bySeverity.minor}</div>
                <div className="text-gray-500">Minor</div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">By Fix Type</h4>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="font-bold text-green-600">{tally.plan.byClassification.autoFixable}</div>
                <div className="text-gray-500">Auto-Fixable</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="font-bold text-blue-600">{tally.plan.byClassification.quickFix}</div>
                <div className="text-gray-500">Quick Fix</div>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="font-bold text-yellow-600">{tally.plan.byClassification.manual}</div>
                <div className="text-gray-500">Manual</div>
              </div>
            </div>
          </div>

          {tally.validation.errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                <AlertTriangle className="h-4 w-4" />
                Tally Errors
              </div>
              <ul className="text-xs text-red-600 space-y-1">
                {tally.validation.errors.map((error, i) => (
                  <li key={i}>• {error}</li>
                ))}
              </ul>
            </div>
          )}

          {completionStats && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Completion Status</h4>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-green-50 rounded p-2">
                  <div className="font-bold text-green-600">{completionStats.fixed}</div>
                  <div className="text-gray-500">Fixed</div>
                </div>
                <div className="bg-red-50 rounded p-2">
                  <div className="font-bold text-red-600">{completionStats.failed}</div>
                  <div className="text-gray-500">Failed</div>
                </div>
                <div className="bg-yellow-50 rounded p-2">
                  <div className="font-bold text-yellow-600">{completionStats.skipped}</div>
                  <div className="text-gray-500">Skipped</div>
                </div>
                <div className="bg-gray-100 rounded p-2">
                  <div className="font-bold text-gray-600">{completionStats.pending}</div>
                  <div className="text-gray-500">Pending</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export type { TallyData, CompletionStats, IssueTallyTrackerProps };
