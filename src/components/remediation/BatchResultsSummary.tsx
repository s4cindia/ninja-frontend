import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { api } from '@/services/api';
import { 
  CheckCircle, 
  XCircle, 
  Download, 
  ExternalLink,
  FileText,
  AlertTriangle,
  Trophy,
} from 'lucide-react';

interface JobResult {
  jobId: string;
  fileName: string;
  status: 'completed' | 'failed';
  issuesFixed?: number;
  error?: string;
}

interface BatchSummary {
  batchId: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  totalIssuesFixed: number;
  successRate: number;
  jobs: JobResult[];
}

interface BatchResultsSummaryProps {
  batchId: string;
  summary: BatchSummary;
  className?: string;
}

export const BatchResultsSummary: React.FC<BatchResultsSummaryProps> = ({
  batchId,
  summary,
  className = '',
}) => {
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    
    try {
      const completedJobIds = summary.jobs
        .filter(j => j.status === 'completed')
        .map(j => j.jobId);
      
      console.log('[BatchResultsSummary] Downloading batch:', batchId, 'jobs:', completedJobIds);
      
      const response = await api.post('/epub/export-batch', 
        { 
          batchId,
          jobIds: completedJobIds,
        },
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batch-${batchId}-remediated.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('[BatchResultsSummary] Download failed:', err);
      setDownloadError('Failed to download batch files. This feature requires a backend API.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewJob = (jobId: string) => {
    navigate(`/remediation/${jobId}`);
  };

  const successfulJobs = summary.jobs.filter(j => j.status === 'completed');
  const failedJobs = summary.jobs.filter(j => j.status === 'failed');

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Batch Remediation Complete
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-3xl font-bold text-gray-900">{summary.totalJobs}</p>
              <p className="text-sm text-gray-500">Total Jobs</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{summary.successfulJobs}</p>
              <p className="text-sm text-gray-500">Successful</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-3xl font-bold text-red-600">{summary.failedJobs}</p>
              <p className="text-sm text-gray-500">Failed</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{summary.totalIssuesFixed}</p>
              <p className="text-sm text-gray-500">Issues Fixed</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-100 rounded-lg mb-6">
            <div className="flex items-center gap-3">
              <div 
                className="relative w-16 h-16"
                role="img"
                aria-label={`Success rate: ${summary.successRate}%`}
              >
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={summary.successRate >= 80 ? '#22c55e' : summary.successRate >= 50 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="3"
                    strokeDasharray={`${summary.successRate}, 100`}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                  {Math.round(summary.successRate)}%
                </span>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">Success Rate</p>
                <p className="text-sm text-gray-500">
                  {summary.successfulJobs} of {summary.totalJobs} jobs completed successfully
                </p>
              </div>
            </div>
            <Button
              onClick={handleDownloadAll}
              disabled={isDownloading || summary.successfulJobs === 0}
              aria-label="Download all remediated files"
            >
              {isDownloading ? (
                <Spinner size="sm" className="mr-2" />
              ) : (
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
              )}
              Download All
            </Button>
          </div>

          {downloadError && (
            <Alert variant="error" className="mb-4">
              {downloadError}
            </Alert>
          )}
        </CardContent>
      </Card>

      {failedJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" aria-hidden="true" />
              Failed Jobs ({failedJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="warning" className="mb-4">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              The following jobs failed during remediation. You can retry them individually.
            </Alert>
            <div className="space-y-2">
              {failedJobs.map(job => (
                <div
                  key={job.jobId}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-red-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.fileName}</p>
                      {job.error && (
                        <p className="text-xs text-red-600">{job.error}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewJob(job.jobId)}
                    aria-label={`View ${job.fileName}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                    Retry
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {successfulJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" aria-hidden="true" />
              Successful Jobs ({successfulJobs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {successfulJobs.map(job => (
                <div
                  key={job.jobId}
                  className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{job.fileName}</p>
                      {job.issuesFixed !== undefined && (
                        <p className="text-xs text-green-600">{job.issuesFixed} issues fixed</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewJob(job.jobId)}
                    aria-label={`View results for ${job.fileName}`}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" aria-hidden="true" />
                    View Results
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
