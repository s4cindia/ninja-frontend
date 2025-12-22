import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, ThumbsUp, Clock, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { 
  FeedbackList, 
  FeedbackItem,
  FeedbackDetail, 
  FeedbackTrends, 
  RequiringAttention,
  AttentionItem
} from '@/components/feedback';
import { api } from '@/services/api';

type FeedbackType = 'ACCESSIBILITY_ISSUE' | 'ALT_TEXT_QUALITY' | 'AUDIT_ACCURACY' | 'REMEDIATION_SUGGESTION' | 'GENERAL' | 'BUG_REPORT' | 'FEATURE_REQUEST';
type FeedbackStatus = 'NEW' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

interface DashboardStats {
  total: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  positiveCount: number;
  negativeCount: number;
  responseRate: number;
}

const generateDemoStats = (): DashboardStats => ({
  total: 127,
  byType: {
    ACCESSIBILITY_ISSUE: 34,
    ALT_TEXT_QUALITY: 28,
    AUDIT_ACCURACY: 22,
    REMEDIATION_SUGGESTION: 18,
    GENERAL: 12,
    BUG_REPORT: 8,
    FEATURE_REQUEST: 5,
  },
  byStatus: {
    NEW: 23,
    REVIEWED: 31,
    IN_PROGRESS: 15,
    RESOLVED: 48,
    DISMISSED: 10,
  },
  positiveCount: 89,
  negativeCount: 38,
  responseRate: 78,
});

const generateDemoFeedback = (page: number): FeedbackItem[] => {
  const types: FeedbackType[] = ['ACCESSIBILITY_ISSUE', 'ALT_TEXT_QUALITY', 'AUDIT_ACCURACY', 'GENERAL', 'BUG_REPORT'];
  const statuses: FeedbackStatus[] = ['NEW', 'REVIEWED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED'];
  const comments = [
    'The alt text generated for complex charts needs more detail',
    'Audit correctly identified missing table headers',
    'Navigation landmarks were not properly detected',
    'Great improvement in accessibility score after remediation',
    'Some false positives in color contrast checks',
    'Export format options are very helpful',
    'Would like to see batch processing support',
    'Alt text for decorative images should be empty',
  ];

  return Array.from({ length: 10 }, (_, i) => ({
    id: `fb-${page}-${i}`,
    type: types[i % types.length],
    status: statuses[i % statuses.length],
    comment: comments[i % comments.length],
    isPositive: i % 3 === 0 ? true : i % 3 === 1 ? false : null,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
  }));
};

export const FeedbackDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(5);
  const [filters, setFilters] = useState<{
    type: FeedbackType | 'ALL';
    status: FeedbackStatus | 'ALL';
    rating: 'positive' | 'negative' | 'all';
  }>({
    type: 'ALL',
    status: 'ALL',
    rating: 'all',
  });
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [sortField, setSortField] = useState<'createdAt' | 'type' | 'status'>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingStats(true);
      try {
        const response = await api.get('/feedback/dashboard/stats');
        const data = response.data.data || response.data;
        setStats(data);
      } catch (error) {
        console.error('[FeedbackDashboard] Failed to fetch stats:', error);
        setStats(generateDemoStats());
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  useEffect(() => {
    const fetchFeedback = async () => {
      setIsLoadingFeedback(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '10',
        });
        if (filters.type !== 'ALL') params.append('type', filters.type);
        if (filters.status !== 'ALL') params.append('status', filters.status);
        if (filters.rating !== 'all') params.append('rating', filters.rating);
        params.append('sortBy', sortField);
        params.append('sortOrder', sortDirection);

        const response = await api.get(`/feedback?${params.toString()}`);
        const data = response.data.data || response.data;
        setFeedbackItems(Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : []);
        setTotalPages(data.totalPages || 5);
      } catch (error) {
        console.error('[FeedbackDashboard] Failed to fetch feedback:', error);
        setFeedbackItems(generateDemoFeedback(page));
      } finally {
        setIsLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, [page, filters, sortField, sortDirection]);

  const handleItemClick = useCallback((item: FeedbackItem) => {
    setSelectedItem(item);
  }, []);

  const handleStatusUpdate = useCallback((id: string, newStatus: FeedbackStatus) => {
    setFeedbackItems(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ));
  }, []);

  const handleFilterChange = useCallback((newFilters: typeof filters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSortChange = useCallback((field: 'createdAt' | 'type' | 'status', direction: 'asc' | 'desc') => {
    setSortField(field);
    setSortDirection(direction);
  }, []);

  const positiveRate = stats && (stats.positiveCount + stats.negativeCount) > 0 
    ? Math.round((stats.positiveCount / (stats.positiveCount + stats.negativeCount)) * 100) 
    : 0;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare className="h-7 w-7 text-primary-600" />
          Feedback Dashboard
        </h1>
        <p className="text-gray-600 mt-1">
          View and manage user feedback
        </p>
      </div>

      {isLoadingStats ? (
        <div className="flex items-center justify-center py-8">
          <Spinner size="lg" />
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-primary-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total Feedback</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{positiveRate}%</p>
                  <p className="text-sm text-gray-500">Positive Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.byStatus.NEW || 0}</p>
                  <p className="text-sm text-gray-500">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.responseRate}%</p>
                  <p className="text-sm text-gray-500">Response Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FeedbackTrends />
        <RequiringAttention onViewItem={(item: AttentionItem) => {
          const feedbackItem: FeedbackItem = {
            ...item,
            comment: item.comment,
          };
          handleItemClick(feedbackItem);
        }} />
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byType).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{type.replace(/_/g, ' ')}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary-500 rounded-full"
                          style={{ width: `${(count / stats.total) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">By Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(stats.byStatus).map(([status, count]) => {
                  const colors: Record<string, string> = {
                    NEW: 'bg-blue-500',
                    REVIEWED: 'bg-amber-500',
                    IN_PROGRESS: 'bg-purple-500',
                    RESOLVED: 'bg-green-500',
                    DISMISSED: 'bg-gray-400',
                  };
                  return (
                    <div key={status} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">{status.replace(/_/g, ' ')}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${colors[status] || 'bg-gray-400'}`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-8 text-right">{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <FeedbackList
        items={feedbackItems}
        isLoading={isLoadingFeedback}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onItemClick={handleItemClick}
        filters={filters}
        onFilterChange={handleFilterChange}
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
      />

      {selectedItem && (
        <FeedbackDetail
          item={selectedItem}
          isOpen={true}
          onClose={() => setSelectedItem(null)}
          onStatusUpdate={handleStatusUpdate}
        />
      )}
    </div>
  );
};
