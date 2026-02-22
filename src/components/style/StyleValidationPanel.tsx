/**
 * StyleValidationPanel Component
 *
 * Side panel for style validation that integrates with OnlyOffice editor
 */

import { useState, useMemo } from 'react';
import {
  Play,
  RefreshCw,
  Filter,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { ViolationCard } from './ViolationCard';
import {
  useViolations,
  useValidationSummary,
  useStartValidation,
  useApplyFix,
  useIgnoreViolation,
  useJobStatus,
  useRuleSets,
} from '@/hooks/useStyleValidation';
import type { StyleViolation, StyleCategory, StyleSeverity, ViolationStatus } from '@/types/style';

interface StyleValidationPanelProps {
  documentId: string;
  onNavigateToViolation?: (violation: StyleViolation) => void;
  onApplyFixToDocument?: (violation: StyleViolation, fixText: string) => void;
  className?: string;
}

interface FilterState {
  category?: StyleCategory;
  severity?: StyleSeverity;
  status?: ViolationStatus;
  search?: string;
}

const categoryOptions: { value: StyleCategory; label: string }[] = [
  { value: 'PUNCTUATION', label: 'Punctuation' },
  { value: 'CAPITALIZATION', label: 'Capitalization' },
  { value: 'NUMBERS', label: 'Numbers' },
  { value: 'ABBREVIATIONS', label: 'Abbreviations' },
  { value: 'HYPHENATION', label: 'Hyphenation' },
  { value: 'SPELLING', label: 'Spelling' },
  { value: 'GRAMMAR', label: 'Grammar' },
  { value: 'TERMINOLOGY', label: 'Terminology' },
  { value: 'FORMATTING', label: 'Formatting' },
  { value: 'CITATIONS', label: 'Citations' },
  { value: 'OTHER', label: 'Other' },
];

const severityOptions: { value: StyleSeverity; label: string; icon: React.ElementType }[] = [
  { value: 'ERROR', label: 'Errors', icon: AlertCircle },
  { value: 'WARNING', label: 'Warnings', icon: AlertTriangle },
  { value: 'SUGGESTION', label: 'Suggestions', icon: Info },
];

const statusOptions: { value: ViolationStatus; label: string }[] = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'IGNORED', label: 'Ignored' },
  { value: 'WONT_FIX', label: "Won't Fix" },
  { value: 'AUTO_FIXED', label: 'Auto-Fixed' },
];

export function StyleValidationPanel({
  documentId,
  onNavigateToViolation,
  onApplyFixToDocument,
  className,
}: StyleValidationPanelProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedRuleSets, setSelectedRuleSets] = useState<string[]>(['general']);
  const [showRuleSetPicker, setShowRuleSetPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Queries
  const { data: violationsData, isLoading: isLoadingViolations, refetch: refetchViolations } = useViolations(
    documentId,
    {
      category: filters.category,
      severity: filters.severity,
      status: filters.status,
      search: filters.search,
    }
  );

  const { data: summary, isLoading: isLoadingSummary } = useValidationSummary(documentId);

  const { data: jobProgress } = useJobStatus(activeJobId, {
    refetchInterval: activeJobId ? 2000 : undefined,
  });

  const { data: ruleSetsData } = useRuleSets();

  // All rule sets now come from useRuleSets() with isBuiltIn flag
  const allRuleSets = ruleSetsData?.ruleSets || [];
  const builtInRuleSets = allRuleSets.filter(rs => rs.isBuiltIn);
  const customRuleSets = allRuleSets.filter(rs => !rs.isBuiltIn);

  // Mutations
  const startValidation = useStartValidation();
  const applyFix = useApplyFix(documentId);
  const ignoreViolation = useIgnoreViolation(documentId);

  // Clear active job when completed
  useMemo(() => {
    if (jobProgress?.status === 'COMPLETED' || jobProgress?.status === 'FAILED') {
      setActiveJobId(null);
      refetchViolations();
    }
  }, [jobProgress?.status, refetchViolations]);

  const violations = violationsData?.violations || [];
  const totalViolations = violationsData?.total || 0;

  const handleStartValidation = async () => {
    setValidationError(null);

    try {
      // Always include 'general' rule set if nothing else selected
      const ruleSetIds = selectedRuleSets.length > 0 ? selectedRuleSets : ['general'];

      const result = await startValidation.mutateAsync({
        documentId,
        ruleSetIds,
        includeHouseRules: true,
        useAiValidation: true,
      });
      setActiveJobId(result.jobId);
    } catch (error: unknown) {
      console.error('Failed to start validation:', error);

      // Extract error message
      let errorMessage = 'Failed to start validation.';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: { message?: string; code?: string } } } };
        if (axiosError.response?.data?.error?.message) {
          errorMessage = axiosError.response.data.error.message;
        }
        if (axiosError.response?.data?.error?.code === 'NO_CONTENT') {
          errorMessage = 'Document has no text content. Please save the document first (Ctrl+S in the editor) and try again.';
        }
        if (axiosError.response?.data?.error?.code === 'DOCUMENT_NOT_FOUND') {
          errorMessage = 'Document not found. This document may not be properly synced. Try saving and reopening it.';
        }
      }

      setValidationError(errorMessage);
    }
  };

  const handleApplyFix = (violation: StyleViolation, fixOption: string) => {
    // First, apply the fix in the document (if callback provided)
    if (onApplyFixToDocument) {
      onApplyFixToDocument(violation, fixOption);
    }
    // Then update the database status
    applyFix.mutate({ violationId: violation.id, fixOption });
  };

  const handleIgnore = (violationId: string, reason?: string) => {
    ignoreViolation.mutate({ violationId, reason });
  };

  const handleFilterChange = (key: keyof FilterState, value: string | undefined) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  const isValidating = activeJobId !== null && jobProgress?.status !== 'COMPLETED' && jobProgress?.status !== 'FAILED';

  return (
    <div className={cn('flex flex-col h-full bg-white border-l', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Style Validation</h2>
          <Button
            size="sm"
            variant="primary"
            onClick={handleStartValidation}
            isLoading={startValidation.isPending || isValidating}
            leftIcon={isValidating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
        </div>

        {/* Document Info */}
        <div className="mt-2 text-xs text-gray-500">
          Document ID: <span className="font-mono">{documentId.slice(0, 8)}...</span>
        </div>

        {/* Rule Set Picker */}
        <div className="mt-2">
          <button
            onClick={() => setShowRuleSetPicker(!showRuleSetPicker)}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            {selectedRuleSets.length > 0
              ? selectedRuleSets.includes('general')
                ? 'General Quality' + (selectedRuleSets.length > 1 ? ` + ${selectedRuleSets.length - 1} more` : '')
                : `${selectedRuleSets.length} rule set(s) selected`
              : 'General Quality (default)'}
            <ChevronDown className={cn('h-4 w-4 transition-transform', showRuleSetPicker && 'rotate-180')} />
          </button>
          {showRuleSetPicker && allRuleSets.length > 0 && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md space-y-2">
              {/* Built-in Rule Sets */}
              {builtInRuleSets.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Built-in Rule Sets</p>
                  <div className="space-y-1">
                    {builtInRuleSets.map((rs) => (
                      <label key={rs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRuleSets.includes(rs.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRuleSets((prev) => [...prev, rs.id]);
                            } else {
                              setSelectedRuleSets((prev) => prev.filter((id) => id !== rs.id));
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{rs.name}</span>
                        <span className="text-xs text-gray-500">({rs.ruleCount} rules)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Rule Sets */}
              {customRuleSets.length > 0 && (
                <div className={builtInRuleSets.length > 0 ? 'pt-2 border-t border-gray-200' : ''}>
                  <p className="text-xs font-medium text-gray-500 mb-1">Your Custom Rule Sets</p>
                  <div className="space-y-1">
                    {customRuleSets.map((rs) => (
                      <label key={rs.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedRuleSets.includes(rs.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRuleSets((prev) => [...prev, rs.id]);
                            } else {
                              setSelectedRuleSets((prev) => prev.filter((id) => id !== rs.id));
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-gray-700">{rs.name}</span>
                        {rs.styleGuide && (
                          <span className="text-xs px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded">
                            {rs.styleGuide}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">({rs.ruleCount} rules)</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {allRuleSets.length === 0 && (
                <p className="text-xs text-gray-500 italic">No rule sets available.</p>
              )}
            </div>
          )}
        </div>

        {/* Validation Progress */}
        {isValidating && jobProgress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
              <span>{jobProgress.currentPhase || 'Processing...'}</span>
              <span>{jobProgress.progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 transition-all duration-300"
                style={{ width: `${jobProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {jobProgress.violationsFound} violations found
            </p>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700">{validationError}</p>
                <button
                  onClick={() => setValidationError(null)}
                  className="text-xs text-red-600 hover:text-red-800 mt-1"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Help tip */}
        {!isValidating && !validationError && !summary && (
          <div className="mt-3 p-2 bg-blue-50 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Tip:</strong> Save your document (Ctrl+S) before validating to ensure all changes are checked.
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {summary && !isLoadingSummary && (
        <div className="flex-shrink-0 border-b px-4 py-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.ERROR || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.WARNING || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Warnings</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-blue-600">
                <Info className="h-4 w-4" />
                <span className="text-lg font-semibold">{summary.bySeverity.SUGGESTION || 0}</span>
              </div>
              <p className="text-xs text-gray-500">Suggestions</p>
            </div>
          </div>
          {summary.totalViolations > 0 && (
            <div className="mt-3 flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{summary.byStatus.FIXED || 0} fixed</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <span>{summary.byStatus.PENDING || 0} pending</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'flex items-center gap-2 text-sm',
              hasActiveFilters ? 'text-primary-600' : 'text-gray-600',
              'hover:text-gray-900'
            )}
          >
            <Filter className="h-4 w-4" />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-gray-500 hover:text-gray-700">
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="mt-3 space-y-3">
            {/* Category filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value as StyleCategory)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All categories</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
              <div className="flex gap-2">
                {severityOptions.map((opt) => {
                  const Icon = opt.icon;
                  const isActive = filters.severity === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleFilterChange('severity', isActive ? undefined : opt.value)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary-100 text-primary-700 border border-primary-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value as ViolationStatus)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All statuses</option>
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Search</label>
              <input
                type="text"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search violations..."
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Violations List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {isLoadingViolations || isValidating ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            <p className="mt-4 text-sm text-gray-600">
              {isValidating ? 'Running style validation...' : 'Loading results...'}
            </p>
          </div>
        ) : violations.length === 0 ? (
          <div className="text-center py-12">
            {/* Only show "No Issues Found" if job is COMPLETED and totalViolations is 0 */}
            {summary?.status === 'COMPLETED' && summary?.totalViolations === 0 ? (
              <>
                <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Issues Found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  This document passes all style validation checks.
                </p>
              </>
            ) : hasActiveFilters ? (
              <>
                <Filter className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Matching Issues</h3>
                <p className="mt-2 text-sm text-gray-500">
                  No violations match the current filters.
                </p>
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <Info className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Validation Results</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Click &quot;Validate&quot; to check this document for style issues.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-500">
              Showing {violations.length} of {totalViolations} violations
            </p>
            {violations.map((violation) => (
              <ViolationCard
                key={violation.id}
                violation={violation}
                onApplyFix={handleApplyFix}
                onIgnore={handleIgnore}
                onNavigate={onNavigateToViolation}
                isApplying={applyFix.isPending}
                isIgnoring={ignoreViolation.isPending}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export default StyleValidationPanel;
