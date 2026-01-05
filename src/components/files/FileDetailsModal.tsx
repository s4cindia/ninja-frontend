import { X, FileText, Calendar, HardDrive, Tag, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { FileItem } from '@/services/files.service';
import { isEpubFile } from '@/utils/fileUtils';

interface FileDetailsModalProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAudit?: (file: FileItem) => void;
  onView?: (file: FileItem) => void;
  onDelete?: (file: FileItem) => void;
}

export function FileDetailsModal({ file, isOpen, onClose, onAudit, onView, onDelete }: FileDetailsModalProps) {
  if (!isOpen || !file) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const canAudit = (file.status === 'UPLOADED' || file.status === 'PROCESSED') && isEpubFile(file);
  const canView = file.status === 'PROCESSED' && file.latestJobId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">File Details</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="h-10 w-10 text-gray-400 mt-1" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-gray-900 break-words">{file.originalName}</h3>
              <p className="text-sm text-gray-500 truncate">{file.filename}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <p className="text-sm font-medium">{file.mimeType}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Size</p>
                <p className="text-sm font-medium">{formatFileSize(file.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {file.status === 'PROCESSED' ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : file.status === 'PROCESSING' ? (
                <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
              ) : file.status === 'ERROR' ? (
                <AlertCircle className="h-4 w-4 text-red-500" />
              ) : (
                <Clock className="h-4 w-4 text-yellow-500" />
              )}
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-sm font-medium">{file.status}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Uploaded</p>
                <p className="text-sm font-medium">{formatDate(file.createdAt)}</p>
              </div>
            </div>
          </div>

          {file.latestJobId && (
            <div className="pt-4 border-t">
              <p className="text-xs text-gray-500">Latest Job ID</p>
              <p className="text-sm font-mono text-gray-700 break-all">{file.latestJobId}</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          {onAudit && canAudit && (
            <Button variant="outline" onClick={() => { onAudit(file); onClose(); }}>
              Run Audit
            </Button>
          )}
          {onView && canView && (
            <Button variant="outline" onClick={() => { onView(file); onClose(); }}>
              View Results
            </Button>
          )}
          {onDelete && (
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { onDelete(file); onClose(); }}>
              Delete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
