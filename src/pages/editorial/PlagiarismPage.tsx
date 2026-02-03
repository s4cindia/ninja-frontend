import { Search } from 'lucide-react';

export function PlagiarismPage() {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-lg bg-purple-500 text-white">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Plagiarism Detection</h2>
            <p className="text-sm text-gray-500">Content originality scanning</p>
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <p className="text-sm text-purple-800">
            <strong>Integration Slot:</strong> This module will provide plagiarism detection
            capabilities to scan documents for potential content originality issues.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-8 text-center">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Plagiarism Detection Coming Soon</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Upload documents to scan for potential plagiarism and receive detailed
          originality reports with source matching.
        </p>
      </div>
    </div>
  );
}

export default PlagiarismPage;
