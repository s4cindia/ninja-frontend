import { useState } from 'react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useJobs, useJobStats, useCancelJob } from '@/hooks/useJobs';
import { Job } from '@/services/jobs.service';
import { getJobTypeLabel, extractFileNameFromJob, JOB_TYPE_LABELS } from '@/utils/jobTypes';
import { getStatusIcon, getStatusBadgeClass, formatRelativeTime } from '@/utils/jobHelpers';
import { 
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Eye,
  Clock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  ...Object.entries(JOB_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function Jobs() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const limit = 10;

  const filters = {
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
    ...(typeFilter && { type: typeFilter }),
  };

  const { data, isLoading, isError, error, refetch } = useJobs(filters);
  const { data: stats } = useJobStats();
  const cancelJob = useCancelJob();

  const hasFilters = statusFilter || typeFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setTypeFilter('');
    setPage(1);
  };

  const handleCancel = async (jobId: string) => {
    try {
      await cancelJob.mutateAsync(jobId);
      toast.success('Job cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel job:', error);
      const message = error instanceof Error ? error.message : 'Failed to cancel job';
      toast.error(message);
    }
  };

  const jobs = data?.jobs || [];
  const pagination = data?.pagination || { page: 1, limit, total: 0, pages: 1 };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Jobs' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Jobs</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total</div>
          <div className="text-2xl font-bold text-gray-900">
            {stats?.total ?? pagination.total ?? '-'}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Queued</div>
          <div className="text-2xl font-bold text-gray-600">
            {stats?.byStatus?.QUEUED ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Processing</div>
          <div className="text-2xl font-bold text-blue-600">
            {stats?.byStatus?.PROCESSING ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Completed</div>
          <div className="text-2xl font-bold text-green-600">
            {stats?.byStatus?.COMPLETED ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Failed</div>
          <div className="text-2xl font-bold text-red-600">
            {stats?.byStatus?.FAILED ?? 0}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear filters
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            Auto-refreshing
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Failed to load jobs'}
            </p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {hasFilters ? 'No jobs match your filters' : 'No jobs yet'}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Jobs Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200" data-testid="jobs-table">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {jobs.map((job: Job) => (
                    <tr key={job.id} className="hover:bg-gray-50" data-testid="job-row">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {extractFileNameFromJob(job)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" data-testid="job-type">
                        <div className="text-sm text-gray-600">
                          {getJobTypeLabel(job.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadgeClass(job.status)}`}
                          data-testid="job-status"
                        >
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" data-testid="job-progress">
                        {job.status === 'PROCESSING' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${job.progress}%` }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              {job.progress}%
                            </span>
                          </div>
                        ) : job.status === 'COMPLETED' ? (
                          <span className="text-sm text-green-600">100%</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" data-testid="job-created-date">
                        <div className="text-sm text-gray-500">
                          {formatRelativeTime(job.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/jobs/${job.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </Link>
                          {(job.status === 'QUEUED' || job.status === 'PROCESSING') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCancel(job.id)}
                              disabled={cancelJob.isPending}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
              {(() => {
                const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1;
                const end = pagination.total === 0 ? 0 : Math.min(pagination.page * pagination.limit, pagination.total);
                return (
                  <div className="text-sm text-gray-500">
                    Showing {start} to {end} of {pagination.total} jobs
                  </div>
                );
              })()}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                  disabled={page >= pagination.pages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
