import React, { useState } from 'react';
import { 
  Check, X, RefreshCw, Filter, ChevronDown, ChevronUp,
  AlertTriangle, Eye, Edit2, Sparkles, CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';
import { useAltTextReview } from '@/hooks/useAltTextReview';
import { GeneratedAltText, AltTextStatus } from '@/types/alt-text.types';

interface AltTextReviewQueueProps {
  jobId: string;
  onItemSelect?: (item: GeneratedAltText) => void;
}

const STATUS_CONFIG: Record<AltTextStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Pending', color: 'gray', icon: null },
  needs_review: { label: 'Needs Review', color: 'orange', icon: <AlertTriangle className="h-3 w-3" /> },
  approved: { label: 'Approved', color: 'green', icon: <Check className="h-3 w-3" /> },
  edited: { label: 'Edited', color: 'blue', icon: <Edit2 className="h-3 w-3" /> },
  rejected: { label: 'Rejected', color: 'red', icon: <X className="h-3 w-3" /> },
};

const FLAG_COLORS: Record<string, string> = {
  FACE_DETECTED: 'yellow',
  TEXT_IN_IMAGE: 'blue',
  LOW_CONFIDENCE: 'red',
  SENSITIVE_CONTENT: 'red',
  COMPLEX_SCENE: 'yellow',
  NEEDS_MANUAL_REVIEW: 'orange',
  REGENERATED: 'gray',
  DATA_VISUALIZATION: 'purple',
  DATA_EXTRACTED: 'green',
  COMPLEX_IMAGE: 'yellow',
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 85) return 'text-green-600 bg-green-100';
  if (confidence >= 70) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
};

export const AltTextReviewQueue: React.FC<AltTextReviewQueueProps> = ({
  jobId,
  onItemSelect,
}) => {
  const {
    items,
    stats,
    isLoading,
    error,
    isDemo,
    filters,
    setFilters,
    refresh,
    approve,
    reject,
    regenerate,
    batchApprove,
  } = useAltTextReview(jobId);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [batchConfidence, setBatchConfidence] = useState(85);

  const handleApprove = async (item: GeneratedAltText, customText?: string) => {
    try {
      await approve(item.id, customText);
      setEditingId(null);
      setEditText('');
    } catch (error) {
      console.error('Failed to approve:', error);
    }
  };

  const handleStartEdit = (item: GeneratedAltText) => {
    setEditingId(item.id);
    setEditText(item.shortAlt);
  };

  const handleBatchApprove = async () => {
    try {
      const result = await batchApprove(batchConfidence);
      alert(`Approved ${result?.approved || 0} items`);
    } catch (error) {
      console.error('Batch approve failed:', error);
      alert('Failed to batch approve items');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Alt Text Review Queue</h2>
          <p className="text-sm text-gray-500">
            Review and approve AI-generated alt text
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <Badge variant="warning">Demo Mode</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={refresh}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total" value={stats.total} color="gray" />
        <StatCard label="Pending" value={stats.pending} color="gray" />
        <StatCard label="Needs Review" value={stats.needsReview} color="orange" />
        <StatCard label="Approved" value={stats.approved} color="green" />
        <StatCard label="Edited" value={stats.edited} color="blue" />
        <StatCard label="Rejected" value={stats.rejected} color="red" />
      </div>

      <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4 mr-1" />
          Filters
          {showFilters ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
        </Button>

        <div className="h-6 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Batch approve confidence ≥</span>
          <input
            type="number"
            value={batchConfidence}
            onChange={(e) => setBatchConfidence(Number(e.target.value))}
            className="w-16 px-2 py-1 text-sm border rounded"
            min={0}
            max={100}
          />
          <span className="text-sm text-gray-600">%</span>
          <Button variant="primary" size="sm" onClick={handleBatchApprove}>
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Batch Approve
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className="p-4 bg-white border rounded-lg space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as AltTextStatus || undefined })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="needs_review">Needs Review</option>
                <option value="approved">Approved</option>
                <option value="edited">Edited</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Confidence</label>
              <input
                type="number"
                value={filters.minConfidence || ''}
                onChange={(e) => setFilters({ ...filters, minConfidence: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="0"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                min={0}
                max={100}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Confidence</label>
              <input
                type="number"
                value={filters.maxConfidence || ''}
                onChange={(e) => setFilters({ ...filters, maxConfidence: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="100"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                min={0}
                max={100}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFilters({})}>
              Clear Filters
            </Button>
          </div>
        </div>
      )}

      {error && (
        <Alert variant="error">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </Alert>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="text-gray-500 mt-2">Loading review queue...</p>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
          <p className="text-gray-600">All items have been reviewed!</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <ReviewItem
              key={item.id}
              item={item}
              isExpanded={expandedId === item.id}
              isEditing={editingId === item.id}
              editText={editText}
              onToggleExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
              onSelect={() => onItemSelect?.(item)}
              onApprove={() => handleApprove(item)}
              onApproveWithEdit={() => handleApprove(item, editText)}
              onReject={() => reject(item.id)}
              onRegenerate={() => regenerate(item.id)}
              onStartEdit={() => handleStartEdit(item)}
              onCancelEdit={() => { setEditingId(null); setEditText(''); }}
              onEditTextChange={setEditText}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className={cn(
    'p-3 rounded-lg text-center',
    color === 'gray' && 'bg-gray-100',
    color === 'orange' && 'bg-orange-50',
    color === 'green' && 'bg-green-50',
    color === 'blue' && 'bg-blue-50',
    color === 'red' && 'bg-red-50',
  )}>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    <p className="text-xs text-gray-600">{label}</p>
  </div>
);

interface ReviewItemProps {
  item: GeneratedAltText;
  isExpanded: boolean;
  isEditing: boolean;
  editText: string;
  onToggleExpand: () => void;
  onSelect: () => void;
  onApprove: () => void;
  onApproveWithEdit: () => void;
  onReject: () => void;
  onRegenerate: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onEditTextChange: (text: string) => void;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  item,
  isExpanded,
  isEditing,
  editText,
  onToggleExpand,
  onApprove,
  onApproveWithEdit,
  onReject,
  onRegenerate,
  onStartEdit,
  onCancelEdit,
  onEditTextChange,
}) => {
  const statusConfig = STATUS_CONFIG[item.status];

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden transition-shadow',
      item.status === 'needs_review' && 'border-orange-300 bg-orange-50',
      item.status === 'approved' && 'border-green-200 bg-green-50',
      item.status === 'rejected' && 'border-red-200 bg-red-50',
    )}>
      <div 
        className="flex items-center gap-4 p-3 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onToggleExpand()}
      >
        <div className="flex-shrink-0">
          {item.thumbnailUrl ? (
            <img 
              src={item.thumbnailUrl} 
              alt="" 
              className="w-16 h-16 object-cover rounded"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
              <Eye className="h-6 w-6 text-gray-400" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{item.shortAlt}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={statusConfig.color as 'default' | 'success' | 'warning' | 'error' | 'info'}>
              {statusConfig.icon}
              <span className="ml-1">{statusConfig.label}</span>
            </Badge>
            <span className={cn(
              'px-2 py-0.5 rounded-full text-xs font-medium',
              getConfidenceColor(item.confidence)
            )}>
              {item.confidence}%
            </span>
          </div>
        </div>

        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-gray-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-gray-400" />
        )}
      </div>

      {isExpanded && (
        <div className="p-4 border-t bg-white space-y-4">
          {item.thumbnailUrl && (
            <div className="flex justify-center">
              <img 
                src={item.thumbnailUrl} 
                alt="" 
                className="max-h-48 rounded-lg shadow-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Short Alt Text ({(isEditing ? editText : item.shortAlt).length}/125)
            </label>
            {isEditing ? (
              <textarea
                value={editText}
                onChange={(e) => onEditTextChange(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
                rows={2}
                maxLength={125}
              />
            ) : (
              <p className="p-2 bg-gray-50 rounded-lg text-sm">{item.shortAlt}</p>
            )}
          </div>

          {item.extendedAlt && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Extended Description
              </label>
              <p className="p-2 bg-gray-50 rounded-lg text-sm text-gray-700">{item.extendedAlt}</p>
            </div>
          )}

          {item.flags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.flags.map((flag) => (
                <Badge key={flag} variant={FLAG_COLORS[flag] as 'default' | 'success' | 'warning' | 'error' | 'info' || 'default'} className="text-xs">
                  {flag.replace(/_/g, ' ')}
                </Badge>
              ))}
            </div>
          )}

          {item.status !== 'approved' && item.status !== 'rejected' && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              {isEditing ? (
                <>
                  <Button variant="primary" size="sm" onClick={onApproveWithEdit}>
                    <Check className="h-4 w-4 mr-1" />
                    Save & Approve
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="primary" size="sm" onClick={onApprove}>
                    <Check className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={onStartEdit}>
                    <Edit2 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRegenerate}>
                    <Sparkles className="h-4 w-4 mr-1" />
                    Regenerate
                  </Button>
                  <Button variant="ghost" size="sm" onClick={onReject} className="text-red-600 hover:text-red-700">
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </>
              )}
            </div>
          )}

          <p className="text-xs text-gray-400">
            ID: {item.id} • Generated by {item.aiModel}
            {item.approvedBy && ` • Approved by ${item.approvedBy}`}
          </p>
        </div>
      )}
    </div>
  );
};
