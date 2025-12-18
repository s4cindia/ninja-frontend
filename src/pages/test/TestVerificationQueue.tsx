import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VerificationQueue } from '@/components/acr/VerificationQueue';
import { Logo } from '@/components/ui/Logo';

export function TestVerificationQueue() {
  const [isComplete, setIsComplete] = useState(false);
  
  const testJobId = 'test-job-456';

  const handleComplete = () => {
    setIsComplete(true);
    console.log('Verification complete!');
  };
  
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
        <h1 className="text-2xl font-bold mb-6">Verification Queue Test</h1>
        
        {isComplete ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
            <p className="text-green-800 font-medium">Verification Complete!</p>
            <button
              onClick={() => setIsComplete(false)}
              className="mt-4 text-green-600 underline"
            >
              Reset
            </button>
          </div>
        ) : (
          <VerificationQueue 
            jobId={testJobId}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  );
}
