import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useBatchFile } from '@/hooks/useBatch';
import { batchService } from '@/services/batch.service';
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  Wrench,
  Edit3,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { BatchFileIssue, FileStatus } from '@/types/batch.types';

function getStatusVariant(
  status: FileStatus
): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'REMEDIATED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'REMEDIATING':
    case 'AUDITING':
    case 'PLANNING':
      return 'warning';
    default:
      return 'info';
  }
}

function IssueItem({
  issue,
  variant,
}: {
  issue: BatchFileIssue;
  variant: 'success' | 'warning' | 'manual';
}) {
  const bgClass =
    variant === 'success'
      ? 'bg-green-50 border-green-200'
      : variant === 'warning'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200';

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
            {issue.criterion}
          </span>
          {issue.title && (
            <span className="font-medium text-gray-900">{issue.title}</span>
          )}
        </div>
        <Badge
          variant={
            issue.severity === 'critical'
              ? 'error'
              : issue.severity === 'major'
                ? 'warning'
                : 'info'
          }
          size="sm"
        >
          {issue.severity}
        </Badge>
      </div>
      <p className="text-sm text-gray-700 mb-2">{issue.description}</p>
      {issue.fixApplied && (
        <p className="text-sm text-green-700 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" /> Fixed: {issue.fixApplied}
        </p>
      )}
      {issue.suggestedFix && (
        <p className="text-sm text-amber-700">Suggested fix: {issue.suggestedFix}</p>
      )}
      {issue.guidance && (
        <p className="text-sm text-gray-600">Guidance: {issue.guidance}</p>
      )}
    </div>
  );
}

export default function BatchFileDetailsPage() {
  const { batchId, fileId } = useParams<{ batchId: string; fileId: string }>();
  const navigate = useNavigate();
  const { data: file, isLoading, error } = useBatchFile(batchId, fileId);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!batchId || !fileId || !file) return;

    try {
      setIsDownloading(true);
      const downloadUrl = await batchService.getFileDownloadUrl(batchId, fileId);

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = file.originalName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(`Downloading ${file.originalName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to download file: ${message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Failed to load file details
          </h2>
          <p className="text-gray-600 mb-4">
            The requested file could not be found or loaded.
          </p>
          <Button onClick={() => navigate(`/batch/${batchId}/results`)}>
            Back to Batch Results
          </Button>
        </div>
      </div>
    );
  }

  const autoFixedIssues = file.autoFixedIssues || [];
  const quickFixIssues = file.quickFixIssues || [];
  const manualIssues = file.manualIssues || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Batches', path: '/batches' },
          { label: 'Batch Results', path: `/batch/${batchId}/results` },
          { label: file.originalName },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/batch/${batchId}/results`)}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
          >
            Back to Batch Results
          </Button>
        </div>

        {file.status === 'REMEDIATED' && file.remediatedS3Key && (
          <Button
            onClick={handleDownload}
            isLoading={isDownloading}
            leftIcon={<Download className="h-4 w-4" />}
          >
            Download Remediated File
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-4">
          <FileText className="h-10 w-10 text-sky-600" aria-hidden="true" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {file.originalName}
            </h1>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant={getStatusVariant(file.status)} size="sm">
                {file.status}
              </Badge>
              {file.auditScore !== undefined && (
                <span className="text-sm text-gray-600">
                  Accessibility Score: <strong>{file.auditScore}%</strong>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">File Summary</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {file.issuesFound ?? 0}
            </p>
            <p className="text-xs text-gray-600">Total Issues</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {file.issuesAutoFixed ?? 0}
            </p>
            <p className="text-xs text-gray-600">Auto-Fixed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {file.remainingQuickFix ?? 0}
            </p>
            <p className="text-xs text-gray-600">Quick-Fix</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-500">
              {file.remainingManual ?? 0}
            </p>
            <p className="text-xs text-gray-600">Manual</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-sky-600">
              {file.auditScore ?? 0}%
            </p>
            <p className="text-xs text-gray-600">Score</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.remediationCompletedAt
                ? new Date(file.remediationCompletedAt).toLocaleDateString()
                : '-'}
            </p>
            <p className="text-xs text-gray-600">Completed</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Issues Breakdown</h2>

        {autoFixedIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-md font-medium text-green-700 mb-3">
              <CheckCircle className="h-5 w-5" />
              Auto-Fixed Issues ({autoFixedIssues.length})
            </h3>
            <div className="space-y-3">
              {autoFixedIssues.map((issue, idx) => (
                <IssueItem key={idx} issue={issue} variant="success" />
              ))}
            </div>
          </div>
        )}

        {quickFixIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-md font-medium text-amber-700 mb-3">
              <Wrench className="h-5 w-5" />
              Quick-Fix Issues ({quickFixIssues.length})
            </h3>
            <div className="space-y-3">
              {quickFixIssues.map((issue, idx) => (
                <IssueItem key={idx} issue={issue} variant="warning" />
              ))}
            </div>
          </div>
        )}

        {manualIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-md font-medium text-gray-700 mb-3">
              <Edit3 className="h-5 w-5" />
              Manual Issues ({manualIssues.length})
            </h3>
            <div className="space-y-3">
              {manualIssues.map((issue, idx) => (
                <IssueItem key={idx} issue={issue} variant="manual" />
              ))}
            </div>
          </div>
        )}

        {autoFixedIssues.length === 0 &&
          quickFixIssues.length === 0 &&
          manualIssues.length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                No detailed issue breakdown available for this file.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}
