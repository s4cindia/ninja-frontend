import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Ear, Hand, MessageSquare, Brain, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ConformanceBadge } from '@/components/compliance/ConformanceBadge';
import { useFpcValidation } from '@/hooks/useCompliance';

const criteriaIcons: Record<string, React.ElementType> = {
  '302.1': EyeOff,
  '302.2': Eye,
  '302.3': Eye,
  '302.4': EyeOff,
  '302.5': Ear,
  '302.6': MessageSquare,
  '302.7': Hand,
  '302.8': Hand,
  '302.9': Brain,
};

export function FpcPage() {
  const { fileId } = useParams<{ fileId: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useFpcValidation(fileId || '');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-primary-600" aria-hidden="true" />
        <span className="sr-only">Loading FPC validation...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(`/validation/${fileId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Validation
        </Button>
        <Alert variant="error">Failed to load FPC validation. Please try again.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/validation/${fileId}`)}>
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
          Back to Validation
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Functional Performance Criteria</h1>
        <p className="mt-1 text-sm text-gray-500">Section 508 Chapter 3 - Assistive Technology Compatibility</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-green-700">{data.summary.supported}</div>
          <div className="text-sm text-green-600">Supported</div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-yellow-700">{data.summary.partiallySupported}</div>
          <div className="text-sm text-yellow-600">Partially Supported</div>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="text-3xl font-bold text-gray-700">{data.summary.applicable}</div>
          <div className="text-sm text-gray-600">Total Applicable</div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.criteria.map((criterion) => {
          const Icon = criteriaIcons[criterion.id] || Eye;
          
          return (
            <div 
              key={criterion.id} 
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <Icon className="h-6 w-6 text-gray-600" aria-hidden="true" />
                  </div>
                  <div>
                    <div className="font-mono text-sm text-gray-500">{criterion.id}</div>
                    <div className="font-medium text-gray-900">{criterion.title}</div>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{criterion.description}</p>

              <div className="space-y-3">
                <ConformanceBadge level={criterion.status} />
                
                <div className="text-xs text-gray-500">
                  <strong>WCAG:</strong> {criterion.wcagMapping.join(', ')}
                </div>

                {criterion.remarks && (
                  <p className="text-xs text-gray-500 border-t pt-3">{criterion.remarks}</p>
                )}

                <div className="text-xs text-gray-400 border-t pt-3">
                  <strong>Test:</strong> {criterion.testMethod}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
