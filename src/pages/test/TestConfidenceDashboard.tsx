import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfidenceDashboard } from '@/components/acr/ConfidenceDashboard';
import { Logo } from '@/components/ui/Logo';

export function TestConfidenceDashboard() {
  const [selectedCriterion, setSelectedCriterion] = useState<string | null>(null);
  
  const testJobId = 'test-job-123';
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center">
            <Logo size="sm" showNinjaText={true} />
          </Link>
        </div>
      </header>
      
      <div className="p-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Confidence Dashboard Test</h1>
        <ConfidenceDashboard 
          jobId={testJobId}
          onVerifyClick={(criterionId) => {
            setSelectedCriterion(criterionId);
            console.log('Verify clicked:', criterionId);
          }}
        />
        {selectedCriterion && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <p><strong>Selected for verification:</strong> {selectedCriterion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
