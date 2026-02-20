import { useParams, Link } from 'react-router-dom';
import { BookOpen, ArrowLeft, Loader2 } from 'lucide-react';
import { CitationsModule } from '@/components/citation';
import { Card } from '@/components/ui/Card';
import { useJob } from '@/hooks/useJobs';

export function CitationsPage() {
  const { jobId } = useParams<{ jobId: string }>();

  const { data: job, isLoading: jobLoading } = useJob(jobId || null);

  if (!jobId) {
    return <CitationsJobListPlaceholder />;
  }

  const jobOutput = job?.output as Record<string, unknown> | undefined;
  const jobInput = job?.input as Record<string, unknown> | undefined;
  const documentId = (jobOutput?.documentId as string) || '';
  const filename = (jobInput?.filename as string) || (jobInput?.fileName as string) || (jobInput?.originalName as string);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/jobs"
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Jobs
          </Link>
          {filename && (
            <span className="text-sm text-gray-400">|</span>
          )}
          {filename && (
            <span className="text-sm text-gray-600">{filename}</span>
          )}
        </div>
      </div>

      <div>
        {jobLoading ? (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-500">Loading analysis...</p>
          </Card>
        ) : (
          <CitationsModule jobId={jobId} documentId={documentId} />
        )}
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
            <h2 className="text-lg font-semibold text-gray-900">Citation Management</h2>
            <p className="text-sm text-gray-500">View document text with highlighted citations and fix detected issues</p>
          </div>
        </div>
        <Link
          to="/jobs"
          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          View Jobs
        </Link>
      </div>
      <div className="bg-white rounded-lg border p-6 text-center">
        <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Select a job from the Jobs page to open the citation editor.</p>
        <p className="text-sm text-gray-400 mt-1">
          The editor shows your document text with highlighted citations alongside detected issues and fix options.
        </p>
        <Link
          to="/jobs"
          className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Go to Jobs
        </Link>
      </div>
    </div>
  );
}

export default CitationsPage;
