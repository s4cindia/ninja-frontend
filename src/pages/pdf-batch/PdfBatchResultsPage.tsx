import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PdfBatchStatusBadge } from '@/components/pdf-batch/PdfBatchStatusBadge';
import { PdfBatchResultsList } from '@/components/pdf-batch/PdfBatchResultsList';
import { usePdfBatch } from '@/hooks/usePdfBatch';

export default function PdfBatchResultsPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading } = usePdfBatch(batchId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Batch not found</h2>
          <p className="text-gray-600 mb-4">The requested PDF batch could not be found.</p>
          <Button onClick={() => navigate('/pdf-batches')}>Back to PDF Batches</Button>
        </div>
      </div>
    );
  }

  const remediated = batch.statusCounts.REMEDIATED ?? 0;
  const failed = batch.statusCounts.FAILED ?? 0;
  const skipped = batch.statusCounts.SKIPPED ?? 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'PDF Batches', path: '/pdf-batches' },
          { label: batch.name || `Batch ${batchId}`, path: `/pdf-batches/${batchId}` },
          { label: 'Results' },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">PDF Batch Results</h1>
        <PdfBatchStatusBadge status={batch.status} />
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <dl className="grid grid-cols-3 gap-4">
          <div>
            <dt className="text-sm text-gray-600">Remediated</dt>
            <dd className="text-2xl font-bold text-green-600">{remediated}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Failed</dt>
            <dd className="text-2xl font-bold text-red-600">{failed}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-600">Skipped</dt>
            <dd className="text-2xl font-bold text-gray-500">{skipped}</dd>
          </div>
        </dl>
      </div>

      <PdfBatchResultsList items={batch.items} />
    </div>
  );
}
