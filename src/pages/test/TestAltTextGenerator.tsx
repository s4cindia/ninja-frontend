import React from 'react';
import { AltTextGenerator } from '@/components/alt-text/AltTextGenerator';

export const TestAltTextGenerator: React.FC = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Alt Text Generator Test</h1>
      <p className="text-gray-600 mb-6">
        Test AI-powered alt text generation for images.
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <AltTextGenerator
          jobId="test-job-001"
          onGenerated={(result) => console.log('Generated:', result)}
        />
      </div>
    </div>
  );
};
