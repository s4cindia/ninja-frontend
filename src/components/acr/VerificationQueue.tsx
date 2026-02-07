import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Filter, CheckSquare } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { VerificationItem } from './VerificationItem';
import { CriterionDetailsModal } from './CriterionDetailsModal';
import { useVerificationQueue, useSubmitVerification, useBulkVerification } from '@/hooks/useVerification';
import { CONFIDENCE_THRESHOLD_HIGH, CONFIDENCE_THRESHOLDS, NA_QUICK_ACCEPT_THRESHOLD } from '@/constants/verification';
import { MOCK_VERIFICATION_ITEMS } from '@/constants/mockVerificationData';
import type { CriterionConfidence } from '@/services/api';
import type { 
  VerificationItem as VerificationItemType,
  VerificationStatus, 
  VerificationMethod,
  Severity,
  ConfidenceLevel,
  VerificationFilters,
  VerificationIssue,
  FixedVerificationIssue
} from '@/types/verification.types';

interface SavedVerification {
  status: string;
  method: string;
  notes: string;
  verifiedAt: string;
}

interface VerificationQueueProps {
  jobId: string;
  fileName?: string;
  onComplete: (verified: boolean) => void;
  savedVerifications?: { [itemId: string]: SavedVerification };
  onVerificationUpdate?: (itemId: string, status: string, method: string, notes: string) => void;
  criteriaFromAnalysis?: CriterionConfidence[];
}

function needsHumanVerification(c: CriterionConfidence): boolean {
  // Explicit verification flags take precedence
  if (c.needsVerification === true) return true;
  if (c.needsVerification === false) return false;

  // Include all criteria (N/A, low confidence, and high confidence) for human review
  // This allows users to spot-check high-confidence results and verify N/A suggestions
  return true;
}

function convertCriteriaToVerificationItems(
  criteria: CriterionConfidence[],
  savedVerifications?: { [itemId: string]: SavedVerification }
): VerificationItemType[] {
  const filtered = criteria.filter(needsHumanVerification);
  
  return filtered.map((c, index) => {
      const saved = savedVerifications?.[c.id];
      const score = typeof c.confidenceScore === 'number' ? c.confidenceScore : 0;
      const scorePercentage = Math.round(score * 100); // Convert 0-1 scale to percentage

      const confidenceLevel: ConfidenceLevel =
        score >= CONFIDENCE_THRESHOLDS.HIGH ? 'high' :
        score >= CONFIDENCE_THRESHOLDS.MEDIUM ? 'medium' :
        score > CONFIDENCE_THRESHOLDS.LOW ? 'low' : 'manual';
      
      const severity: Severity = 
        c.status === 'fail' ? 'critical' :
        score < 50 ? 'serious' :
        score < 70 ? 'moderate' : 'minor';

      const automatedResult: 'pass' | 'fail' | 'warning' | 'not_tested' = 
        c.status === 'pass' ? 'pass' :
        c.status === 'fail' ? 'fail' :
        c.status === 'not_tested' ? 'not_tested' : 'warning';

      const issues: VerificationIssue[] | undefined = c.relatedIssues?.map((issue) => ({
        id: issue.issueId,
        issueId: issue.issueId,
        ruleId: issue.ruleId,
        impact: issue.impact,
        message: issue.message,
        severity: issue.impact as Severity | undefined,
        location: issue.location,
        filePath: issue.filePath,
        html: issue.htmlSnippet,
        htmlSnippet: issue.htmlSnippet,
        suggestedFix: issue.suggestedFix,
      }));

      const fixedIssues: FixedVerificationIssue[] | undefined = c.fixedIssues?.map((issue) => ({
        id: issue.issueId,
        issueId: issue.issueId,
        ruleId: issue.ruleId,
        impact: issue.impact,
        message: issue.message,
        severity: issue.impact as Severity | undefined,
        location: issue.location,
        filePath: issue.filePath,
        html: issue.htmlSnippet,
        htmlSnippet: issue.htmlSnippet,
        suggestedFix: issue.suggestedFix,
        fixedAt: issue.fixedAt,
        fixMethod: issue.fixMethod,
      }));

      const remainingCount = c.remainingCount ?? issues?.length ?? 0;
      const fixedCount = c.fixedCount ?? fixedIssues?.length ?? 0;
      const totalIssueCount = remainingCount + fixedCount;

      // Use N/A suggestion confidence if available, otherwise use ACR analysis confidence
      const displayConfidence = c.naSuggestion?.confidence ?? scorePercentage;

      let automatedNotesWithIssues: string;
      if (totalIssueCount > 0) {
        const parts: string[] = [];
        if (remainingCount > 0) {
          parts.push(`${remainingCount} issue${remainingCount !== 1 ? 's' : ''} remaining`);
        }
        if (fixedCount > 0) {
          parts.push(`${fixedCount} fixed`);
        }
        automatedNotesWithIssues = parts.join(', ') + '. ' + (c.remarks || '');
      } else {
        automatedNotesWithIssues = c.remarks || `Automated analysis flagged this criterion for human review. Confidence: ${displayConfidence}%`;
      }

      const baseItem: VerificationItemType = {
        id: c.id || `criterion-${index}`,
        criterionId: c.criterionId || `Unknown-${index}`,
        criterionName: c.name || 'Unknown Criterion',
        wcagLevel: c.level || 'A',
        severity,
        confidenceLevel,
        confidenceScore: displayConfidence,
        automatedResult,
        automatedNotes: automatedNotesWithIssues,
        status: 'pending',
        history: [],
        issues: issues && issues.length > 0 ? issues : undefined,
        fixedIssues: fixedIssues && fixedIssues.length > 0 ? fixedIssues : undefined,
        fixedCount,
        remainingCount,
        naSuggestion: c.naSuggestion,
      };

      if (saved) {
        return {
          ...baseItem,
          status: saved.status as VerificationStatus,
          history: [{
            id: `h-saved-${c.id}`,
            status: saved.status as VerificationStatus,
            method: saved.method as VerificationMethod,
            notes: saved.notes,
            verifiedBy: 'Current User',
            verifiedAt: saved.verifiedAt,
          }],
        };
      }

      return baseItem;
    });
}

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: 'critical', label: 'Critical' },
  { value: 'serious', label: 'Serious' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'minor', label: 'Minor' },
];

const CONFIDENCE_OPTIONS: { value: ConfidenceLevel; label: string }[] = [
  { value: 'low', label: 'LOW' },
  { value: 'manual', label: 'MANUAL_REQUIRED' },
];

const STATUS_OPTIONS: { value: VerificationStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified_pass', label: 'Verified' },
  { value: 'deferred', label: 'Deferred' },
];

const BULK_STATUSES: { value: VerificationStatus; label: string }[] = [
  { value: 'verified_pass', label: 'Verified Pass' },
  { value: 'verified_fail', label: 'Verified Fail' },
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

export function VerificationQueue({ jobId, fileName, onComplete, savedVerifications, onVerificationUpdate, criteriaFromAnalysis }: VerificationQueueProps) {
  const [filters, setFilters] = useState<VerificationFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState<VerificationStatus>('verified_pass');
  const [bulkMethod, setBulkMethod] = useState<VerificationMethod>('Manual Review');
  const [bulkNotes, setBulkNotes] = useState('');
  const [selectedCriterionForGuidance, setSelectedCriterionForGuidance] = useState<CriterionConfidence | null>(null);
  
  const hasCriteriaFromAnalysis = criteriaFromAnalysis && criteriaFromAnalysis.length > 0;
  
  const [localItems, setLocalItems] = useState<VerificationItemType[]>(() => {
    if (hasCriteriaFromAnalysis) {
      return convertCriteriaToVerificationItems(criteriaFromAnalysis, savedVerifications);
    }
    if (savedVerifications && Object.keys(savedVerifications).length > 0) {
      return MOCK_VERIFICATION_ITEMS.map(item => {
        const saved = savedVerifications[item.id];
        if (saved) {
          return {
            ...item,
            status: saved.status as VerificationStatus,
            history: [...item.history, {
              id: `h-saved-${item.id}`,
              status: saved.status as VerificationStatus,
              method: saved.method as VerificationMethod,
              notes: saved.notes,
              verifiedBy: 'Current User',
              verifiedAt: saved.verifiedAt,
            }],
          };
        }
        return item;
      });
    }
    return MOCK_VERIFICATION_ITEMS;
  });
  const [useMockData, setUseMockData] = useState(!hasCriteriaFromAnalysis);

  const { data: apiData, isLoading, error } = useVerificationQueue(jobId, filters);
  const submitMutation = useSubmitVerification();
  const bulkMutation = useBulkVerification();

  const [useLocalItems, setUseLocalItems] = useState(hasCriteriaFromAnalysis);

  // Track if we've done initial conversion to avoid resetting verified items
  // Using useRef instead of useState to avoid race conditions and unnecessary re-renders
  const hasInitializedRef = useRef(false);
  
  useEffect(() => {
    if (criteriaFromAnalysis && criteriaFromAnalysis.length > 0) {
      const converted = convertCriteriaToVerificationItems(criteriaFromAnalysis, savedVerifications);
      
      // Merge issues from API data if available
      let mergedItems = converted;
      if (apiData?.items && apiData.items.length > 0) {
        const apiItemMap = new Map(apiData.items.map(item => [item.criterionId, item]));
        mergedItems = converted.map(item => {
          const apiItem = apiItemMap.get(item.criterionId);
          if (apiItem) {
            return {
              ...item,
              issues: apiItem.issues || item.issues,
              fixedIssues: apiItem.fixedIssues || item.fixedIssues,
              remainingCount: apiItem.remainingCount ?? item.remainingCount,
              fixedCount: apiItem.fixedCount ?? item.fixedCount,
            };
          }
          return item;
        });
      }
      
      // If already initialized, preserve existing verification status
      if (hasInitializedRef.current) {
        setLocalItems(prev => {
          const existingMap = new Map(prev.map(item => [item.id, item]));
          return mergedItems.map(item => {
            const existing = existingMap.get(item.id);
            if (existing && existing.status !== 'pending') {
              // Preserve verified status and history from local state
              return {
                ...item,
                status: existing.status,
                history: existing.history,
              };
            }
            return item;
          });
        });
      } else {
        setLocalItems(mergedItems);
        hasInitializedRef.current = true;
      }
      setUseLocalItems(true);
    }
  }, [criteriaFromAnalysis, savedVerifications, apiData]);

  useEffect(() => {
    if (hasCriteriaFromAnalysis || useLocalItems) return;
    if (error) {
      console.warn('Verification API unavailable, using mock data');
      setUseMockData(true);
    } else if (apiData?.items !== undefined) {
      setUseMockData(false);
      setLocalItems(apiData.items);
    }
  }, [apiData, error, hasCriteriaFromAnalysis, useLocalItems]);

  const items = useMemo(() => 
    useLocalItems || useMockData ? localItems : (apiData?.items ?? []),
    [useLocalItems, useMockData, localItems, apiData?.items]
  );
  const isSubmitting = submitMutation.isPending || bulkMutation.isPending;

  const bulkRequiresNotes = bulkStatus === 'verified_fail' || bulkStatus === 'verified_partial';
  const canBulkSubmit = selectedItems.size > 0 && (!bulkRequiresNotes || bulkNotes.trim().length > 0);

  // Count high-confidence N/A suggestions among selected items
  const selectedHighConfidenceNACount = useMemo(() => {
    return items.filter(item =>
      selectedItems.has(item.id) &&
      item.naSuggestion?.suggestedStatus === 'not_applicable' &&
      item.naSuggestion.confidence >= NA_QUICK_ACCEPT_THRESHOLD
    ).length;
  }, [items, selectedItems]);

  const filteredItems = useMemo(() => {
    if (!useMockData) return items;
    return items.filter((item) => {
      if (filters.severity?.length && !filters.severity.includes(item.severity)) {
        return false;
      }
      if (filters.confidenceLevel?.length && !filters.confidenceLevel.includes(item.confidenceLevel)) {
        return false;
      }
      if (filters.status?.length) {
        const statusMatches = filters.status.some(filterStatus => {
          if ((filterStatus as string) === 'verified') {
            return item.status.startsWith('verified_');
          }
          return item.status === filterStatus;
        });
        if (!statusMatches) {
          return false;
        }
      }
      return true;
    });
  }, [items, filters, useMockData]);

  // Memoize verification count to prevent unnecessary recalculations
  const verifiedCount = useMemo(() => {
    return items.filter(i => 
      i.status === 'verified_pass' || i.status === 'verified_fail' || i.status === 'verified_partial'
    ).length;
  }, [items]);
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

  const criteriaMap = useMemo(() => {
    const map = new Map<string, CriterionConfidence>();
    if (criteriaFromAnalysis) {
      criteriaFromAnalysis.forEach((c) => {
        map.set(c.id, c);
      });
    }
    return map;
  }, [criteriaFromAnalysis]);

  const handleViewGuidance = useCallback((itemId: string) => {
    let criterion = criteriaMap.get(itemId);
    
    if (!criterion) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        criterion = {
          id: item.id,
          criterionId: item.criterionId,
          name: item.criterionName,
          level: item.wcagLevel,
          status: item.automatedResult === 'pass' ? 'pass' : 
                  item.automatedResult === 'fail' ? 'fail' : 'not_tested',
          confidenceScore: item.confidenceScore,
          remarks: item.automatedNotes,
          needsVerification: true,
          automatedChecks: [],
          manualChecks: [],
        };
      }
    }
    
    if (criterion) {
      setSelectedCriterionForGuidance(criterion);
    }
  }, [criteriaMap, items]);

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
    // Update local items when using mock data OR when using criteria from analysis
    if (useMockData || useLocalItems || hasCriteriaFromAnalysis) {
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
      onVerificationUpdate?.(itemId, status, method, notes);
    } else {
      await submitMutation.mutateAsync({ itemId, status, method, notes });
    }
  };

  const handleBulkSubmit = async () => {
    if (!canBulkSubmit) return;

    const itemIds = Array.from(selectedItems);
    // Update local items when using mock data OR when using criteria from analysis
    if (useMockData || useLocalItems || hasCriteriaFromAnalysis) {
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
      itemIds.forEach(itemId => {
        onVerificationUpdate?.(itemId, bulkStatus, bulkMethod, bulkNotes);
      });
    } else {
      await bulkMutation.mutateAsync({
        itemIds,
        status: bulkStatus,
        method: bulkMethod,
        notes: bulkNotes
      });
    }
    setSelectedItems(new Set());
    setBulkNotes('');
  };

  const handleBulkAcceptNA = async () => {
    const highConfidenceNAItems = items.filter(item =>
      selectedItems.has(item.id) &&
      item.naSuggestion?.suggestedStatus === 'not_applicable' &&
      item.naSuggestion.confidence >= NA_QUICK_ACCEPT_THRESHOLD
    );

    if (highConfidenceNAItems.length === 0) return;

    // Update local items when using mock data OR when using criteria from analysis
    if (useMockData || useLocalItems || hasCriteriaFromAnalysis) {
      setLocalItems(prev => prev.map(item => {
        const suggestion = item.naSuggestion;
        if (selectedItems.has(item.id) && suggestion?.suggestedStatus === 'not_applicable' && suggestion.confidence >= 80) {
          const naNote = `AI-suggested Not Applicable (${suggestion.confidence}% confidence): ${suggestion.rationale}`;
          return {
            ...item,
            status: 'verified_pass' as VerificationStatus,
            history: [...item.history, {
              id: `h-${Date.now()}-${item.id}`,
              status: 'verified_pass' as VerificationStatus,
              method: 'Manual Review' as VerificationMethod,
              notes: naNote,
              verifiedBy: 'Current User',
              verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            }]
          };
        }
        return item;
      }));
      highConfidenceNAItems.forEach(item => {
        const naNote = `AI-suggested Not Applicable (${item.naSuggestion?.confidence}% confidence): ${item.naSuggestion?.rationale}`;
        onVerificationUpdate?.(item.id, 'verified_pass', 'Manual Review', naNote);
      });
    } else {
      // For API-based flow, submit all with proper error handling
      const results = await Promise.allSettled(
        highConfidenceNAItems.map(item => {
          const naNote = `AI-suggested Not Applicable (${item.naSuggestion?.confidence}% confidence): ${item.naSuggestion?.rationale}`;
          return submitMutation.mutateAsync({
            itemId: item.id,
            status: 'verified_pass',
            method: 'Manual Review',
            notes: naNote
          });
        })
      );

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (failed > 0) {
        console.warn(`[Bulk N/A Accept] ${succeeded} succeeded, ${failed} failed out of ${highConfidenceNAItems.length} items`);
        // TODO: Show toast notification with success/failure counts
      }
    }
    setSelectedItems(new Set());
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

  if (isLoading && !useMockData) {
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
        <div className="flex items-center justify-between mt-2">
          <div className="flex flex-col gap-0.5">
            {fileName && (
              <p className="text-sm font-medium text-gray-700">{fileName}</p>
            )}
            <p className="text-xs text-gray-500">Job ID: {jobId}</p>
          </div>
          {useMockData && !useLocalItems && (
            <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded">Demo Mode</span>
          )}
        </div>
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
                {selectedHighConfidenceNACount > 0 && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleBulkAcceptNA}
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <CheckSquare className="h-4 w-4" />
                    Quick Accept {selectedHighConfidenceNACount} N/A
                  </Button>
                )}
              </div>
            </div>
            {bulkRequiresNotes && !bulkNotes.trim() && (
              <p className="text-xs text-red-600 mt-2">Notes are required for Fail status</p>
            )}
            {selectedHighConfidenceNACount > 0 && selectedHighConfidenceNACount < selectedItems.size && (
              <p className="text-xs text-blue-700 mt-2 bg-blue-50 px-2 py-1 rounded">
                {selectedHighConfidenceNACount} of {selectedItems.size} selected items have high-confidence (≥80%) N/A suggestions
              </p>
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
                onViewGuidance={handleViewGuidance}
              />
            ))
          )}
        </div>
      </div>

      {/* Action buttons - always visible */}
      <div className="bg-white rounded-lg border p-4 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {verifiedCount === totalCount && totalCount > 0 ? (
            <span className="text-green-600 font-medium">All items verified! Ready to proceed.</span>
          ) : (
            <span>{verifiedCount} of {totalCount} items verified</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => onComplete(false)}
          >
            Skip & Continue
          </Button>
          <Button
            onClick={() => onComplete(true)}
            disabled={verifiedCount !== totalCount || totalCount === 0}
          >
            Complete Verification
          </Button>
        </div>
      </div>

      {/* Criterion Guidance Modal */}
      {selectedCriterionForGuidance && (
        <CriterionDetailsModal
          criterion={selectedCriterionForGuidance}
          isOpen={!!selectedCriterionForGuidance}
          onClose={() => setSelectedCriterionForGuidance(null)}
          jobId={jobId}
        />
      )}
    </div>
  );
}
