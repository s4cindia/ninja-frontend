/**
 * DocumentStatsBar
 *
 * Displays content type badge prominently, plus document statistics (word count, file size).
 */

import { FileText, BookOpen } from 'lucide-react';
import type { DocStats } from '@/hooks/useDocumentEditor';

interface DocumentStatsBarProps {
  docStats: DocStats;
  contentType?: string;
}

export function DocumentStatsBar({ docStats, contentType }: DocumentStatsBarProps) {
  const hasStats = docStats.fileSize || docStats.wordCount || contentType;
  if (!hasStats) return null;

  return (
    <div className="flex items-center gap-4 bg-gray-50 border-b px-4 py-2">
      {contentType && contentType !== 'UNKNOWN' && (
        <ContentTypeBadge contentType={contentType} />
      )}
      {contentType && contentType !== 'UNKNOWN' && (docStats.wordCount || docStats.fileSize) && (
        <div className="h-4 w-px bg-gray-300" />
      )}
      {docStats.wordCount != null && docStats.wordCount > 0 && (
        <StatItem label="Words" value={docStats.wordCount.toLocaleString()} />
      )}
      {docStats.fileSize != null && docStats.fileSize > 0 && (
        <StatItem label="Size" value={formatFileSize(docStats.fileSize)} />
      )}
    </div>
  );
}

function ContentTypeBadge({ contentType }: { contentType: string }) {
  const isJournal = contentType === 'JOURNAL_ARTICLE';
  const Icon = isJournal ? FileText : BookOpen;
  const label = isJournal ? 'Journal Article' : 'Book';

  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-sm font-semibold ${
      isJournal
        ? 'bg-blue-100 text-blue-800 border border-blue-200'
        : 'bg-green-100 text-green-800 border border-green-200'
    }`}>
      <Icon className="w-4 h-4" />
      {label}
    </div>
  );
}

function StatItem({
  label,
  value,
  valueClassName = 'font-medium text-gray-700',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-gray-500">{label}:</span>
      <span className={valueClassName}>{value}</span>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1048576) {
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
  return `${(bytes / 1024).toFixed(1)} KB`;
}
