import { FileText, X, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/Progress';

export type PdfBatchUploadItemState = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface PdfBatchUploadItem {
  file: File;
  state: PdfBatchUploadItemState;
  progress: number;
  fileId?: string;
  error?: string;
}

interface PdfBatchUploadListProps {
  items: PdfBatchUploadItem[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StateIndicator({ item }: { item: PdfBatchUploadItem }) {
  switch (item.state) {
    case 'uploading':
      return (
        <div className="flex items-center gap-2 w-32">
          <Loader2 className="h-4 w-4 text-sky-500 animate-spin shrink-0" aria-hidden="true" />
          <Progress value={item.progress} size="sm" />
        </div>
      );
    case 'uploaded':
      return <CheckCircle className="h-5 w-5 text-green-500" aria-hidden="true" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" aria-hidden="true" />;
    case 'pending':
    default:
      return null;
  }
}

export function PdfBatchUploadList({ items, onRemove, disabled }: PdfBatchUploadListProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">Selected Files ({items.length})</h3>

      <ul className="space-y-2" role="list" aria-label="Selected files">
        {items.map((item, index) => (
          <li
            key={`${item.file.name}-${index}`}
            className="flex items-center justify-between bg-white rounded p-3 shadow-sm"
          >
            <div className="flex items-center flex-1 min-w-0">
              <FileText className="text-gray-400 mr-3 flex-shrink-0 h-5 w-5" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{item.file.name}</p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(item.file.size)}
                  {item.error && <span className="text-red-600 ml-2">{item.error}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-4">
              <StateIndicator item={item} />
              <button
                type="button"
                onClick={() => onRemove(index)}
                disabled={disabled || item.state === 'uploading'}
                className="text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                aria-label={`Remove ${item.file.name}`}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
