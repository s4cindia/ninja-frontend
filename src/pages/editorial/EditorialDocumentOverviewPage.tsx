import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  BookOpen,
  CheckCircle,
  List,
  Edit3,
  Loader2,
  AlertCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEditorialDocumentOverview } from '@/hooks/useEditorialDocuments';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusColor(status: string): string {
  const map: Record<string, string> = {
    COMPLETED: 'text-green-600',
    PARSED: 'text-green-600',
    PROCESSING: 'text-blue-600',
    FAILED: 'text-red-600',
    PENDING: 'text-yellow-600',
  };
  return map[status] || 'text-gray-600';
}

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-green-100 text-green-700',
    PARSED: 'bg-green-100 text-green-700',
    PROCESSING: 'bg-blue-100 text-blue-700',
    FAILED: 'bg-red-100 text-red-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export function EditorialDocumentOverviewPage() {
  const { documentId } = useParams<{ documentId: string }>();
  const { data, isLoading, isError, error } = useEditorialDocumentOverview(documentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading document overview">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="sr-only">Loading document overview...</span>
      </div>
    );
  }

  if (isError || !data || !data.document) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load document</h2>
        <p className="text-sm text-gray-500">{error?.message || 'Document not found'}</p>
        <Link
          to="/editorial/documents"
          className="inline-flex items-center mt-4 text-sm text-blue-600 hover:text-blue-800"
        >
          <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
          Back to Documents
        </Link>
      </Card>
    );
  }

  const doc = data.document;
  const counts = data.counts || { citations: 0, validations: 0, corrections: 0, referenceEntries: 0 };
  const lastValidation = data.lastValidation || null;
  const jobs = data.jobs || [];
  const citationJob = jobs.find(j =>
    (j.type === 'CITATION_DETECTION' || j.type === 'citation_detection') &&
    (j.status === 'COMPLETED' || j.status === 'completed')
  );
  const citationJobId = citationJob?.jobId;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/editorial/documents"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Documents
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-gray-400" aria-hidden="true" />
              {doc.title || doc.fileName}
            </h1>
            {doc.title && (
              <p className="text-sm text-gray-500 mt-1">{doc.fileName}</p>
            )}
          </div>
          {statusBadge(doc.status)}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 text-center">
          <BookOpen className="h-5 w-5 text-blue-500 mx-auto mb-1" aria-hidden="true" />
          <p className="text-2xl font-semibold text-gray-900">{counts.citations}</p>
          <p className="text-xs text-gray-500">Citations</p>
        </Card>
        <Card className="p-4 text-center">
          <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-1" aria-hidden="true" />
          <p className="text-2xl font-semibold text-gray-900">{counts.validations}</p>
          <p className="text-xs text-gray-500">Validations</p>
        </Card>
        <Card className="p-4 text-center">
          <Edit3 className="h-5 w-5 text-purple-500 mx-auto mb-1" aria-hidden="true" />
          <p className="text-2xl font-semibold text-gray-900">{counts.corrections}</p>
          <p className="text-xs text-gray-500">Corrections</p>
        </Card>
        <Card className="p-4 text-center">
          <List className="h-5 w-5 text-orange-500 mx-auto mb-1" aria-hidden="true" />
          <p className="text-2xl font-semibold text-gray-900">{counts.referenceEntries}</p>
          <p className="text-xs text-gray-500">References</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="font-medium text-gray-900 mb-3">Document Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">File Size</dt>
              <dd className="text-gray-900 font-medium">{formatFileSize(doc.fileSize)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Word Count</dt>
              <dd className="text-gray-900 font-medium">{doc.wordCount?.toLocaleString() || '—'}</dd>
            </div>
            {doc.pageCount && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Pages</dt>
                <dd className="text-gray-900 font-medium">{doc.pageCount}</dd>
              </div>
            )}
            {doc.authors && doc.authors.length > 0 && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Authors</dt>
                <dd className="text-gray-900 font-medium">{doc.authors.join(', ')}</dd>
              </div>
            )}
            {doc.language && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Language</dt>
                <dd className="text-gray-900 font-medium">{doc.language.toUpperCase()}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Uploaded</dt>
              <dd className="text-gray-900 font-medium">{formatDate(doc.createdAt)}</dd>
            </div>
            {doc.referenceListStatus && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Reference List</dt>
                <dd className="text-gray-900 font-medium">
                  {doc.referenceListStatus}
                  {doc.referenceListStyle && ` (${doc.referenceListStyle})`}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card className="p-5">
          <h3 className="font-medium text-gray-900 mb-3">Last Validation</h3>
          {lastValidation ? (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Style</span>
                <span className="text-gray-900 font-medium">{lastValidation.styleCode.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Validated</span>
                <span className="text-gray-900 font-medium">{formatDate(lastValidation.validatedAt)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No validation has been run yet.</p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          {citationJobId && (
            <Link to={`/editorial/citations/${citationJobId}`}>
              <Button variant="outline" size="sm">
                <BookOpen className="h-4 w-4 mr-2" aria-hidden="true" />
                View Citations
              </Button>
            </Link>
          )}
          {citationJobId && (
            <Link to={`/editorial/citations/${citationJobId}`}>
              <Button variant="outline" size="sm">
                <CheckCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Validate Style
              </Button>
            </Link>
          )}
          {citationJobId && (
            <Link to={`/editorial/citations/${citationJobId}`}>
              <Button variant="outline" size="sm">
                <List className="h-4 w-4 mr-2" aria-hidden="true" />
                Reference List
              </Button>
            </Link>
          )}
          <Link to="/editorial/upload">
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Re-detect Citations
            </Button>
          </Link>
        </div>
      </Card>

      {jobs.length > 0 && (
        <Card className="p-5">
          <h3 className="font-medium text-gray-900 mb-3">Job History</h3>
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.jobId}
                className="flex items-center justify-between py-2 border-b last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-400" aria-hidden="true" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{job.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{formatDate(job.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium ${statusColor(job.status)}`}>
                    {job.status}
                  </span>
                  {job.error && (
                    <span className="text-xs text-red-500" title={job.error}>
                      Error
                    </span>
                  )}
                  <Link
                    to={`/jobs/${job.jobId}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export default EditorialDocumentOverviewPage;
