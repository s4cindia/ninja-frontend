/**
 * StyleValidationPanel - orchestrates validation state, queries, and mutations.
 * Delegates rendering to ValidationHeader, ViolationFilters, and ViolationsList.
 *
 * Exports:
 *  - StyleCheckContent: embeddable content (for use inside ValidatorPanel)
 *  - StyleValidationPanel: standalone panel with outer wrapper (backward compat)
 */
import { useState, useEffect, useCallback } from 'react';
import { Download, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '@/utils/cn';
import { csvSafeEscape } from '@/utils/format';
import { ValidationHeader } from './ValidationHeader';
import { ViolationFilters, type FilterState } from './ViolationFilters';
import { ViolationsList } from './ViolationsList';
import {
  useViolations,
  useValidationSummary,
  useStartValidation,
  useApplyFix,
  useIgnoreViolation,
  useJobStatus,
  useRuleSets,
} from '@/hooks/useStyleValidation';
import { styleService } from '@/services/style.service';
import type { StyleViolation } from '@/types/style';

interface StyleCheckContentProps {
  documentId: string;
  onGoToLocation?: (text: string) => void;
  onApplyFix?: (originalText: string, fixText: string, source?: 'integrity' | 'plagiarism' | 'style') => void;
}

/** Embeddable style content without outer wrapper/header (for use inside ValidatorPanel). */
export function StyleCheckContent({ documentId, onGoToLocation, onApplyFix }: StyleCheckContentProps) {
  const [filters, setFilters] = useState<FilterState>({});
  const [showFilters, setShowFilters] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [selectedRuleSets, setSelectedRuleSets] = useState<string[]>(['general']);
  const [showRuleSetPicker, setShowRuleSetPicker] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingViolationId, setPendingViolationId] = useState<string | null>(null);

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

  const { data: summary, isLoading: isLoadingSummary, refetch: refetchSummary } = useValidationSummary(documentId);

  const { data: jobProgress } = useJobStatus(activeJobId, {
    refetchInterval: activeJobId ? 2000 : undefined,
  });

  const { data: ruleSetsData } = useRuleSets();

  const allRuleSets = ruleSetsData?.ruleSets || [];
  const builtInRuleSets = allRuleSets.filter(rs => rs.isBuiltIn);
  const customRuleSets = allRuleSets.filter(rs => !rs.isBuiltIn);

  // Mutations
  const startValidation = useStartValidation();
  const applyFix = useApplyFix(documentId);
  const ignoreViolation = useIgnoreViolation(documentId);

  // Clear active job when completed and refetch data
  useEffect(() => {
    if (jobProgress?.status === 'COMPLETED' || jobProgress?.status === 'FAILED') {
      setActiveJobId(null);
      refetchViolations();
      refetchSummary();
    }
  }, [jobProgress?.status, refetchViolations, refetchSummary]);

  const violations = violationsData?.violations || [];
  const totalViolations = violationsData?.total || 0;

  const handleStartValidation = async () => {
    setValidationError(null);

    try {
      const ruleSetIds = selectedRuleSets.length > 0 ? selectedRuleSets : ['general'];

      const result = await startValidation.mutateAsync({
        documentId,
        ruleSetIds,
        includeHouseRules: true,
        useAiValidation: true,
      });
      setActiveJobId(result.jobId);
    } catch (error: unknown) {
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
    if (onApplyFix && violation.originalText) {
      onApplyFix(violation.originalText, fixOption, 'style');
    }
    setPendingViolationId(violation.id);
    applyFix.mutate(
      { violationId: violation.id, fixOption },
      { onSettled: () => setPendingViolationId(null) }
    );
  };

  const handleIgnore = (violationId: string, reason?: string) => {
    setPendingViolationId(violationId);
    ignoreViolation.mutate(
      { violationId, reason },
      { onSettled: () => setPendingViolationId(null) }
    );
  };

  const handleNavigateToViolation = (violation: StyleViolation) => {
    if (!onGoToLocation) return;
    const cleanText = violation.originalText?.replace(/[\n\r]+/g, ' ').trim();
    if (cleanText && cleanText.length > 0) {
      onGoToLocation(cleanText);
    }
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

  const [downloading, setDownloading] = useState(false);

  const handleDownloadReport = useCallback(async () => {
    try {
      setDownloading(true);
      const all = await styleService.getViolations(documentId, { take: 1000 });
      const headers = ['#', 'Title', 'Category', 'Severity', 'Status', 'Original Text', 'Suggested Text', 'Description'];
      const rows = all.violations.map((v: StyleViolation, i: number) => [
        String(i + 1),
        csvSafeEscape(v.title || ''),
        csvSafeEscape(v.category || ''),
        csvSafeEscape(v.severity || ''),
        csvSafeEscape(v.status || ''),
        csvSafeEscape(v.originalText || ''),
        csvSafeEscape(v.suggestedText || ''),
        csvSafeEscape(v.description || ''),
      ].join(','));
      const csv = '\uFEFF' + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `style-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download report');
    } finally {
      setDownloading(false);
    }
  }, [documentId]);

  return (
    <>
      <ValidationHeader
        documentId={documentId}
        summary={summary}
        isValidating={isValidating}
        isStartPending={startValidation.isPending}
        jobProgress={jobProgress}
        validationError={validationError}
        onDismissError={() => setValidationError(null)}
        onStartValidation={handleStartValidation}
        selectedRuleSets={selectedRuleSets}
        setSelectedRuleSets={setSelectedRuleSets}
        showRuleSetPicker={showRuleSetPicker}
        setShowRuleSetPicker={setShowRuleSetPicker}
        builtInRuleSets={builtInRuleSets}
        customRuleSets={customRuleSets}
        allRuleSets={allRuleSets}
      />

      {!isValidating && summary && totalViolations > 0 && (
        <div className="flex justify-end px-4 py-1 border-b">
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
            onClick={handleDownloadReport}
            disabled={downloading}
            title="Download report"
          >
            {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span>Report</span>
          </button>
        </div>
      )}

      <ViolationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        summary={summary}
        isLoadingSummary={isLoadingSummary}
      />

      <ViolationsList
        violations={violations}
        totalViolations={totalViolations}
        isLoading={isLoadingViolations}
        isValidating={isValidating}
        hasActiveFilters={hasActiveFilters}
        summary={summary}
        onClearFilters={clearFilters}
        onApplyFix={handleApplyFix}
        onIgnore={handleIgnore}
        onNavigateToViolation={onGoToLocation ? handleNavigateToViolation : undefined}
        pendingViolationId={pendingViolationId}
        isApplyingFix={applyFix.isPending}
        isIgnoring={ignoreViolation.isPending}
      />
    </>
  );
}

interface StyleValidationPanelProps {
  documentId: string;
  onNavigateToViolation?: (violation: StyleViolation) => void;
  onApplyFixToDocument?: (violation: StyleViolation, fixText: string) => void;
  className?: string;
}

/** Standalone StyleValidationPanel (kept for backward compatibility). */
export function StyleValidationPanel({
  documentId,
  onNavigateToViolation,
  onApplyFixToDocument,
  className,
}: StyleValidationPanelProps) {
  return (
    <div className={cn('flex flex-col h-full bg-white border-l', className)}>
      <StyleCheckContent
        documentId={documentId}
        onGoToLocation={onNavigateToViolation
          ? (text) => {
              // Build a minimal violation object for the legacy callback
              onNavigateToViolation({ originalText: text } as StyleViolation);
            }
          : undefined}
        onApplyFix={onApplyFixToDocument
          ? (originalText, fixText) => {
              onApplyFixToDocument({ originalText } as StyleViolation, fixText);
            }
          : undefined}
      />
    </div>
  );
}

export default StyleValidationPanel;
