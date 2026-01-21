import { FileText, X } from 'lucide-react';

interface FileListProps {
  files: File[];
  onRemove: (index: number) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileList({ files, onRemove, disabled }: FileListProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">
        Selected Files ({files.length})
      </h3>

      <ul className="space-y-2" role="list" aria-label="Selected files">
        {files.map((file, index) => (
          <li
            key={`${file.name}-${index}`}
            className="flex items-center justify-between bg-white rounded p-3 shadow-sm"
          >
            <div className="flex items-center flex-1 min-w-0">
              <FileText
                className="text-gray-400 mr-3 flex-shrink-0 h-5 w-5"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onRemove(index)}
              disabled={disabled}
              className="ml-4 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
