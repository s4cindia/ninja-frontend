import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { Spinner } from '@/components/ui/Spinner';
import { VerificationQueue } from '@/components/acr/VerificationQueue';
import { useConfidenceWithIssues } from '@/hooks/useConfidence';

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

  // Fetch confidence analysis data to pass to verification queue
  const { data: confidenceData, isLoading: isLoadingConfidence } = useConfidenceWithIssues(
    jobId || '',
    'VPAT2.5-INT',  // Default edition
    { enabled: !!jobId }
  );

  const handleComplete = (verified: boolean) => {
    // If we have a specific return path, use it
    if (returnTo) {
      navigate(returnTo, {
        state: {
          verificationComplete: verified,
          jobId,
          batchId,
        }
      });
      return;
    }
    
    // Guard against undefined acrWorkflowId
    if (!acrWorkflowId) {
      navigate('/acr/workflow', {
        state: { 
          verificationComplete: verified,
          jobId,
          batchId,
        }
      });
      return;
    }
    
    // Default: return to ACR workflow at review step
    // Only set verificationComplete=true if all items were verified
    const params = new URLSearchParams();
    params.set('acrWorkflowId', acrWorkflowId);
    if (verified) {
      params.set('verificationComplete', 'true');
    }
    navigate(`/acr/workflow?${params.toString()}`, {
      state: { 
        verificationComplete: verified,
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

      {isLoadingConfidence ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <VerificationQueue
          jobId={jobId}
          fileName={fileName}
          onComplete={handleComplete}
          criteriaFromAnalysis={confidenceData?.criteria as any}
        />
      )}
    </div>
  );
}
