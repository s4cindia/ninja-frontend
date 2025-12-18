import { useState, useMemo } from 'react';
import { Filter, CheckSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { VerificationItem } from './VerificationItem';
import { useVerificationQueue, useSubmitVerification, useBulkVerification } from '@/hooks/useVerification';
import type { 
  VerificationItem as VerificationItemType,
  VerificationStatus, 
  VerificationMethod,
  Severity,
  ConfidenceLevel,
  VerificationFilters 
} from '@/types/verification.types';

interface VerificationQueueProps {
  jobId: string;
  onComplete: () => void;
}

const mockItems: VerificationItemType[] = [
  {
    id: '1',
    criterionId: '1.1.1',
    criterionName: 'Non-text Content',
    wcagLevel: 'A',
    severity: 'serious',
    confidenceLevel: 'low',
    confidenceScore: 55,
    automatedResult: 'warning',
    automatedNotes: 'Found 3 images with alt text that may need review. Alt text appears to be auto-generated.',
    status: 'pending',
    history: [],
  },
  {
    id: '2',
    criterionId: '1.4.1',
    criterionName: 'Use of Color',
    wcagLevel: 'A',
    severity: 'critical',
    confidenceLevel: 'low',
    confidenceScore: 45,
    automatedResult: 'fail',
    automatedNotes: 'Color-only indicators detected for required form fields. No text or icon alternative provided.',
    status: 'pending',
    history: [],
  },
  {
    id: '3',
    criterionId: '2.1.1',
    criterionName: 'Keyboard',
    wcagLevel: 'A',
    severity: 'critical',
    confidenceLevel: 'manual',
    confidenceScore: 0,
    automatedResult: 'not_tested',
    automatedNotes: 'Custom dropdown component requires manual keyboard testing.',
    status: 'pending',
    history: [],
  },
  {
    id: '4',
    criterionId: '1.2.1',
    criterionName: 'Audio-only and Video-only',
    wcagLevel: 'A',
    severity: 'moderate',
    confidenceLevel: 'manual',
    confidenceScore: 0,
    automatedResult: 'not_tested',
    automatedNotes: 'Media content detected but transcript availability could not be automatically verified.',
    status: 'pending',
    history: [],
  },
  {
    id: '5',
    criterionId: '2.4.4',
    criterionName: 'Link Purpose',
    wcagLevel: 'A',
    severity: 'minor',
    confidenceLevel: 'low',
    confidenceScore: 58,
    automatedResult: 'pass',
    automatedNotes: 'All links have descriptive text. Low confidence due to context-dependent link text.',
    status: 'verified_pass',
    history: [
      {
        id: 'h1',
        status: 'verified_pass',
        method: 'Manual Review',
        notes: 'Reviewed all links - context is clear',
        verifiedBy: 'John Doe',
        verifiedAt: '2024-12-15 10:30',
      },
    ],
  },
  {
    id: '6',
    criterionId: '3.1.1',
    criterionName: 'Language of Page',
    wcagLevel: 'A',
    severity: 'moderate',
    confidenceLevel: 'low',
    confidenceScore: 50,
    automatedResult: 'warning',
    automatedNotes: 'Page language is set but may not match actual content language.',
    status: 'deferred',
    history: [
      {
        id: 'h2',
        status: 'deferred',
        method: 'Manual Review',
        notes: 'Waiting for translation team input',
        verifiedBy: 'Jane Smith',
        verifiedAt: '2024-12-14 15:45',
      },
    ],
  },
];

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'serious', label: 'Serious' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor', label: 'Minor' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'low', label: 'Low Confidence' },
  { value: 'manual', label: 'Manual Required' },
];

const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified_pass', label: 'Verified' },
  { value: 'deferred', label: 'Deferred' },
];

const BULK_STATUSES: { value: VerificationStatus; label: string }[] = [
  { value: 'verified_pass', label: 'Verified Pass' },
  { value: 'verified_fail', label: 'Verified Fail' },
  { value: 'verified_partial', label: 'Verified Partial' },
  { value: 'deferred', label: 'Deferred' },
];

const VERIFICATION_METHODS: VerificationMethod[] = [
  'NVDA 2024.1',
  'JAWS 2024',
  'VoiceOver',
  'Manual Review',
  'Keyboard Only',
  'Axe DevTools',
  'WAVE',
];

export function VerificationQueue({ jobId, onComplete }: VerificationQueueProps) {
  const [filters, setFilters] = useState<VerificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<VerificationStatus>('verified_pass');
  const [bulkMethod, setBulkMethod] = useState<VerificationMethod>('Manual Review');
  const [bulkNotes, setBulkNotes] = useState('');
  const [localItems, setLocalItems] = useState<VerificationItemType[]>(mockItems);

  const { data: apiData, isLoading: isApiLoading, error: apiError } = useVerificationQueue(jobId, filters);
  const submitMutation = useSubmitVerification();
  const bulkMutation = useBulkVerification();

  const items = apiData?.items ?? localItems;
  const isLoading = isApiLoading && !apiError;
  const isSubmitting = submitMutation.isPending || bulkMutation.isPending;

  const bulkRequiresNotes = bulkStatus === 'verified_fail' || bulkStatus === 'verified_partial';
  const canBulkSubmit = selectedItems.size > 0 && (!bulkRequiresNotes || bulkNotes.trim().length > 0);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filters.severity?.length && !filters.severity.includes(item.severity)) {
        return false;
      }
      if (filters.confidenceLevel?.length && !filters.confidenceLevel.includes(item.confidenceLevel)) {
        return false;
      }
      if (filters.status?.length && !filters.status.includes(item.status)) {
        return false;
      }
      return true;
    });
  }, [items, filters]);

  const verifiedCount = items.filter(i => 
    i.status === 'verified_pass' || i.status === 'verified_fail' || i.status === 'verified_partial'
  ).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const handleSelectItem = (id: string, selected: boolean) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleSubmitVerification = async (
    itemId: string, 
    status: VerificationStatus, 
    method: VerificationMethod, 
    notes: string
  ) => {
    try {
      await submitMutation.mutateAsync({ itemId, status, method, notes });
    } catch {
      setLocalItems(prev => prev.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              status, 
              history: [...item.history, {
                id: `h-${Date.now()}`,
                status,
                method,
                notes,
                verifiedBy: 'Current User',
                verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              }]
            } 
          : item
      ));
    }
  };

  const handleBulkSubmit = async () => {
    if (!canBulkSubmit) return;
    
    const itemIds = Array.from(selectedItems);
    try {
      await bulkMutation.mutateAsync({ 
        itemIds, 
        status: bulkStatus, 
        method: bulkMethod, 
        notes: bulkNotes 
      });
    } catch {
      setLocalItems(prev => prev.map(item => 
        selectedItems.has(item.id)
          ? { 
              ...item, 
              status: bulkStatus, 
              history: [...item.history, {
                id: `h-${Date.now()}-${item.id}`,
                status: bulkStatus,
                method: bulkMethod,
                notes: bulkNotes,
                verifiedBy: 'Current User',
                verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
              }]
            } 
          : item
      ));
    }
    setSelectedItems(new Set());
    setBulkNotes('');
  };

  const toggleFilter = <T extends string>(
    filterKey: keyof VerificationFilters,
    value: T
  ) => {
    setFilters(prev => {
      const currentValues = (prev[filterKey] as T[] | undefined) || [];
      const newValues = currentValues.includes(value)
        ? currentValues.filter(v => v !== value)
        : [...currentValues, value];
      return { ...prev, [filterKey]: newValues.length > 0 ? newValues : undefined };
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-900">Verification Progress</h3>
          <span className="text-sm text-gray-600">{verifiedCount} of {totalCount} items verified</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">Job ID: {jobId}</p>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Verification Queue</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-b bg-gray-50 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Severity</p>
              <div className="flex flex-wrap gap-2">
                {SEVERITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleFilter('severity', opt.value)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full border transition-colors',
                      filters.severity?.includes(opt.value)
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Confidence Level</p>
              <div className="flex flex-wrap gap-2">
                {CONFIDENCE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleFilter('confidenceLevel', opt.value)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full border transition-colors',
                      filters.confidenceLevel?.includes(opt.value)
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleFilter('status', opt.value)}
                    className={cn(
                      'px-2 py-1 text-xs rounded-full border transition-colors',
                      filters.status?.includes(opt.value)
                        ? 'bg-primary-100 border-primary-300 text-primary-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {selectedItems.size > 0 && (
          <div className="px-4 py-3 border-b bg-blue-50">
            <div className="flex items-center gap-4 flex-wrap">
              <span className="text-sm font-medium text-blue-800">
                {selectedItems.size} item{selectedItems.size !== 1 ? 's' : ''} selected
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value as VerificationStatus)}
                  className="text-sm rounded border-gray-300"
                >
                  {BULK_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
                <select
                  value={bulkMethod}
                  onChange={(e) => setBulkMethod(e.target.value as VerificationMethod)}
                  className="text-sm rounded border-gray-300"
                >
                  {VERIFICATION_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={bulkNotes}
                    onChange={(e) => setBulkNotes(e.target.value)}
                    placeholder={bulkRequiresNotes ? "Notes required*" : "Notes..."}
                    className={cn(
                      "text-sm rounded border-gray-300 w-48",
                      bulkRequiresNotes && !bulkNotes.trim() && "border-red-300 placeholder-red-400"
                    )}
                  />
                  {bulkRequiresNotes && (
                    <span className="text-red-500 text-xs">*</span>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={handleBulkSubmit}
                  disabled={!canBulkSubmit || isSubmitting}
                  isLoading={isSubmitting}
                  className="flex items-center gap-1"
                >
                  <CheckSquare className="h-4 w-4" />
                  Apply to Selected
                </Button>
              </div>
            </div>
            {bulkRequiresNotes && !bulkNotes.trim() && (
              <p className="text-xs text-red-600 mt-2">Notes are required for Fail or Partial status</p>
            )}
          </div>
        )}

        <div className="px-4 py-2 border-b flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
            onChange={handleSelectAll}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            aria-label="Select all items"
          />
          <span className="text-sm text-gray-600">
            {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
          </span>
        </div>

        <div className="p-4 space-y-3">
          {filteredItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items match the current filters.</p>
          ) : (
            filteredItems.map((item) => (
              <VerificationItem
                key={item.id}
                item={item}
                isSelected={selectedItems.has(item.id)}
                onSelect={handleSelectItem}
                onSubmit={handleSubmitVerification}
                isSubmitting={isSubmitting}
              />
            ))
          )}
        </div>
      </div>

      {verifiedCount === totalCount && totalCount > 0 && (
        <div className="flex justify-center">
          <Button onClick={onComplete} size="lg">
            Complete Verification
          </Button>
        </div>
      )}
    </div>
  );
}
