import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { PdfBatchStatusBadge } from '@/components/pdf-batch/PdfBatchStatusBadge';
import { PdfBatchStatusSummary } from '@/components/pdf-batch/PdfBatchStatusSummary';
import { PdfBatchItemList } from '@/components/pdf-batch/PdfBatchItemList';
import { AutoModeStartControl } from '@/components/pdf/AutoModeStartControl';
import { usePdfBatch, useStartPdfBatch, useCancelPdfBatch, useRemovePdfBatchItem, useBatchBudgetEstimate } from '@/hooks/usePdfBatch';
import type { StartPdfBatchRequest } from '@/types/pdfBatch.types';
import { XCircle, ArrowRight } from 'lucide-react';

export default function PdfBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading } = usePdfBatch(batchId);
  const startBatchMutation = useStartPdfBatch(batchId);
  const cancelBatchMutation = useCancelPdfBatch(batchId);
  const removeItemMutation = useRemovePdfBatchItem(batchId);
  // Seeds AutoModeStartControl's Cost Limit field below instead of its flat
  // $2 default -- tenant-wide, since no item in a DRAFT batch has been
  // audited yet (see useBatchBudgetEstimate's own doc comment).
  const budgetEstimateQuery = useBatchBudgetEstimate(batchId);

  const handleStart = (overrides?: StartPdfBatchRequest) => {
    startBatchMutation.mutate(overrides);
  };

  const handleCancel = () => {
    if (!window.confirm('Are you sure you want to cancel this batch?')) return;
    cancelBatchMutation.mutate();
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleViewResults = () => {
    navigate(`/pdf-batches/${batchId}/results`);
  };

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

  const isDraft = batch.status === 'DRAFT';
  const isActive = batch.status === 'QUEUED' || batch.status === 'PROCESSING';
  const isTerminal = !isDraft && !isActive;
  const canStart = isDraft && batch.totalFiles > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'PDF Batches', path: '/pdf-batches' },
          { label: batch.name || `Batch ${batchId}` },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{batch.name || 'Untitled Batch'}</h1>
          <PdfBatchStatusBadge status={batch.status} />
        </div>
      </div>

      <div className="space-y-6">
        {(isActive || isTerminal) && <PdfBatchStatusSummary batch={batch} />}

        <PdfBatchItemList
          items={batch.items}
          removable={isDraft}
          onRemove={handleRemoveItem}
          removingItemId={removeItemMutation.isPending ? removeItemMutation.variables : undefined}
        />

        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {isDraft && (
              <p className="text-sm text-gray-600">
                Ready to start processing {batch.totalFiles} file{batch.totalFiles !== 1 ? 's' : ''}
              </p>
            )}
            {isActive && (
              <p className="text-sm text-gray-600">
                Processing {batch.totalFiles} file{batch.totalFiles !== 1 ? 's' : ''}…
              </p>
            )}
            {isTerminal && (
              <p className="text-sm text-gray-600">
                {batch.statusCounts.REMEDIATED ?? 0} remediated, {batch.statusCounts.FAILED ?? 0} failed,{' '}
                {batch.statusCounts.SKIPPED ?? 0} skipped
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {isDraft && (
              <>
                <Button variant="outline" onClick={() => navigate('/pdf-batches')}>
                  Back to Batches
                </Button>
                <AutoModeStartControl
                  onStart={handleStart}
                  isPending={startBatchMutation.isPending}
                  disabled={!canStart}
                  disabledTitle={canStart ? undefined : 'Add at least one file before starting'}
                  showConfig
                  triggerLabel="Start Processing"
                  budgetEstimate={budgetEstimateQuery.data}
                />
              </>
            )}

            {isActive && (
              <Button
                variant="outline"
                onClick={handleCancel}
                isLoading={cancelBatchMutation.isPending}
                leftIcon={<XCircle className="h-4 w-4" />}
                className="text-red-600 border-red-300 hover:bg-red-50"
              >
                Cancel Batch
              </Button>
            )}

            {isTerminal && (
              <Button onClick={handleViewResults} leftIcon={<ArrowRight className="h-4 w-4" />}>
                View Results
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
