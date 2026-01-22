import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Check, X, Clock, FileText, Eye, Download } from 'lucide-react';
import { batchService } from '@/services/batch.service';
import toast from 'react-hot-toast';
import type { BatchFile, FileStatus } from '@/types/batch.types';

interface FileResultsListProps {
  batchId: string;
  files: BatchFile[];
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

export function FileResultsList({ batchId, files }: FileResultsListProps) {
  const navigate = useNavigate();
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  const remediatedFiles = files.filter((f) => f.status === 'REMEDIATED');
  const failedFiles = files.filter((f) => f.status === 'FAILED');
  const otherFiles = files.filter(
    (f) => f.status !== 'REMEDIATED' && f.status !== 'FAILED'
  );

  const handleViewDetails = (fileId: string) => {
    navigate(`/batch/${batchId}/file/${fileId}`);
  };

  const handleDownloadFile = async (file: BatchFile) => {
    try {
      setDownloadingFileId(file.fileId);
      const downloadUrl = await batchService.getFileDownloadUrl(batchId, file.fileId);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloading ${file.originalName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to download file: ${message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

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

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleViewDetails(file.fileId)}
            leftIcon={<Eye className="h-3 w-3" />}
          >
            View Details
          </Button>
          {file.status === 'REMEDIATED' && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => handleDownloadFile(file)}
              disabled={downloadingFileId === file.fileId}
              isLoading={downloadingFileId === file.fileId}
              leftIcon={<Download className="h-3 w-3" />}
            >
              Download
            </Button>
          )}
        </div>
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
