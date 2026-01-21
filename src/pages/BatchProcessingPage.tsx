import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { BatchHeader } from '@/components/batch/BatchHeader';
import { BatchProgressCard } from '@/components/batch/BatchProgressCard';
import { FileStatusList } from '@/components/batch/FileStatusList';
import { useBatch, useStartBatch, useBatchSSE, useCancelBatch } from '@/hooks/useBatch';
import { Play, XCircle, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import type { BatchSSEEvent } from '@/types/batch.types';

export default function BatchProcessingPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const { data: batch, isLoading } = useBatch(batchId);
  const startBatchMutation = useStartBatch(batchId ?? '');
  const cancelBatchMutation = useCancelBatch(batchId ?? '');

  useBatchSSE(batchId, (event: BatchSSEEvent) => {
    handleSSEEvent(event);
  });

  const handleSSEEvent = (event: BatchSSEEvent) => {
    switch (event.type) {
      case 'file_audited':
        toast.success(`Audit completed: ${event.fileName}`);
        break;
      case 'file_remediated':
        toast.success(`Remediation completed: ${event.fileName}`);
        break;
      case 'file_failed':
        toast.error(`File failed: ${event.fileName}`);
        break;
      case 'batch_completed':
        toast.success('Batch processing completed!');
        break;
    }
  };

  const handleStartProcessing = async () => {
    try {
      await startBatchMutation.mutateAsync(undefined);
    } catch {
      // Error handled by hook
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this batch?')) {
      return;
    }

    try {
      await cancelBatchMutation.mutateAsync();
    } catch {
      // Error handled by hook
    }
  };

  const handleViewResults = () => {
    navigate(`/batch/${batchId}/results`);
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
          <p className="text-gray-600 mb-4">
            The requested batch could not be found.
          </p>
          <Button onClick={() => navigate('/batches')}>Back to Batches</Button>
        </div>
      </div>
    );
  }

  const isDraft = batch.status === 'DRAFT';
  const isProcessing = batch.status === 'PROCESSING' || batch.status === 'QUEUED';
  const isCompleted = batch.status === 'COMPLETED';
  const canStart = isDraft && batch.totalFiles > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'Batches', path: '/batches' },
          { label: batch.name || `Batch ${batchId}` },
        ]}
      />

      <BatchHeader batch={batch} />

      <div className="mt-6 space-y-6">
        <BatchProgressCard batch={batch} />

        <FileStatusList files={batch.files} />

        <div className="flex justify-between items-center pt-4 border-t">
          <div>
            {isDraft && (
              <p className="text-sm text-gray-600">
                Ready to start processing {batch.totalFiles} file
                {batch.totalFiles !== 1 ? 's' : ''}
              </p>
            )}
            {isProcessing && (
              <p className="text-sm text-gray-600">
                Processing {batch.filesRemediated} of {batch.totalFiles} files...
              </p>
            )}
            {isCompleted && (
              <p className="text-sm text-gray-600">
                Completed: {batch.filesRemediated} successful, {batch.filesFailed} failed
              </p>
            )}
          </div>

          <div className="flex gap-3">
            {isDraft && (
              <>
                <Button variant="outline" onClick={() => navigate('/batches')}>
                  Back to Batches
                </Button>
                <Button
                  onClick={handleStartProcessing}
                  disabled={!canStart}
                  isLoading={startBatchMutation.isPending}
                  leftIcon={<Play className="h-4 w-4" />}
                >
                  Start Processing
                </Button>
              </>
            )}

            {isProcessing && (
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

            {isCompleted && (
              <Button
                onClick={handleViewResults}
                leftIcon={<ArrowRight className="h-4 w-4" />}
              >
                View Results & Actions
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
