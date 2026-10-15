import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PdfBatchStatusBadge } from '@/components/pdf-batch/PdfBatchStatusBadge';
import { usePdfBatches } from '@/hooks/usePdfBatch';
import { Plus, Layers, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PdfBatchListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePdfBatches(page);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs items={[{ label: 'PDF Batches' }]} />

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Layers className="h-6 w-6" aria-hidden="true" />
            PDF Batches
          </h1>
          <p className="text-gray-600">
            Audit and remediate multiple PDFs at once, with real concurrency.
          </p>
        </div>
        <Button onClick={() => navigate('/pdf-batches/new')} leftIcon={<Plus className="h-4 w-4" />}>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No PDF batches yet</h2>
          <p className="text-gray-600 mb-4">
            Create your first batch to start processing multiple PDFs at once.
          </p>
          <Button onClick={() => navigate('/pdf-batches/new')} leftIcon={<Plus className="h-4 w-4" />}>
            Create New Batch
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Batch Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Files</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.batches.map((batch) => (
                <tr
                  key={batch.batchId}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/pdf-batches/${batch.batchId}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{batch.name || 'Untitled Batch'}</div>
                    <div className="text-xs text-gray-500 font-mono">{batch.batchId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PdfBatchStatusBadge status={batch.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{batch.totalFiles}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(batch.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/pdf-batches/${batch.batchId}`);
                      }}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {data.pagination.total > data.pagination.limit && (
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t">
              <div className="text-sm text-gray-600">
                Showing {(page - 1) * data.pagination.limit + 1} to{' '}
                {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
                {data.pagination.total} batches
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
                  disabled={page >= data.pagination.totalPages}
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
