/**
 * RecentActivityList
 *
 * Displays a list of recent document activities with status indicators,
 * open and delete actions.
 */

import { Clock, FileText, CheckCircle, BookOpen, FileCheck, Edit3, Trash2 } from 'lucide-react';

export interface RecentActivity {
  id: string;
  type: 'citation' | 'validator';
  action: string;
  document: string;
  documentId: string;
  timestamp: string;
  rawTimestamp: Date;
  status: 'completed' | 'pending' | 'in_progress';
  fileSize?: number;
  wordCount?: number;
  processingTime?: number | null;
}

interface RecentActivityListProps {
  activities: RecentActivity[];
  loading: boolean;
  deletingId: string | null;
  onRefresh: () => void;
  onOpenDocument: (activity: RecentActivity) => void;
  onDeleteDocument: (e: React.MouseEvent, activity: RecentActivity) => void;
}

export function RecentActivityList({
  activities,
  loading,
  deletingId,
  onRefresh,
  onOpenDocument,
  onDeleteDocument,
}: RecentActivityListProps) {
  return (
    <div className="bg-white rounded-xl border shadow-sm">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Documents</h3>
        {activities.length > 0 && (
          <button onClick={onRefresh} className="text-sm text-gray-500 hover:text-gray-700">
            Refresh
          </button>
        )}
      </div>
      <div className="p-6">
        {loading ? (
          <LoadingState />
        ) : activities.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                deletingId={deletingId}
                onOpen={onOpenDocument}
                onDelete={onDeleteDocument}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500 mx-auto mb-3"></div>
      <p className="text-sm text-gray-500">Loading documents...</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8">
      <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500 font-medium">No recent documents</p>
      <p className="text-sm text-gray-400 mt-1">
        Upload a document to Citation Management or Validator to get started
      </p>
    </div>
  );
}

function ActivityRow({
  activity,
  deletingId,
  onOpen,
  onDelete,
}: {
  activity: RecentActivity;
  deletingId: string | null;
  onOpen: (activity: RecentActivity) => void;
  onDelete: (e: React.MouseEvent, activity: RecentActivity) => void;
}) {
  const typeColors = activity.type === 'citation'
    ? { bg: 'bg-blue-50', icon: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', button: 'bg-blue-100 text-blue-600' }
    : { bg: 'bg-emerald-50', icon: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', button: 'bg-emerald-100 text-emerald-600' };

  return (
    <div
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer group"
      onClick={() => onOpen(activity)}
    >
      <div className={`p-2 rounded-lg ${typeColors.bg}`}>
        {activity.type === 'citation' ? (
          <BookOpen className={`w-4 h-4 ${typeColors.icon}`} />
        ) : (
          <FileCheck className={`w-4 h-4 ${typeColors.icon}`} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 truncate">{activity.document}</p>
          <span className={`text-xs px-1.5 py-0.5 rounded ${typeColors.badge}`}>
            {activity.type === 'citation' ? 'Citation' : 'Validator'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{activity.action}</span>
          {activity.fileSize != null && activity.fileSize > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span>{formatFileSize(activity.fileSize)}</span>
            </>
          )}
          {activity.wordCount != null && activity.wordCount > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <span>{activity.wordCount.toLocaleString()} words</span>
            </>
          )}
          {activity.processingTime != null && (
            <>
              <span className="text-gray-300">|</span>
              <span className="text-green-600 font-medium">{formatDuration(activity.processingTime)}</span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <StatusIcon status={activity.status} />
        <span className="text-xs text-gray-400 w-16 text-right">{activity.timestamp}</span>
        <button
          className={`p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-400 transition-opacity ${typeColors.button}`}
          title={activity.type === 'citation' ? 'Open Citation Analysis' : 'Open in Editor'}
          aria-label={activity.type === 'citation' ? 'Open Citation Analysis' : 'Open in Editor'}
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 transition-opacity bg-red-100 text-red-600 hover:bg-red-200"
          title="Delete document"
          aria-label={`Delete document ${activity.document}`}
          disabled={deletingId === activity.documentId}
          onClick={(e) => onDelete(e, activity)}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: RecentActivity['status'] }) {
  if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === 'pending') return <Clock className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-blue-500" />;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSecs = Math.round(seconds % 60);
  return `${minutes}m ${remainingSecs}s`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
