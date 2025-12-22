import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, ThumbsDown, Check, X, Eye, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
import { api } from '@/services/api';

type FeedbackType = 'ACCESSIBILITY_ISSUE' | 'ALT_TEXT_QUALITY' | 'AUDIT_ACCURACY' | 'REMEDIATION_SUGGESTION' | 'GENERAL' | 'BUG_REPORT' | 'FEATURE_REQUEST';
type FeedbackStatus = 'NEW' | 'REVIEWED' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';

export interface AttentionItem {
  id: string;
  type: FeedbackType;
  status: FeedbackStatus;
  comment: string;
  isPositive: boolean | null;
  createdAt: string;
}

interface RequiringAttentionProps {
  onViewItem?: (item: AttentionItem) => void;
  className?: string;
}

const generateDemoItems = (): AttentionItem[] => [
  {
    id: 'attn-1',
    type: 'ACCESSIBILITY_ISSUE',
    status: 'NEW',
    comment: 'Images in Chapter 3 are missing alt text descriptions',
    isPositive: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attn-2',
    type: 'AUDIT_ACCURACY',
    status: 'NEW',
    comment: 'Audit reported false positive for heading structure',
    isPositive: false,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attn-3',
    type: 'BUG_REPORT',
    status: 'REVIEWED',
    comment: 'Export fails when filename contains special characters',
    isPositive: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'attn-4',
    type: 'ALT_TEXT_QUALITY',
    status: 'NEW',
    comment: 'Generated alt text for charts is too generic',
    isPositive: false,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  return 'Just now';
};

export const RequiringAttention: React.FC<RequiringAttentionProps> = ({
  onViewItem,
  className,
}) => {
  const [items, setItems] = useState<AttentionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      try {
        const response = await api.get('/feedback/dashboard/requiring-attention');
        const data = response.data.data || response.data;
        setItems(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('[RequiringAttention] Failed to fetch items:', error);
        setItems(generateDemoItems());
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, []);

  const handleQuickAction = useCallback(async (id: string, newStatus: FeedbackStatus) => {
    setUpdatingId(id);
    try {
      await api.patch(`/feedback/${id}`, { status: newStatus });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch (error) {
      console.error('[RequiringAttention] Failed to update status:', error);
    } finally {
      setUpdatingId(null);
    }
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Requiring Attention
          {items.length > 0 && (
            <Badge variant="error" size="sm">{items.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p>All caught up! No items need attention.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {item.isPositive === false && (
                        <ThumbsDown className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                      )}
                      <Badge variant={item.status === 'NEW' ? 'info' : 'warning'} size="sm">
                        {item.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {item.comment}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {item.type.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {updatingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewItem?.(item)}
                          title="View details"
                          className="p-1.5"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickAction(item.id, 'RESOLVED')}
                          title="Mark resolved"
                          className="p-1.5 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleQuickAction(item.id, 'DISMISSED')}
                          title="Dismiss"
                          className="p-1.5 text-gray-400 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
