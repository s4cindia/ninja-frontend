import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { WorkflowDashboard } from '@/components/workflow/WorkflowDashboard';
import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import { ArrowLeft } from 'lucide-react';

export function WorkflowPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromBatchId = searchParams.get('batchId');
  const backLabel = fromBatchId ? 'Back to Batch' : 'Back';
  const backAction = fromBatchId ? () => navigate(`/workflow/batch/${fromBatchId}`) : () => navigate(-1);

  if (!workflowId) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Alert variant="error" title="Invalid URL">
          No workflow ID was provided in the URL.
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Breadcrumbs
        items={[
          { label: 'Files', path: '/files' },
          { label: 'Workflow Status' },
        ]}
      />

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Workflow Status</h1>
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={backAction}
        >
          {backLabel}
        </Button>
      </div>

      <div className="space-y-6">
        <WorkflowDashboard workflowId={workflowId} />
        <WorkflowStepper workflowId={workflowId} />
        <WorkflowTimeline workflowId={workflowId} />
      </div>
    </div>
  );
}
