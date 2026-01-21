import { useParams, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { BatchAcrList } from '@/components/acr/BatchAcrList';
import { useBatchAcrHistory } from '@/hooks/useBatchAcr';

export default function BatchAcrListPage() {
  const { batchId } = useParams<{ batchId: string }>();
  const location = useLocation();
  const state = location.state as { acrWorkflowIds?: string[] } | null;

  const { data: acrHistory } = useBatchAcrHistory(batchId ?? null);

  const acrWorkflowIds = state?.acrWorkflowIds ?? acrHistory?.currentAcr?.workflowIds ?? [];
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
        batchId={batchId!}
        acrWorkflowIds={acrWorkflowIds}
        generatedAt={generatedAt}
      />
    </div>
  );
}
