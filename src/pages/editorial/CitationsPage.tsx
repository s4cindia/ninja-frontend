import { useParams, Link } from 'react-router-dom';
import { BookOpen } from 'lucide-react';

export function CitationsPage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return <CitationsJobListPlaceholder />;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-blue-500 text-white">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Citation Analysis</h2>
          <p className="text-sm text-gray-500">
            Job ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{jobId}</code>
          </p>
        </div>
      </div>
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Integration Slot:</strong> Waiting for Dev2's{' '}
          <code className="bg-blue-100 px-1 rounded">CitationsModule</code> to be pushed to{' '}
          <code className="bg-blue-100 px-1 rounded">src/components/citation/index.ts</code>
        </p>
      </div>
    </div>
  );
}

function CitationsJobListPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-blue-500 text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Citation Analyses</h2>
            <p className="text-sm text-gray-500">Citation management and validation</p>
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
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No citation analyses yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document to run citation analysis.
        </p>
      </div>
    </div>
  );
}

export default CitationsPage;
