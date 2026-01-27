import { Badge } from '@/components/ui/Badge';
import type { Batch, BatchStatus } from '@/types/batch.types';

interface BatchHeaderProps {
  batch: Batch;
}

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

export function BatchHeader({ batch }: BatchHeaderProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">{batch.name}</h1>
            <Badge variant={getStatusVariant(batch.status)}>{batch.status}</Badge>
          </div>

          <dl className="text-sm text-gray-600 space-y-1">
            <div>
              <dt className="inline">Batch ID: </dt>
              <dd className="inline font-mono">{batch.batchId}</dd>
            </div>
            <div>
              <dt className="inline">Created: </dt>
              <dd className="inline">{new Date(batch.createdAt).toLocaleString()}</dd>
            </div>
            {batch.startedAt && (
              <div>
                <dt className="inline">Started: </dt>
                <dd className="inline">{new Date(batch.startedAt).toLocaleString()}</dd>
              </div>
            )}
            {batch.completedAt && (
              <div>
                <dt className="inline">Completed: </dt>
                <dd className="inline">{new Date(batch.completedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
