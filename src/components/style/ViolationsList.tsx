/**
 * ViolationsList Component
 *
 * Renders the list of style violations with loading, empty,
 * and populated states.
 */

import {
  Filter,
  CheckCircle,
  Info,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ViolationCard } from './ViolationCard';
import type { StyleViolation, ValidationSummary } from '@/types/style';

interface ViolationsListProps {
  violations: StyleViolation[];
  totalViolations: number;
  isLoading: boolean;
  isValidating: boolean;
  hasActiveFilters: boolean;
  summary: ValidationSummary | undefined;
  onClearFilters: () => void;
  onApplyFix: (violation: StyleViolation, fixOption: string) => void;
  onIgnore: (violationId: string, reason?: string) => void;
  onNavigateToViolation?: (violation: StyleViolation) => void;
  pendingViolationId: string | null;
  isApplyingFix: boolean;
  isIgnoring: boolean;
}

export function ViolationsList({
  violations,
  totalViolations,
  isLoading,
  isValidating,
  hasActiveFilters,
  summary,
  onClearFilters,
  onApplyFix,
  onIgnore,
  onNavigateToViolation,
  pendingViolationId,
  isApplyingFix,
  isIgnoring,
}: ViolationsListProps) {
  if (isLoading || isValidating) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          <p className="mt-4 text-sm text-gray-600">
            {isValidating ? 'Running style validation...' : 'Loading results...'}
          </p>
        </div>
      </div>
    );
  }

  if (violations.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="text-center py-12">
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
              <Button variant="outline" size="sm" onClick={onClearFilters} className="mt-4">
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
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
      <p className="text-xs text-gray-500">
        Showing {violations.length} of {totalViolations} violations
      </p>
      {violations.map((violation) => (
        <ViolationCard
          key={violation.id}
          violation={violation}
          onApplyFix={onApplyFix}
          onIgnore={onIgnore}
          onNavigate={onNavigateToViolation}
          isApplying={pendingViolationId === violation.id && isApplyingFix}
          isIgnoring={pendingViolationId === violation.id && isIgnoring}
        />
      ))}
    </div>
  );
}
