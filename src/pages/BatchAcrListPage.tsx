import { useParams, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BatchAcrList } from '@/components/acr/BatchAcrList';
import { useBatchAcrHistory } from '@/hooks/useBatchAcr';

interface LocationState {
  acrWorkflowIds?: string[];
  fileNames?: string[];
}

export default function BatchAcrListPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const location = useLocation();
  const state = location.state as LocationState | null;

  const { data: acrHistory, isLoading } = useBatchAcrHistory(batchId ?? null);

  if (!batchId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Batch</h2>
          <p className="text-gray-600">No batch ID provided.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-12">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const acrWorkflowIds = state?.acrWorkflowIds ?? acrHistory?.currentAcr?.workflowIds ?? [];
  const fileNames = state?.fileNames ?? [];
  const generatedAt = acrHistory?.currentAcr?.generatedAt;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Breadcrumbs
        items={[
          { label: 'ACR Workflow', path: '/acr/workflow' },
          { label: 'Batch ACR' },
          { label: 'List' },
        ]}
      />
      <BatchAcrList
        batchId={batchId}
        acrWorkflowIds={acrWorkflowIds}
        fileNames={fileNames}
        generatedAt={generatedAt}
      />
    </div>
  );
}
