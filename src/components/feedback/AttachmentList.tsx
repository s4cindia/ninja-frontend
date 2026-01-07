import React from 'react';
import { FileText, Image, File, Download, Trash2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import type { FeedbackAttachment } from '@/types/feedback.types';

interface AttachmentListProps {
  attachments: FeedbackAttachment[];
  onDownload: (attachment: FeedbackAttachment) => void;
  onDelete?: (attachment: FeedbackAttachment) => void;
  isDeleting?: string;
  currentUserId?: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.includes('pdf')) return FileText;
  return File;
};

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onDownload,
  onDelete,
  isDeleting,
  currentUserId,
}) => {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-gray-700">Attachments ({attachments.length})</h4>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const Icon = getFileIcon(attachment.mimeType);
          const canDelete = onDelete && currentUserId && attachment.uploadedById && currentUserId === attachment.uploadedById;

          return (
            <div
              key={attachment.id}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {attachment.originalName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownload(attachment)}
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </Button>
                {canDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(attachment)}
                    disabled={isDeleting === attachment.id}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    title="Delete"
                  >
                    {isDeleting === attachment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
