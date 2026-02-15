import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Loader2,
  AlertCircle,
  BookOpen,
  CheckCircle,
  List,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useEditorialDocuments } from '@/hooks/useEditorialDocuments';

const PAGE_SIZE = 20;

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

function statusBadge(status: string) {
  const styles: Record<string, string> = {
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

export function EditorialDocumentsPage() {
  const [offset, setOffset] = useState(0);

  const { data, isLoading, isError, error } = useEditorialDocuments({
    limit: PAGE_SIZE,
    offset,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20" role="status" aria-label="Loading documents">
        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        <span className="sr-only">Loading documents...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Failed to load documents</h2>
        <p className="text-sm text-gray-500">{error?.message || 'An unexpected error occurred'}</p>
      </Card>
    );
  }

  const documents = data?.documents || [];
  const total = data?.total || 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (documents.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editorial Documents</h2>
          <p className="text-sm text-gray-500 mt-1">All uploaded documents and their analysis status</p>
        </div>
        <Card className="p-8 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" aria-hidden="true" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
          <p className="text-sm text-gray-500 mb-4">Upload a document to get started with editorial analysis.</p>
          <Link
            to="/editorial/upload"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Upload Document
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Editorial Documents</h2>
          <p className="text-sm text-gray-500 mt-1">{total} document{total !== 1 ? 's' : ''} uploaded</p>
        </div>
        <Link
          to="/editorial/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          Upload Document
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left px-4 py-3 font-medium text-gray-600">Document</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                <span className="flex items-center justify-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                  Citations
                </span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                <span className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Validations
                </span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">
                <span className="flex items-center justify-center gap-1">
                  <List className="h-3.5 w-3.5" aria-hidden="true" />
                  References
                </span>
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Uploaded</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="border-b last:border-b-0 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{doc.fileName}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(doc.fileSize)}
                        {doc.wordCount > 0 && ` · ${doc.wordCount.toLocaleString()} words`}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                <td className="px-4 py-3 text-center">
                  <span className="font-medium text-gray-900">{doc.counts?.citations ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-medium text-gray-900">{doc.counts?.validations ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-medium text-gray-900">{doc.counts?.referenceEntries ?? 0}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{formatDate(doc.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/editorial/documents/${doc.id}`}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" aria-hidden="true" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={offset + PAGE_SIZE >= total}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default EditorialDocumentsPage;
