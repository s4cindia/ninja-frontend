import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, ThumbsUp, ThumbsDown, Calendar, Tag, Link2, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { api } from '@/services/api';
import { AttachmentList } from './AttachmentList';
import { AttachmentUploader } from './AttachmentUploader';
import { feedbackAttachmentService } from '@/services/feedback-attachment.service';
import { useAuthStore } from '@/stores/auth.store';
import type { FeedbackItem, FeedbackStatus, FeedbackAttachment } from '@/types/feedback.types';

interface FeedbackDetailProps {
  item: FeedbackItem;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (id: string, newStatus: FeedbackStatus) => void;
}

const STATUS_OPTIONS: { value: FeedbackStatus; label: string }[] = [
  { value: 'NEW', label: 'New' },
  { value: 'REVIEWED', label: 'Reviewed' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'DISMISSED', label: 'Dismissed' },
];

const STATUS_VARIANTS: Record<FeedbackStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  NEW: 'info',
  REVIEWED: 'warning',
  IN_PROGRESS: 'warning',
  RESOLVED: 'success',
  DISMISSED: 'default',
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const FeedbackDetail: React.FC<FeedbackDetailProps> = ({
  item,
  isOpen,
  onClose,
  onStatusUpdate,
}) => {
  const [status, setStatus] = useState<FeedbackStatus>(item.status);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [attachments, setAttachments] = useState<FeedbackAttachment[]>(item.attachments || []);
  const [isDeleting, setIsDeleting] = useState<string | undefined>();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    setStatus(item.status);
  }, [item.status]);

  useEffect(() => {
    setAttachments(item.attachments || []);
  }, [item.attachments]);

  const handleUpload = async (files: File[]) => {
    try {
      const newAttachments = await feedbackAttachmentService.upload(item.id, files);
      setAttachments(prev => [...newAttachments, ...prev]);
    } catch (err) {
      console.error('Failed to upload attachments:', err);
      throw err;
    }
  };

  const handleDownload = async (attachment: FeedbackAttachment) => {
    try {
      const { url } = await feedbackAttachmentService.getDownloadUrl(attachment.id);

      if (url.startsWith('/')) {
        const response = await api.get(url, { responseType: 'blob' });
        const blob = new Blob([response.data], { type: attachment.mimeType });
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = attachment.originalName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      } else {
        window.open(url, '_blank');
      }
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download file. Please try again.');
    }
  };

  const handleDeleteAttachment = async (attachment: FeedbackAttachment) => {
    if (!window.confirm(`Delete "${attachment.originalName}"?`)) return;

    setIsDeleting(attachment.id);
    try {
      await feedbackAttachmentService.delete(attachment.id);
      setAttachments(prev => prev.filter(a => a.id !== attachment.id));
    } catch (err) {
      console.error('Failed to delete attachment:', err);
      alert('Failed to delete attachment. Please try again.');
    } finally {
      setIsDeleting(undefined);
    }
  };

  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleStatusChange = useCallback(async (newStatus: FeedbackStatus) => {
    setIsUpdating(true);
    setError(null);
    setSuccess(false);

    try {
      await api.patch(`/feedback/${item.id}`, { status: newStatus });
      setStatus(newStatus);
      setSuccess(true);
      onStatusUpdate?.(item.id, newStatus);
      setTimeout(() => setSuccess(false), 2000);
    } catch (err: unknown) {
      console.error('[FeedbackDetail] Failed to update status:', err);
      setError('Failed to update status');
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsUpdating(false);
    }
  }, [item.id, onStatusUpdate]);

  if (!isOpen) return null;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-detail-title"
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-xl z-50 overflow-y-auto"
      >
        <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h2 id="feedback-detail-title" className="text-lg font-semibold">
            Feedback Details
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-6">
          {error && (
            <Alert variant="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              Status updated successfully
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Tag className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <Badge variant="default">
                  {item.type.replace(/_/g, ' ')}
                </Badge>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-gray-900">{formatDate(item.createdAt)}</p>
              </div>
            </div>

            <div>
              <p className="text-xs text-gray-500">Submitted By</p>
              <p className="text-sm font-medium">{item.userEmail || 'Anonymous'}</p>
            </div>

            {item.isPositive !== null && item.isPositive !== undefined && (
              <div className="flex items-start gap-3">
                {item.isPositive ? (
                  <ThumbsUp className="h-5 w-5 text-green-500" />
                ) : (
                  <ThumbsDown className="h-5 w-5 text-red-500" />
                )}
                <div>
                  <p className="text-sm text-gray-500">Rating</p>
                  <p className="text-gray-900">
                    {item.isPositive ? 'Positive' : 'Negative'}
                  </p>
                </div>
              </div>
            )}

            {item.entityType && (
              <div className="flex items-start gap-3">
                <Link2 className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Related Entity</p>
                  <p className="text-gray-900">
                    {item.entityType}: {item.entityId}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Status</p>
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => handleStatusChange(e.target.value as FeedbackStatus)}
                disabled={isUpdating}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <div className="mt-2">
              <Badge variant={STATUS_VARIANTS[status]}>
                Current: {status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-2">Message</p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-800 whitespace-pre-wrap">{item.comment}</p>
            </div>
          </div>

          {item.context && Object.keys(item.context).length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Context</p>
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                {Object.entries(item.context).map(([key, value]) => (
                  <div key={key} className="flex gap-2 text-sm">
                    <span className="font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-gray-700">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 mt-4">
            <AttachmentList
              attachments={attachments}
              onDownload={handleDownload}
              onDelete={handleDeleteAttachment}
              isDeleting={isDeleting}
              currentUserId={user?.id}
            />
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Add Attachments</h4>
            <AttachmentUploader onUpload={handleUpload} />
          </div>

          <div className="pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};
