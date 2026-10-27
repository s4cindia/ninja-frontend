import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { useTeamJobs } from '@/hooks/useTeamJobs';
import { isNotTeamLeaderOrViewerError } from '@/services/team.service';
import { TeamActivitySection } from '@/components/reports/TeamActivitySection';
import type { TeamJob } from '@/types/team.types';
import { getJobTypeLabel, extractFileNameFromJob } from '@/utils/jobTypes';
import { getStatusIcon, getStatusBadgeClass, formatRelativeTime } from '@/utils/jobHelpers';
import { AlertCircle, ChevronLeft, ChevronRight, Eye, UsersRound, X } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'QUEUED', label: 'Queued' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const CITATION_JOB_TYPES = ['CITATION_DETECTION', 'CITATION_VALIDATION'];

// /jobs/team isn't filtered by job type, so a teammate's job can be any type
// -- mirrors Jobs.tsx's getJobDetailPath (not exported there, so duplicated
// here) rather than always falling back to the generic job detail page.
function getTeamJobDetailPath(job: TeamJob): string {
  if (CITATION_JOB_TYPES.includes(job.type)) {
    return `/citation/analysis/${job.id}`;
  }
  if (job.type === 'EDITORIAL_FULL' && job.documentId) {
    return `/validator/editor/${job.documentId}`;
  }
  if (job.type === 'PDF_ACCESSIBILITY') {
    // Only this route renders the Team Review Panel (gated on
    // isOwner === false) -- the generic /jobs/:id page never does.
    return `/pdf/audit/${job.id}`;
  }
  return `/jobs/${job.id}`;
}

export default function MyTeamPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const limit = 20;

  const filters = {
    page,
    limit,
    ...(statusFilter && { status: statusFilter }),
  };

  const { data, isLoading, isError, error, refetch } = useTeamJobs(filters);

  const notApplicable = isError && isNotTeamLeaderOrViewerError(error);

  const jobs = data?.jobs ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, pages: 1 };
  const hasFilters = !!statusFilter;

  const clearFilters = () => {
    setStatusFilter('');
    setPage(1);
  };

  return (
    <div>
      <Breadcrumbs items={[{ label: 'My Team' }]} />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">My Team</h1>
      <p className="text-gray-600 mb-6">
        Jobs owned by your teammates, for spot-checking and review.
      </p>

      {!notApplicable && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              {STATUS_OPTIONS.map((opt) => (
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
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8" />
          </div>
        ) : notApplicable ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-6">
            <UsersRound className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-700 font-medium">
              You're not a Team Leader or Viewer on any team
            </p>
            <p className="text-gray-500 text-sm mt-1 max-w-md">
              This page shows teammates' jobs for members with oversight access to a
              team. Ask an admin to add you to a team if you expect to see jobs here.
            </p>
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-600 mb-4">
              {error instanceof Error ? error.message : 'Failed to load team jobs'}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <UsersRound className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-500">
              {hasFilters ? 'No team jobs match your filters' : 'No team jobs yet'}
            </p>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="mt-2">
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
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
                      Owner (ID)
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
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                          {extractFileNameFromJob(job)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{getJobTypeLabel(job.type)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium ${getStatusBadgeClass(job.status)}`}
                        >
                          {getStatusIcon(job.status)}
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {/* The team-jobs endpoint only returns the owner's raw
                            userId today, not a display name -- see the RBAC
                            follow-up note sent alongside this PR. */}
                        <span
                          className="text-sm text-gray-500 font-mono"
                          title={job.userId}
                        >
                          {job.userId.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {formatRelativeTime(job.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Link to={getTeamJobDetailPath(job)}>
                          <Button variant="ghost" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

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

      {/* Gated on `data` (the primary team-jobs query having actually
          succeeded), not just `!notApplicable` -- that flag is only known
          once the query settles, so gating on it alone would mount this
          section (and fire its own fetch) during the initial loading state
          too, before we know the caller even qualifies. */}
      {data && <TeamActivitySection />}
    </div>
  );
}
