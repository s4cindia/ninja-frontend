import React from 'react';
import { Wrench, FileEdit, CheckCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { AutoRemediationResult } from '@/types/remediation.types';

interface RemediationCompleteProps {
  result: AutoRemediationResult;
  onViewComparison: () => void;
  onStartNewAudit: () => void;
  onContinueQuickFix: () => void;
}

export const RemediationComplete: React.FC<RemediationCompleteProps> = ({
  result,
  onViewComparison,
  onStartNewAudit,
  onContinueQuickFix,
}) => {
  const hasQuickFixPending = result.quickFixPending > 0;
  const hasManualPending = result.manualPending > 0;
  const allComplete = !hasQuickFixPending && !hasManualPending;

  return (
    <div className="space-y-6 p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-full">
          <CheckCircle className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-green-700">
          Auto-Remediation Complete
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="text-3xl font-bold text-green-600">{result.fixed}</div>
          <div className="text-sm text-gray-600">Issues Fixed</div>
        </div>
        <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
          <div className="text-3xl font-bold text-red-600">{result.failed}</div>
          <div className="text-sm text-gray-600">Failed</div>
        </div>
        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="text-3xl font-bold text-blue-600">{result.quickFixPending}</div>
          <div className="text-sm text-gray-600">Need Quick Fix</div>
        </div>
        <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="text-3xl font-bold text-yellow-600">{result.manualPending}</div>
          <div className="text-sm text-gray-600">Need Manual Fix</div>
        </div>
      </div>

      {(hasQuickFixPending || hasManualPending) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">Next Steps</h3>
          <ul className="text-sm text-blue-700 space-y-2">
            {hasQuickFixPending && (
              <li className="flex items-center gap-2">
                <Wrench className="h-4 w-4 flex-shrink-0" />
                <span>{result.quickFixPending} issue{result.quickFixPending !== 1 ? 's' : ''} need your input via Quick Fix Panel</span>
              </li>
            )}
            {hasManualPending && (
              <li className="flex items-center gap-2">
                <FileEdit className="h-4 w-4 flex-shrink-0" />
                <span>{result.manualPending} issue{result.manualPending !== 1 ? 's' : ''} require manual code editing in Sigil</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {allComplete && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            All issues have been resolved! Your EPUB is now accessibility compliant.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={onViewComparison} variant="primary">
          <ArrowRight className="h-4 w-4 mr-2" />
          View Comparison
        </Button>

        {hasQuickFixPending && (
          <Button onClick={onContinueQuickFix} variant="secondary">
            <Wrench className="h-4 w-4 mr-2" />
            Continue with Quick Fix ({result.quickFixPending})
          </Button>
        )}

        <Button onClick={onStartNewAudit} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Start New Audit
        </Button>
      </div>
    </div>
  );
};
