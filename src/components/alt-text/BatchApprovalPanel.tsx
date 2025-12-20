import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, Filter, Zap, 
  ChevronDown, ChevronUp, Info, XCircle
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Alert } from '../ui/Alert';
import { cn } from '@/utils/cn';
import { GeneratedAltText, AltTextFlag } from '@/types/alt-text.types';

interface BatchApprovalPanelProps {
  items: GeneratedAltText[];
  onBatchApprove: (ids: string[]) => Promise<void>;
  onBatchReject?: (ids: string[]) => Promise<void>;
  isProcessing?: boolean;
}

interface ApprovalCriteria {
  minConfidence: number;
  excludeFlags: AltTextFlag[];
  includeStatuses: string[];
}

const EXCLUDABLE_FLAGS: { flag: AltTextFlag; label: string; description: string }[] = [
  { flag: 'FACE_DETECTED', label: 'Face Detected', description: 'Images containing human faces' },
  { flag: 'SENSITIVE_CONTENT', label: 'Sensitive Content', description: 'Potentially sensitive images' },
  { flag: 'LOW_CONFIDENCE', label: 'Low Confidence', description: 'AI-generated with low confidence' },
  { flag: 'NEEDS_MANUAL_REVIEW', label: 'Needs Manual Review', description: 'Flagged for human review' },
  { flag: 'TEXT_IN_IMAGE', label: 'Text in Image', description: 'Images containing text (OCR needed)' },
  { flag: 'COMPLEX_IMAGE', label: 'Complex Image', description: 'Complex scenes or diagrams' },
];

const DEFAULT_EXCLUDED_FLAGS: AltTextFlag[] = [
  'FACE_DETECTED',
  'SENSITIVE_CONTENT',
  'LOW_CONFIDENCE',
  'NEEDS_MANUAL_REVIEW',
];

export const BatchApprovalPanel: React.FC<BatchApprovalPanelProps> = ({
  items,
  onBatchApprove,
  onBatchReject,
  isProcessing = false,
}) => {
  const [criteria, setCriteria] = useState<ApprovalCriteria>({
    minConfidence: 85,
    excludeFlags: DEFAULT_EXCLUDED_FLAGS,
    includeStatuses: ['pending', 'needs_review'],
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [lastResult, setLastResult] = useState<{ approved: number; message: string } | null>(null);

  const { eligibleItems, excludedItems, breakdown } = useMemo(() => {
    const eligible: GeneratedAltText[] = [];
    const excluded: GeneratedAltText[] = [];
    const reasons: Record<string, number> = {
      lowConfidence: 0,
      excludedFlag: 0,
      wrongStatus: 0,
    };

    items.forEach((item) => {
      if (!criteria.includeStatuses.includes(item.status)) {
        excluded.push(item);
        reasons.wrongStatus++;
        return;
      }

      if (item.confidence < criteria.minConfidence) {
        excluded.push(item);
        reasons.lowConfidence++;
        return;
      }

      const hasExcludedFlag = item.flags.some(flag => 
        criteria.excludeFlags.includes(flag as AltTextFlag)
      );
      if (hasExcludedFlag) {
        excluded.push(item);
        reasons.excludedFlag++;
        return;
      }

      eligible.push(item);
    });

    return { 
      eligibleItems: eligible, 
      excludedItems: excluded,
      breakdown: reasons,
    };
  }, [items, criteria]);

  const handleConfidenceChange = (value: number) => {
    setCriteria(prev => ({ ...prev, minConfidence: value }));
    setLastResult(null);
  };

  const toggleExcludeFlag = (flag: AltTextFlag) => {
    setCriteria(prev => ({
      ...prev,
      excludeFlags: prev.excludeFlags.includes(flag)
        ? prev.excludeFlags.filter(f => f !== flag)
        : [...prev.excludeFlags, flag],
    }));
    setLastResult(null);
  };

  const handleBatchApprove = async () => {
    if (eligibleItems.length === 0) return;
    
    try {
      const ids = eligibleItems.map(item => item.id);
      await onBatchApprove(ids);
      setLastResult({
        approved: ids.length,
        message: `Successfully approved ${ids.length} items`,
      });
    } catch (error) {
      console.error('Batch approve failed:', error);
    }
  };

  const handleBatchReject = async () => {
    if (!onBatchReject || excludedItems.length === 0) return;
    
    try {
      const ids = excludedItems.map(item => item.id);
      await onBatchReject(ids);
    } catch (error) {
      console.error('Batch reject failed:', error);
    }
  };

  const confidencePresets = [
    { value: 95, label: 'Very High (95%+)', description: 'Only the most confident' },
    { value: 85, label: 'High (85%+)', description: 'Recommended default' },
    { value: 75, label: 'Medium (75%+)', description: 'Include more items' },
    { value: 70, label: 'Standard (70%+)', description: 'Include most items' },
  ];

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">Batch Approval</h3>
        </div>
        <Badge variant="info">{items.length} total images</Badge>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 bg-green-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-700">{eligibleItems.length}</p>
          <p className="text-xs text-green-600">Ready to Approve</p>
        </div>
        <div className="p-3 bg-yellow-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-yellow-700">{excludedItems.length}</p>
          <p className="text-xs text-yellow-600">Excluded</p>
        </div>
        <div className="p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-700">{criteria.minConfidence}%</p>
          <p className="text-xs text-blue-600">Min Confidence</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Minimum Confidence Threshold
        </label>
        <input
          type="range"
          min={50}
          max={100}
          value={criteria.minConfidence}
          onChange={(e) => handleConfidenceChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>50%</span>
          <span className="font-medium text-primary-600">{criteria.minConfidence}%</span>
          <span>100%</span>
        </div>
        
        <div className="flex flex-wrap gap-2 mt-2">
          {confidencePresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleConfidenceChange(preset.value)}
              className={cn(
                'px-3 py-1 text-xs rounded-full border transition-colors',
                criteria.minConfidence === preset.value
                  ? 'bg-primary-100 border-primary-300 text-primary-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              )}
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <Filter className="h-4 w-4" />
        Advanced Filters
        {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {showAdvanced && (
        <div className="space-y-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exclude images with these flags:
            </label>
            <div className="space-y-2">
              {EXCLUDABLE_FLAGS.map(({ flag, label, description }) => (
                <label 
                  key={flag} 
                  className="flex items-start gap-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={criteria.excludeFlags.includes(flag)}
                    onChange={() => toggleExcludeFlag(flag)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <p className="text-xs text-gray-500">{description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {excludedItems.length > 0 && (
            <div className="p-2 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs font-medium text-yellow-800 mb-1">Exclusion Reasons:</p>
              <ul className="text-xs text-yellow-700 space-y-0.5">
                {breakdown.lowConfidence > 0 && (
                  <li>• {breakdown.lowConfidence} below confidence threshold</li>
                )}
                {breakdown.excludedFlag > 0 && (
                  <li>• {breakdown.excludedFlag} have excluded flags</li>
                )}
                {breakdown.wrongStatus > 0 && (
                  <li>• {breakdown.wrongStatus} already processed</li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {lastResult && (
        <Alert variant="success">
          {lastResult.message}
        </Alert>
      )}

      {criteria.minConfidence < 70 && (
        <Alert variant="warning">
          Low confidence threshold may approve inaccurate alt text. Consider manual review.
        </Alert>
      )}

      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="primary"
          onClick={handleBatchApprove}
          disabled={eligibleItems.length === 0 || isProcessing}
          className="flex-1"
        >
          {isProcessing ? (
            <>Processing...</>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve {eligibleItems.length} Items
            </>
          )}
        </Button>
        
        {onBatchReject && excludedItems.length > 0 && (
          <Button
            variant="outline"
            onClick={handleBatchReject}
            disabled={isProcessing}
            className="text-red-600 hover:text-red-700"
          >
            <XCircle className="h-4 w-4 mr-1" />
            Reject Excluded
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 flex items-center gap-1">
        <Info className="h-3 w-3" />
        Batch approval skips items requiring manual review for safety
      </p>
    </div>
  );
};

export const BatchApprovalInline: React.FC<{
  eligibleCount: number;
  totalCount: number;
  minConfidence: number;
  onConfidenceChange: (value: number) => void;
  onApprove: () => void;
  isProcessing?: boolean;
}> = ({ 
  eligibleCount, 
  totalCount, 
  minConfidence, 
  onConfidenceChange, 
  onApprove,
  isProcessing 
}) => {
  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Confidence ≥</span>
        <input
          type="number"
          value={minConfidence}
          onChange={(e) => onConfidenceChange(Number(e.target.value))}
          className="w-16 px-2 py-1 text-sm border rounded"
          min={50}
          max={100}
        />
        <span className="text-sm text-gray-600">%</span>
      </div>
      <div className="text-sm text-gray-500">
        {eligibleCount} of {totalCount} eligible
      </div>
      <Button
        variant="primary"
        size="sm"
        onClick={onApprove}
        disabled={eligibleCount === 0 || isProcessing}
      >
        <CheckCircle2 className="h-4 w-4 mr-1" />
        Batch Approve
      </Button>
    </div>
  );
};
