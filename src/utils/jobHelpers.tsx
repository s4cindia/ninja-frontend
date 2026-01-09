import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

export function getStatusIcon(status: string, size: 'sm' | 'md' = 'sm') {
  const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';
  
  switch (status) {
    case 'QUEUED':
      return <Clock className={sizeClass} />;
    case 'PROCESSING':
      return <Loader2 className={`${sizeClass} animate-spin`} />;
    case 'COMPLETED':
      return <CheckCircle className={sizeClass} />;
    case 'FAILED':
      return <XCircle className={sizeClass} />;
    case 'CANCELLED':
      return <AlertCircle className={sizeClass} />;
    default:
      return null;
  }
}

export function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'QUEUED':
      return 'bg-gray-100 text-gray-800';
    case 'PROCESSING':
      return 'bg-blue-100 text-blue-800';
    case 'COMPLETED':
      return 'bg-green-100 text-green-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'CANCELLED':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString();
}

export function formatDuration(startDate: string, endDate?: string): string {
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'Unknown';
  
  const diffMs = end.getTime() - start.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffHours > 0) {
    return `${diffHours}h ${diffMins % 60}m`;
  }
  if (diffMins > 0) {
    return `${diffMins}m ${diffSecs % 60}s`;
  }
  return `${diffSecs}s`;
}
