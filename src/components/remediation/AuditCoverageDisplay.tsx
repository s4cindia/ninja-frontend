import React from 'react';
import { Info, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { clsx } from 'clsx';
import type { AuditCoverage } from '@/types/remediation.types';

interface AuditCoverageDisplayProps {
  coverage: AuditCoverage;
  className?: string;
}

export const AuditCoverageDisplay: React.FC<AuditCoverageDisplayProps> = React.memo(({
  coverage,
  className,
}) => {
  const isIncomplete = coverage.percentage < 100;
  const percentage = Math.round(coverage.percentage);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-500" />
          Audit Coverage
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isIncomplete && (
          <Alert variant="warning" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <div className="ml-2">
              Incomplete coverage: Only {coverage.filesScanned} of {coverage.totalFiles} files were scanned.
              Results may not reflect all issues in the document.
            </div>
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Files Scanned: {coverage.filesScanned} / {coverage.totalFiles}
              </span>
              <span className={clsx(
                'text-sm font-semibold',
                percentage === 100 ? 'text-green-600' : 'text-orange-600'
              )}>
                {percentage}%
              </span>
            </div>
            <div
              className="h-2 bg-gray-200 rounded-full overflow-hidden"
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Audit coverage: ${percentage}%`}
            >
              <div
                className={clsx(
                  'h-full transition-all duration-500 rounded-full',
                  percentage === 100 ? 'bg-green-500' : 'bg-orange-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Front Matter</div>
              <div className="text-lg font-semibold text-gray-900">
                {coverage.fileCategories?.frontMatter ?? 0}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Chapters</div>
              <div className="text-lg font-semibold text-gray-900">
                {coverage.fileCategories?.chapters ?? 0}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Back Matter</div>
              <div className="text-lg font-semibold text-gray-900">
                {coverage.fileCategories?.backMatter ?? 0}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

AuditCoverageDisplay.displayName = 'AuditCoverageDisplay';
