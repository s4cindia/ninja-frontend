import React, { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Filter, X, ArrowUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '@/types/feedback.types';

export type { FeedbackItem };

type SortField = 'createdAt' | 'type' | 'status';
type SortDirection = 'asc' | 'desc';

interface FeedbackListProps {
  items: FeedbackItem[];
  isLoading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onItemClick: (item: FeedbackItem) => void;
  filters: {
    type: FeedbackType | 'ALL';
    status: FeedbackStatus | 'ALL';
    rating: 'positive' | 'negative' | 'all';
  };
  onFilterChange: (filters: FeedbackListProps['filters']) => void;
  sortField?: SortField;
  sortDirection?: SortDirection;
  onSortChange?: (field: SortField, direction: SortDirection) => void;
}

const TYPE_OPTIONS: { value: FeedbackType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Types' },
  { value: 'ACCESSIBILITY_ISSUE', label: 'Accessibility Issue' },
  { value: 'ALT_TEXT_QUALITY', label: 'Alt Text Quality' },
  { value: 'AUDIT_ACCURACY', label: 'Audit Accuracy' },
  { value: 'REMEDIATION_SUGGESTION', label: 'Remediation' },
  { value: 'GENERAL', label: 'General' },
  { value: 'BUG_REPORT', label: 'Bug Report' },
  { value: 'FEATURE_REQUEST', label: 'Feature Request' },
];

const STATUS_OPTIONS: { value: FeedbackStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Status' },
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
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const truncateText = (text: string, maxLength: number = 80) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const FeedbackList: React.FC<FeedbackListProps> = ({
  items,
  isLoading = false,
  page,
  totalPages,
  onPageChange,
  onItemClick,
  filters,
  onFilterChange,
  sortField = 'createdAt',
  sortDirection = 'desc',
  onSortChange,
}) => {
  const [showFilters, setShowFilters] = useState(false);

  const handleFilterChange = useCallback((key: keyof typeof filters, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  }, [filters, onFilterChange]);

  const handleSort = useCallback((field: SortField) => {
    if (!onSortChange) return;
    const newDirection = sortField === field && sortDirection === 'desc' ? 'asc' : 'desc';
    onSortChange(field, newDirection);
  }, [sortField, sortDirection, onSortChange]);

  const SortableHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th 
      className="text-left py-3 px-2 text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 select-none"
      onClick={() => handleSort(field)}
      aria-sort={sortField === field ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field ? (
          <span className="text-primary-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        ) : (
          <ArrowUpDown className="h-3 w-3 text-gray-400" />
        )}
      </span>
    </th>
  );

  const hasActiveFilters = filters.type !== 'ALL' || filters.status !== 'ALL' || filters.rating !== 'all';

  const clearFilters = () => {
    onFilterChange({ type: 'ALL', status: 'ALL', rating: 'all' });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Feedback List</CardTitle>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
          <Button 
            variant={showFilters ? 'primary' : 'outline'} 
            size="sm" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showFilters && (
          <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex flex-col gap-1">
              <label htmlFor="type-filter" className="text-xs font-medium text-gray-600">Type</label>
              <select
                id="type-filter"
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                {TYPE_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="status-filter" className="text-xs font-medium text-gray-600">Status</label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="rating-filter" className="text-xs font-medium text-gray-600">Rating</label>
              <select
                id="rating-filter"
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Ratings</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
              </select>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No feedback items found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <SortableHeader field="createdAt">Date</SortableHeader>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Submitted By</th>
                    <SortableHeader field="type">Type</SortableHeader>
                    <SortableHeader field="status">Status</SortableHeader>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Rating</th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-gray-600">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onItemClick(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onItemClick(item);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View feedback: ${item.type.replace(/_/g, ' ')}`}
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset"
                    >
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {formatDate(item.createdAt)}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-600">
                        {item.userEmail || 'Anonymous'}
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="default" size="sm">
                          {item.type.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant={STATUS_VARIANTS[item.status]} size="sm">
                          {item.status.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        {item.isPositive === true && (
                          <ThumbsUp className="h-4 w-4 text-green-600" />
                        )}
                        {item.isPositive === false && (
                          <ThumbsDown className="h-4 w-4 text-red-600" />
                        )}
                        {item.isPositive === null && (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-sm text-gray-700">
                        {truncateText(item.comment)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-gray-600">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
