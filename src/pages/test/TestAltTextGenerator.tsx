import React from 'react';
import { AltTextGenerator } from '@/components/alt-text/AltTextGenerator';

export const TestAltTextGenerator: React.FC = () => {
  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Alt Text Generator Test</h1>
        <p className="text-gray-600">
          Test AI-powered alt text generation for images.
        </p>
      </div>

      {/* Scenario 1: Upload new image */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Scenario 1: Upload New Image
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Upload a standalone image. No document context available.
        </p>
        <AltTextGenerator
          jobId="test-job-001"
          onGenerated={(result) => console.log('Scenario 1 Generated:', result)}
        />
      </div>

      {/* Scenario 2: Existing document image */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Scenario 2: Existing Document Image
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Image from a document. Context-aware generation available.
        </p>
        <AltTextGenerator
          jobId="test-job-001"
          imageId="test-image-001"
          imageUrl="https://picsum.photos/seed/ninja/400/300"
          onGenerated={(result) => console.log('Scenario 2 Generated:', result)}
          showUpload={false}
        />
      </div>

      {/* Scenario 3: Chart/Diagram image */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Scenario 3: Chart Image
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          A chart or diagram that may need specialized description.
        </p>
        <AltTextGenerator
          jobId="test-job-001"
          imageId="test-chart-001"
          imageUrl="https://quickchart.io/chart?c={type:'bar',data:{labels:['Q1','Q2','Q3','Q4'],datasets:[{label:'Sales',data:[12,19,8,15]}]}}"
          onGenerated={(result) => console.log('Scenario 3 Generated:', result)}
          showUpload={false}
        />
      </div>
    </div>
  );
};
