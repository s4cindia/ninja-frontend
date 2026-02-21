import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { WorkflowDashboard } from '@/components/workflow/WorkflowDashboard';
import { WorkflowTimeline } from '@/components/workflow/WorkflowTimeline';
import { ArrowLeft } from 'lucide-react';

export function WorkflowPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

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
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </div>

      <div className="space-y-6">
        <WorkflowDashboard workflowId={workflowId} />
        <WorkflowTimeline workflowId={workflowId} />
      </div>
    </div>
  );
}
