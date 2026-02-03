import { BookOpen } from 'lucide-react';

export function CitationsPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-blue-500 text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Citations Module</h2>
            <p className="text-sm text-gray-500">Citation management and validation</p>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Integration Slot:</strong> This is where Dev2's CitationsModule will be integrated.
            The module will provide citation extraction, validation, and formatting tools.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Citations Module Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          The citations module will allow you to extract, validate, and format citations
          from your documents according to various style guides.
        </p>
      </div>
    </div>
  );
}

export default CitationsPage;
