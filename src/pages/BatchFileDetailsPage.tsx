import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Badge } from '@/components/ui/Badge';
import { useBatchFile } from '@/hooks/useBatch';
import { batchService } from '@/services/batch.service';
import { QuickFixPanel } from '@/components/quickfix/QuickFixPanel';
import { BatchQuickFixModal } from '@/components/batch/BatchQuickFixModal';
import {
  ArrowLeft,
  ArrowUp,
  Download,
  CheckCircle,
  AlertCircle,
  Wrench,
  Edit3,
  FileText,
  Zap,
  ListChecks,
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { BatchFileIssue, FileStatus } from '@/types/batch.types';
import type { QuickFix } from '@/types/quickfix.types';

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

function getSeverityClass(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700';
    case 'serious':
      return 'bg-orange-100 text-orange-700';
    case 'major':
      return 'bg-orange-100 text-orange-700';
    case 'moderate':
      return 'bg-yellow-100 text-yellow-700';
    case 'minor':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
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
        : issue.escalatedFromQuickFix
          ? 'bg-amber-50 border-amber-200'
          : 'bg-gray-50 border-gray-200';

  return (
    <div className={`p-4 rounded-lg border ${bgClass}`}>
      <div className="flex items-center gap-2 flex-wrap mb-2">
        {issue.code && (
          <span className="font-mono font-semibold text-gray-900 text-sm">
            {issue.code}
          </span>
        )}
        {issue.escalatedFromQuickFix && (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded"
            title="This issue was originally auto-fixable but failed during automated remediation. Manual intervention is required."
          >
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
            Escalated
          </span>
        )}
        {issue.criterion && issue.criterion !== 'Unknown' && (
          <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded">
            {issue.criterion}
          </span>
        )}
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${getSeverityClass(issue.severity)}`}>
          {issue.severity}
        </span>
      </div>

      {issue.title && (
        <h4 className="font-medium text-gray-900 mb-1">{issue.title}</h4>
      )}

      <p className="text-sm text-gray-600 mb-2">{issue.description}</p>

      {issue.fixApplied && (
        <div className="text-sm text-green-700 flex items-center gap-1">
          <CheckCircle className="h-4 w-4" />
          <span>Fixed: {issue.fixApplied}</span>
        </div>
      )}
      {issue.suggestedFix && (
        <div className="text-sm text-orange-700 flex items-center gap-1">
          <Wrench className="h-4 w-4" />
          <span>Suggested fix: {issue.suggestedFix}</span>
        </div>
      )}
      {issue.guidance && (
        <div className="text-sm text-gray-700 flex items-center gap-1">
          <AlertCircle className="h-4 w-4" />
          <span>Guidance: {issue.guidance}</span>
        </div>
      )}
    </div>
  );
}

export default function BatchFileDetailsPage() {
  const { batchId, fileId } = useParams<{ batchId: string; fileId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: file, isLoading, error } = useBatchFile(batchId, fileId);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<BatchFileIssue | null>(null);
  const [batchFixMode, setBatchFixMode] = useState<'individual' | 'batch' | null>(null);

  const handleApplyFix = async (fix: QuickFix) => {
    if (!batchId || !fileId || !selectedIssue) return;

    // Guard against missing issue code
    if (!selectedIssue.code || selectedIssue.code.trim() === '') {
      toast.error('Cannot apply fix: issue code is missing');
      return;
    }

    try {
      const fixValue = fix.changes?.[0]?.content || fix.summary || '';
      await batchService.applyFileQuickFixes(batchId, fileId, [
        { issueCode: selectedIssue.code, value: fixValue },
      ]);

      queryClient.invalidateQueries({ queryKey: ['batch-file', batchId, fileId] });
      toast.success('Quick-fix applied successfully!');
      setSelectedIssue(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to apply fix: ${message}`);
      throw err;
    }
  };

  const handleClosePanel = () => {
    setSelectedIssue(null);
  };

  const handleBatchApplyFixes = async (
    quickFixes: Array<{ issueCode: string; value: string }>
  ) => {
    if (!batchId || !fileId) return;

    try {
      const result = await batchService.applyFileQuickFixes(batchId, fileId, quickFixes);
      queryClient.invalidateQueries({ queryKey: ['batch-file', batchId, fileId] });
      toast.success(`Successfully applied ${result.appliedFixes} quick-fixes!`);
      setBatchFixMode(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      toast.error(`Failed to apply fixes: ${message}`);
      throw err;
    }
  };

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
  const escalatedCount = file.escalatedToManual ?? manualIssues.filter(i => i.escalatedFromQuickFix).length;

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

        {file.status === 'REMEDIATED' && (
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
              {file.issuesAutoFix ?? file.issuesAutoFixed ?? 0}
            </p>
            <p className="text-xs text-gray-600">Auto-Fix</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {file.remainingQuickFix ?? 0}
            </p>
            <p className="text-xs text-gray-600">Quick-Fix</p>
            {(file.quickFixesApplied ?? 0) > 0 && (
              <p className="text-xs text-green-600">{file.quickFixesApplied} applied</p>
            )}
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
            <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
              <h3 className="flex items-center gap-2 text-md font-medium text-amber-700">
                <Wrench className="h-5 w-5" />
                Quick-Fix Issues ({quickFixIssues.length})
              </h3>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setBatchFixMode('individual')}
                  leftIcon={<ListChecks className="h-4 w-4" />}
                >
                  Apply Individually
                </Button>
                <Button
                  size="sm"
                  onClick={() => setBatchFixMode('batch')}
                  leftIcon={<Zap className="h-4 w-4" />}
                >
                  Batch Apply All ({quickFixIssues.length})
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {quickFixIssues.map((issue, idx) => (
                <div key={idx} className="relative">
                  <IssueItem issue={issue} variant="warning" />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute top-4 right-4"
                    onClick={() => setSelectedIssue(issue)}
                    leftIcon={<Zap className="h-3 w-3" />}
                  >
                    Apply Fix
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {manualIssues.length > 0 && (
          <div className="mb-6">
            <h3 className="flex items-center gap-2 text-md font-medium text-gray-700 mb-3">
              <Edit3 className="h-5 w-5" />
              Manual Issues ({manualIssues.length})
              {escalatedCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-500 text-white rounded">
                  <ArrowUp className="h-3 w-3" aria-hidden="true" />
                  {escalatedCount} escalated
                </span>
              )}
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

      {selectedIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <QuickFixPanel
              issue={{
                id: selectedIssue.id || `issue-${selectedIssue.code}`,
                code: selectedIssue.code || 'UNKNOWN',
                message: selectedIssue.description,
                location: selectedIssue.location,
              }}
              onApplyFix={handleApplyFix}
              onFixApplied={() => {
                queryClient.invalidateQueries({ queryKey: ['batch-file', batchId, fileId] });
                setSelectedIssue(null);
              }}
              onClose={handleClosePanel}
            />
          </div>
        </div>
      )}

      {batchFixMode && quickFixIssues.length > 0 && (
        <BatchQuickFixModal
          issues={quickFixIssues}
          mode={batchFixMode}
          onApply={handleBatchApplyFixes}
          onClose={() => setBatchFixMode(null)}
        />
      )}
    </div>
  );
}
