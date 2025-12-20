import React from 'react';
import { AltTextReviewQueue } from '@/components/alt-text/AltTextReviewQueue';

export const TestAltTextReviewQueue: React.FC = () => {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Alt Text Review Queue Test</h1>
      <p className="text-gray-600 mb-6">
        Review and approve AI-generated alt text for document images.
      </p>

      <div className="bg-white rounded-lg shadow p-6">
        <AltTextReviewQueue
          jobId="test-job-001"
          onItemSelect={(item) => console.log('Selected:', item)}
        />
      </div>
    </div>
  );
};
