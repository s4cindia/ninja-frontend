import { useParams, useNavigate } from 'react-router-dom';
import { AcrEditor } from '@/components/acr/AcrEditor';

export function AcrEditorPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  if (!jobId) {
    return (
      <div className="p-8">
        <p className="text-red-600">Missing job ID</p>
      </div>
    );
  }

  const handleFinalized = () => {
    navigate('/jobs');
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ACR Editor</h1>
      <AcrEditor jobId={jobId} onFinalized={handleFinalized} />
    </div>
  );
}
