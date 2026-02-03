import { useMemo } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { ErrorBoundary } from '@/components/ui';
import { useJob, useCancelJob } from '@/hooks/useJobs';
import { getJobTypeLabel, extractFileNameFromJob } from '@/utils/jobTypes';
import { 
  getStatusIcon, 
  getStatusBadgeClass, 
  formatDateTime, 
  formatDuration 
} from '@/utils/jobHelpers';
import { 
  ComplianceScore, 
  SeveritySummary, 
  IssuesTable, 
  JobActions, 
  RawDataToggle,
  JobDetailSkeleton
} from '@/components/jobs';
import { parseJobOutput, extractDownloadUrl } from '@/types/job-output.types';
import { 
  AlertCircle,
  ArrowLeft,
  Download,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

const CITATION_JOB_TYPES = ['CITATION_DETECTION', 'EDITORIAL'];

export function JobDetails() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data: job, isLoading, isError, error, refetch } = useJob(jobId || null);
  const cancelJob = useCancelJob();

  if (job && CITATION_JOB_TYPES.includes(job.type)) {
    return <Navigate to={`/editorial/citations/${job.id}`} replace />;
  }

  const { parsedOutput, parseError } = useMemo(() => {
    if (!job?.output) {
      return { parsedOutput: null, parseError: null };
    }

    const result = parseJobOutput(job.output);
    if (!result) {
      return { parsedOutput: null, parseError: 'Failed to parse job output' };
    }
    return { parsedOutput: result, parseError: null };
  }, [job?.output]);

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await cancelJob.mutateAsync(jobId);
      toast.success('Job cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel job:', error);
      let message = 'Failed to cancel job';
      if (error instanceof Error) {
        if (error.message.toLowerCase().includes('network') || error.message.includes('fetch')) {
          message = 'Network error. Please check your connection.';
        } else if (error.message.includes('401') || error.message.includes('403')) {
          message = 'You do not have permission to cancel this job.';
        } else if (error.message.includes('404')) {
          message = 'Job not found.';
        }
      }
      toast.error(message);
    }
  };

  if (isLoading) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Jobs', path: '/jobs' }, { label: 'Loading...' }]} />
        <JobDetailSkeleton />
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div>
        <Breadcrumbs items={[{ label: 'Jobs', path: '/jobs' }, { label: 'Details' }]} />
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Failed to load job details'}
            </p>
            <div className="flex gap-2">
              <Link to="/jobs">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Jobs
                </Button>
              </Link>
              <Button onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fileName = extractFileNameFromJob(job);
  const canCancel = job.status === 'QUEUED' || job.status === 'PROCESSING';
  const outputUrl = extractDownloadUrl(job.output);

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Jobs', path: '/jobs' }, { label: fileName }]} />
      
      <div className="flex items-center justify-between mb-6" data-testid="job-detail-header">
        <h1 className="text-2xl font-bold text-gray-900">{fileName}</h1>
        <div className="flex gap-2">
          <Link to="/jobs">
            <Button variant="outline" data-testid="back-button">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          {canCancel && (
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={cancelJob.isPending}
            >
              Cancel Job
            </Button>
          )}
          {outputUrl && (
            <a href={outputUrl} download rel="noopener noreferrer">
              <Button>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Job Information</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Status</dt>
              <dd>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadgeClass(job.status)}`} data-testid="job-status">
                  {getStatusIcon(job.status, 'md')}
                  {job.status}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Type</dt>
              <dd className="text-sm text-gray-900" data-testid="job-type">{getJobTypeLabel(job.type)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Job ID</dt>
              <dd className="text-sm text-gray-900 font-mono">{job.id}</dd>
            </div>
            {job.status === 'PROCESSING' && (
              <div data-testid="job-progress">
                <dt className="text-sm text-gray-500 mb-2">Progress</dt>
                <dd>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${job.progress}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">
                      {job.progress}%
                    </span>
                  </div>
                </dd>
              </div>
            )}
          </dl>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Timestamps</h2>
          <dl className="space-y-4">
            <div className="flex justify-between">
              <dt className="text-sm text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900" data-testid="job-created-date">{formatDateTime(job.createdAt)}</dd>
            </div>
            {job.startedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Started</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(job.startedAt)}</dd>
              </div>
            )}
            {job.completedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Completed</dt>
                <dd className="text-sm text-gray-900">{formatDateTime(job.completedAt)}</dd>
              </div>
            )}
            {job.startedAt && (
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Duration</dt>
                <dd className="text-sm text-gray-900">
                  {formatDuration(job.startedAt, job.completedAt)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {job.error && (
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2" data-testid="job-error">
            <h2 className="text-lg font-semibold text-red-600 mb-4">Error</h2>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800 font-mono whitespace-pre-wrap">
                {job.error}
              </p>
            </div>
          </div>
        )}

      </div>

      {parseError && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="text-center py-8 bg-red-50 rounded-lg border border-red-200">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <p className="text-red-700 font-medium">Failed to parse job output</p>
            <p className="text-red-600 text-sm mt-1">{parseError}</p>
          </div>
        </div>
      )}

      {!parseError && !parsedOutput && (
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {job.status === 'PROCESSING' ? 'Job is still processing...' : 'No output data available'}
            </p>
          </div>
        </div>
      )}

      {!parseError && parsedOutput && (
        <ErrorBoundary>
          <div className="mt-6 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Audit Results</h2>
              
              <div className="space-y-6" data-testid="job-results">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 flex justify-center">
                    <ComplianceScore
                      score={parsedOutput.score}
                      isAccessible={parsedOutput.isAccessible}
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <SeveritySummary summary={parsedOutput.summary} />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Valid:</span>
                    <span className={parsedOutput.isValid ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {parsedOutput.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Accessible:</span>
                    <span className={parsedOutput.isAccessible ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                      {parsedOutput.isAccessible ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {parsedOutput.epubVersion && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">EPUB Version:</span>
                      <span className="text-gray-900 font-medium">
                        {parsedOutput.epubVersion}
                      </span>
                    </div>
                  )}
                </div>

                <IssuesTable issues={parsedOutput.combinedIssues} isAccessible={parsedOutput.isAccessible} />

                <div data-testid="job-actions">
                  <JobActions jobId={job.id} />
                </div>

                <RawDataToggle data={parsedOutput} />
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
