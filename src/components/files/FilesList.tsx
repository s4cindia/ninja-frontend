import { FileText, Trash2, Eye, Clock, CheckCircle, XCircle, Loader2, PlayCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import type { FileItem } from '../../services/files.service';

type FileStatus = 'UPLOADED' | 'PROCESSING' | 'PROCESSED' | 'ERROR';

interface FilesListProps {
  files: FileItem[];
  isLoading?: boolean;
  onView?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
  onAudit?: (file: FileItem) => void;
  emptyMessage?: string;
}

const statusConfig: Record<FileStatus, { icon: React.ElementType; color: string; label: string }> = {
  UPLOADED: { icon: Clock, color: 'text-yellow-500 bg-yellow-50', label: 'Uploaded' },
  PROCESSING: { icon: Loader2, color: 'text-blue-500 bg-blue-50', label: 'Processing' },
  PROCESSED: { icon: CheckCircle, color: 'text-green-500 bg-green-50', label: 'Processed' },
  ERROR: { icon: XCircle, color: 'text-red-500 bg-red-50', label: 'Error' },
};

function StatusBadge({ status }: { status: FileStatus }) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
      config.color
    )}>
      <Icon 
        className={cn('h-3.5 w-3.5', status === 'PROCESSING' && 'animate-spin')} 
        aria-hidden="true"
      />
      {config.label}
    </span>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileTypeLabel(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('epub')) return 'EPUB';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'DOCX';
  return mimeType.split('/').pop()?.toUpperCase() || 'FILE';
}

export function FilesList({
  files,
  isLoading = false,
  onView,
  onDelete,
  onAudit,
  emptyMessage = 'No files uploaded yet',
}: FilesListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" aria-hidden="true" />
        <span className="sr-only">Loading files...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-gray-300" aria-hidden="true" />
        <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              File
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Size
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Uploaded
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {files.map((file) => (
            <tr key={file.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-gray-400 mr-3" aria-hidden="true" />
                  <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                    {file.originalName}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {getFileTypeLabel(file.mimeType)}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatFileSize(file.size)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <StatusBadge status={file.status} />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {formatDate(file.createdAt)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex items-center justify-end gap-2">
                  {onAudit && file.status === 'UPLOADED' && file.mimeType.includes('epub') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAudit(file)}
                      aria-label={`Run audit on ${file.originalName}`}
                      title="Run Accessibility Audit"
                    >
                      <PlayCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                    </Button>
                  )}
                  {onView && file.status === 'PROCESSED' && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onView(file)}
                      aria-label={`View ${file.originalName}`}
                    >
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => onDelete(file)} 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      aria-label={`Delete ${file.originalName}`}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
