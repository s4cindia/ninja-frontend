import { Badge } from '@/components/ui/Badge';
import { Check, X, Clock, Loader2 } from 'lucide-react';
import type { BatchFile, FileStatus } from '@/types/batch.types';

interface FileStatusListProps {
  files: BatchFile[];
}

function getStatusIcon(status: FileStatus) {
  switch (status) {
    case 'UPLOADED':
      return <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />;
    case 'AUDITING':
    case 'PLANNING':
    case 'REMEDIATING':
      return (
        <Loader2 className="h-4 w-4 text-sky-500 animate-spin" aria-hidden="true" />
      );
    case 'AUDITED':
    case 'PLANNED':
      return <Clock className="h-4 w-4 text-sky-500" aria-hidden="true" />;
    case 'REMEDIATED':
      return <Check className="h-4 w-4 text-green-500" aria-hidden="true" />;
    case 'FAILED':
      return <X className="h-4 w-4 text-red-500" aria-hidden="true" />;
    case 'SKIPPED':
      return <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />;
    default:
      return <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />;
  }
}

function getStatusVariant(
  status: FileStatus
): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'UPLOADED':
      return 'info';
    case 'AUDITING':
    case 'AUDITED':
    case 'PLANNING':
    case 'PLANNED':
    case 'REMEDIATING':
      return 'warning';
    case 'REMEDIATED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'SKIPPED':
      return 'info';
    default:
      return 'info';
  }
}

export function FileStatusList({ files }: FileStatusListProps) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-lg font-semibold text-gray-900">
          File Status ({files.length})
        </h2>
      </div>

      <ul className="divide-y" role="list" aria-label="File processing status">
        {files.map((file) => (
          <li key={file.fileId} className="p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center flex-1 min-w-0">
                <div className="mr-3">{getStatusIcon(file.status)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.originalName}
                  </p>
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
                    {(file.issuesAutoFix !== undefined || file.issuesAutoFixed !== undefined) && (
                      <span className="text-xs text-green-600">
                        Auto-Fix: {file.issuesAutoFix ?? file.issuesAutoFixed ?? 0}
                      </span>
                    )}
                    {(file.remainingQuickFix !== undefined || file.quickFixesApplied !== undefined) && (
                      <span className="text-xs text-amber-600">
                        {file.remainingQuickFix === 0 && (file.quickFixesApplied ?? 0) > 0 ? (
                          <span className="text-green-600">
                            Quick Fix: All applied ({file.quickFixesApplied})
                          </span>
                        ) : (
                          <>
                            Quick Fix: {file.remainingQuickFix ?? 0}
                            {(file.quickFixesApplied ?? 0) > 0 && (
                              <span className="text-green-600 ml-1">
                                ({file.quickFixesApplied} applied)
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    )}
                    {file.remainingManual !== undefined && file.remainingManual > 0 && (
                      <span className="text-xs text-gray-500">
                        Manual: {file.remainingManual}
                      </span>
                    )}
                  </div>
                  {file.error && (
                    <p className="text-xs text-red-600 mt-1">Error: {file.error}</p>
                  )}
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
