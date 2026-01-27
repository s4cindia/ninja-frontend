import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useBatches } from '@/hooks/useBatch';
import { Plus, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BatchStatus } from '@/types/batch.types';

function getStatusVariant(status: BatchStatus): 'info' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'DRAFT':
      return 'info';
    case 'QUEUED':
      return 'info';
    case 'PROCESSING':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'FAILED':
      return 'error';
    case 'CANCELLED':
      return 'info';
    default:
      return 'info';
  }
}

export default function BatchListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useBatches(page);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs items={[{ label: 'Batch Processing' }]} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Layers className="h-6 w-6" aria-hidden="true" />
            Batch Processing
          </h1>
          <p className="text-gray-600">
            Manage and monitor your EPUB batch processing jobs
          </p>
        </div>
        <Button
          onClick={() => navigate('/batch/new')}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create New Batch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : !data?.batches?.length ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Layers className="h-12 w-12 text-gray-400 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No batches yet</h2>
          <p className="text-gray-600 mb-4">
            Create your first batch to start processing multiple EPUBs at once.
          </p>
          <Button
            onClick={() => navigate('/batch/new')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create New Batch
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Batch Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Status
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Files
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Created
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.batches.map((batch) => (
                <tr
                  key={batch.batchId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/batch/${batch.batchId}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {batch.name || 'Untitled Batch'}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {batch.batchId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {batch.filesRemediated} / {batch.totalFiles}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/batch/${batch.batchId}`);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.total > 20 && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, data.total)} of{' '}
                {data.total} batches
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  leftIcon={<ChevronLeft className="h-4 w-4" />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page * 20 >= data.total}
                  leftIcon={<ChevronRight className="h-4 w-4" />}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
