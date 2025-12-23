import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { VerificationQueue } from '@/components/acr/VerificationQueue';

export function VerificationQueuePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const handleComplete = () => {
    navigate(`/jobs/${jobId}`);
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

      <VerificationQueue jobId={jobId} onComplete={handleComplete} />
    </div>
  );
}
