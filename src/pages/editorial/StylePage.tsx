import { useParams, Link } from 'react-router-dom';
import { CheckSquare } from 'lucide-react';

export function StylePage() {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) {
    return <StyleJobListPlaceholder />;
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-lg bg-green-500 text-white">
          <CheckSquare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
          <p className="text-sm text-gray-500">
            Job ID: <code className="bg-gray-100 px-2 py-0.5 rounded">{jobId}</code>
          </p>
        </div>
      </div>
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-700">
          <strong>Coming Soon (Sprint E3):</strong> Style Validation module under development.
          Features: Chicago, APA, and custom house style checking.
        </p>
      </div>
    </div>
  );
}

function StyleJobListPlaceholder() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-green-500 text-white">
            <CheckSquare className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
            <p className="text-sm text-gray-500">Editorial standards checking</p>
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
        <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No style validations yet.</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document to run style validation.
        </p>
      </div>
    </div>
  );
}

export default StylePage;
