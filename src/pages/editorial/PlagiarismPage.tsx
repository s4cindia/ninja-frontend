import { useParams, Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export function PlagiarismPage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return <PlagiarismJobListPlaceholder />;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-amber-500 text-white">
          <Search className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Plagiarism Detection</h2>
          <p className="text-sm text-gray-500">
            Job ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{jobId}</code>
          </p>
        </div>
      </div>
      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-700">
          <strong>Coming Soon (Sprint E1):</strong> Plagiarism Detection module under development.
          Features: Semantic fingerprinting, paraphrase detection, source matching.
        </p>
      </div>
    </div>
  );
}

function PlagiarismJobListPlaceholder() {
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
          Upload a document to run plagiarism detection.
        </p>
      </div>
    </div>
  );
}

export default PlagiarismPage;
