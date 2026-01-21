import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, X, Clock, FileText, Edit } from 'lucide-react';
import type { BatchFile, FileStatus } from '@/types/batch.types';

interface FileResultsListProps {
  files: BatchFile[];
  onManualRemediation: (fileId: string) => void;
}

function getStatusIcon(status: FileStatus) {
  switch (status) {
    case 'REMEDIATED':
      return <Check className="h-4 w-4 text-green-500" aria-hidden="true" />;
    case 'FAILED':
      return <X className="h-4 w-4 text-red-500" aria-hidden="true" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />;
  }
}

function getStatusVariant(
  status: FileStatus
): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'REMEDIATED':
      return 'success';
    case 'FAILED':
      return 'error';
    default:
      return 'info';
  }
}

export function FileResultsList({ files, onManualRemediation }: FileResultsListProps) {
  const remediatedFiles = files.filter((f) => f.status === 'REMEDIATED');
  const failedFiles = files.filter((f) => f.status === 'FAILED');
  const otherFiles = files.filter(
    (f) => f.status !== 'REMEDIATED' && f.status !== 'FAILED'
  );

  const renderFileRow = (file: BatchFile) => (
    <li key={file.fileId} className="p-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1 min-w-0">
          <div className="mr-3">{getStatusIcon(file.status)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-400" aria-hidden="true" />
              <p className="text-sm font-medium text-gray-900 truncate">
                {file.originalName}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <Badge variant={getStatusVariant(file.status)} size="sm">
                {file.status}
              </Badge>
              {file.auditScore !== undefined && (
                <span className="text-xs text-gray-600">
                  Score: {file.auditScore}%
                </span>
              )}
              {file.issuesFound !== undefined && (
                <span className="text-xs text-gray-600">
                  Issues: {file.issuesFound}
                </span>
              )}
              {file.issuesAutoFixed !== undefined && file.issuesAutoFixed > 0 && (
                <span className="text-xs text-green-600">
                  Auto-Fixed: {file.issuesAutoFixed}
                </span>
              )}
              {file.remainingQuickFix !== undefined && file.remainingQuickFix > 0 && (
                <span className="text-xs text-orange-600">
                  Quick-Fix: {file.remainingQuickFix}
                </span>
              )}
              {file.remainingManual !== undefined && file.remainingManual > 0 && (
                <span className="text-xs text-purple-600">
                  Manual: {file.remainingManual}
                </span>
              )}
            </div>
            {file.error && (
              <p className="text-xs text-red-600 mt-1">Error: {file.error}</p>
            )}
          </div>
        </div>

        {(file.remainingQuickFix ?? 0) > 0 || (file.remainingManual ?? 0) > 0 ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onManualRemediation(file.fileId)}
            leftIcon={<Edit className="h-3 w-3" />}
          >
            Continue
          </Button>
        ) : null}
      </div>
    </li>
  );

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          File Results ({files.length})
        </h2>
      </div>

      {remediatedFiles.length > 0 && (
        <div>
          <div className="px-6 py-3 bg-green-50 border-b">
            <h3 className="text-sm font-medium text-green-800">
              Successfully Remediated ({remediatedFiles.length})
            </h3>
          </div>
          <ul className="divide-y" role="list">
            {remediatedFiles.map(renderFileRow)}
          </ul>
        </div>
      )}

      {failedFiles.length > 0 && (
        <div>
          <div className="px-6 py-3 bg-red-50 border-b">
            <h3 className="text-sm font-medium text-red-800">
              Failed ({failedFiles.length})
            </h3>
          </div>
          <ul className="divide-y" role="list">
            {failedFiles.map(renderFileRow)}
          </ul>
        </div>
      )}

      {otherFiles.length > 0 && (
        <div>
          <div className="px-6 py-3 bg-gray-50 border-b">
            <h3 className="text-sm font-medium text-gray-800">
              Other ({otherFiles.length})
            </h3>
          </div>
          <ul className="divide-y" role="list">
            {otherFiles.map(renderFileRow)}
          </ul>
        </div>
      )}
    </div>
  );
}
