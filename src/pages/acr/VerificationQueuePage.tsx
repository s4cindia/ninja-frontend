import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { VerificationQueue } from '@/components/acr/VerificationQueue';

interface LocationState {
  fileName?: string;
  returnTo?: string;
  batchId?: string;
  acrWorkflowId?: string;
}

export function VerificationQueuePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as LocationState | null;
  const fileName = state?.fileName;
  const returnTo = state?.returnTo;
  const batchId = state?.batchId;
  const acrWorkflowId = state?.acrWorkflowId ?? jobId;

  const handleComplete = () => {
    // If we have a specific return path, use it
    if (returnTo) {
      navigate(returnTo);
      return;
    }
    
    // Default: return to ACR workflow at review step with verification complete
    navigate(`/acr/workflow?acrWorkflowId=${acrWorkflowId}&verificationComplete=true`, {
      state: { 
        verificationComplete: true,
        jobId,
        batchId,
      }
    });
  };

  if (!jobId) {
    return (
      <div className="p-8">
        <p className="text-red-600">Job ID is required</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Breadcrumbs items={[
        { label: 'ACR Workflow', path: '/acr/workflow' },
        { label: 'Verification Queue' }
      ]} />
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Human Verification Queue</h1>
          <p className="text-gray-500">Review and verify automated accessibility findings</p>
        </div>
      </div>

      <VerificationQueue jobId={jobId} fileName={fileName} onComplete={handleComplete} />
    </div>
  );
}
