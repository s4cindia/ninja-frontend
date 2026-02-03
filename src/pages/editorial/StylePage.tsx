import { CheckSquare } from 'lucide-react';

export function StylePage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-green-500 text-white">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
            <p className="text-sm text-gray-500">Editorial standards checking</p>
          </div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            <strong>Integration Slot:</strong> This module will validate documents against
            various style guides and editorial standards.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Style Validation Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Check your documents against style guides like APA, MLA, Chicago, and custom
          editorial standards with detailed violation reports.
        </p>
      </div>
    </div>
  );
}

export default StylePage;
