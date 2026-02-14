import { useParams, useNavigate } from 'react-router-dom';
import { ConfidenceDashboard } from '@/components/acr/ConfidenceDashboard';
import { Button } from '@/components/ui/Button';
import { ArrowLeft } from 'lucide-react';

export default function AcrAnalysisPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  if (!jobId) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: No job ID provided</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">ACR Analysis Report</h1>
        <p className="text-gray-600 mt-2">
          Comprehensive accessibility analysis with confidence scores and issue tracking
        </p>
      </div>

      {/* Analysis Dashboard */}
      <ConfidenceDashboard jobId={jobId} />
    </div>
  );
}
