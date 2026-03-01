/**
 * PlagiarismPage - Full plagiarism check page with document context
 */

import { useParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { PlagiarismCheckContent } from '@/components/plagiarism/PlagiarismCheckPanel';

export function PlagiarismPage() {
  const { documentId } = useParams<{ documentId: string }>();

  if (!documentId) {
    return <PlagiarismDocumentList />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 p-4 border-b bg-white">
        <div className="p-2 rounded-lg bg-amber-500 text-white">
          <Search className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Plagiarism Detection</h2>
          <p className="text-sm text-gray-500">
            Document: <code className="bg-gray-100 px-2 py-0.5 rounded text-xs">{documentId}</code>
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <PlagiarismCheckContent documentId={documentId} />
      </div>
    </div>
  );
}

function PlagiarismDocumentList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-amber-500 text-white">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Plagiarism Detection</h2>
            <p className="text-sm text-gray-500">Content originality scanning</p>
          </div>
        </div>
        <Link
          to="/editorial/upload"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          + New Analysis
        </Link>
      </div>
      <div className="bg-white rounded-lg border p-6 text-center">
        <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No plagiarism scans yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document or open one in the editor to run plagiarism detection.
        </p>
      </div>
    </div>
  );
}

export default PlagiarismPage;
