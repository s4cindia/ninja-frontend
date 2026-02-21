# Phase 4: Visual Comparison - Frontend Implementation Prompts

**Project:** Ninja Platform - Visual Comparison Feature
**Date:** February 15, 2026
**Version:** 1.0

This document contains detailed Replit prompts for implementing the Visual Comparison feature frontend, organized by task. Each prompt is copy-paste ready with complete code examples.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Frontend Prompts](#frontend-prompts)
  - [Task F1: Types & API Service](#task-f1-types--api-service)
  - [Task F2: React Query Hooks](#task-f2-react-query-hooks)
  - [Task F3: Base UI Components](#task-f3-base-ui-components)
  - [Task F4: XML Diff Viewer](#task-f4-xml-diff-viewer)
  - [Task F5: Page Integration & Route](#task-f5-page-integration--route)
- [Testing Guidelines](#testing-guidelines)
- [Common Pitfalls](#common-pitfalls)

---

## Overview

The Visual Comparison feature allows users to review remediation changes side-by-side with XML diff visualization, filtering, and navigation. This feature is Phase 4 of the PDF accessibility sprint.

**Key Features:**
- Side-by-side XML diff viewer with syntax highlighting
- Filter changes by type, severity, status
- Navigate between changes (prev/next)
- Export comparison report to PDF (Phase 2)
- Change review/approval workflow (Phase 3)

**Technical Stack:**
- React 18 + TypeScript
- TanStack Query (React Query) for data fetching
- react-diff-viewer-continued for diff visualization
- Prism.js for XML syntax highlighting
- Tailwind CSS for styling

---

## Prerequisites

### Install Dependencies

```bash
npm install react-diff-viewer-continued prismjs
npm install --save-dev @types/prismjs
```

### Verify Existing Dependencies

These should already be installed:
- `@tanstack/react-query` (React Query)
- `axios` (HTTP client)
- `lucide-react` (icons)
- `clsx` (classnames utility)

---

# Frontend Prompts

## Task F1: Types & API Service

**Estimated Time:** 2 hours

### PROMPT FOR REPLIT

```
Context:
I'm working on the Ninja Frontend (React/TypeScript/Vite) to implement the Visual Comparison feature. I need to create TypeScript type definitions and an API service for fetching comparison data from the backend.

Task:
Create type definitions and API service functions for the Visual Comparison feature.

Requirements:

1. Create Type Definitions (src/types/comparison.ts):

Copy these types exactly from the API contract:

---FILE: src/types/comparison.ts---
/**
 * Visual Comparison Types
 * These types MUST match the backend API contract exactly.
 * See: PHASE4_API_CONTRACT.md
 */

/**
 * Status of a remediation change
 */
export enum ChangeStatus {
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
  REVERTED = 'REVERTED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

/**
 * Type of remediation change
 */
export enum ChangeType {
  METADATA_UPDATE = 'METADATA_UPDATE',
  TAG_FIX = 'TAG_FIX',
  ALT_TEXT_ADD = 'ALT_TEXT_ADD',
  LANGUAGE_SET = 'LANGUAGE_SET',
  HEADING_FIX = 'HEADING_FIX',
  TABLE_FIX = 'TABLE_FIX',
  LINK_FIX = 'LINK_FIX',
  COLOR_CONTRAST = 'COLOR_CONTRAST',
  FORM_LABEL = 'FORM_LABEL',
  OTHER = 'OTHER',
}

/**
 * Severity level for accessibility issues
 */
export enum Severity {
  CRITICAL = 'CRITICAL',
  SERIOUS = 'SERIOUS',
  MODERATE = 'MODERATE',
  MINOR = 'MINOR',
}

/**
 * Individual remediation change record
 */
export interface RemediationChange {
  id: string;
  jobId: string;
  changeNumber: number;
  filePath: string;
  changeType: ChangeType;
  description: string;
  beforeContent: string | null;
  afterContent: string | null;
  severity: Severity | null;
  wcagCriteria: string | null;
  status: ChangeStatus;
  appliedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewComment: string | null;
}

/**
 * Summary report for all changes in a job
 */
export interface ComparisonReport {
  id: string;
  jobId: string;
  totalChanges: number;
  appliedCount: number;
  rejectedCount: number;
  revertedCount: number;
  reportData: ComparisonReportData | null;
  pdfUrl: string | null;
  generatedAt: string;
}

/**
 * Grouped statistics for the comparison report
 */
export interface ComparisonReportData {
  byType: Record<ChangeType, number>;
  bySeverity: Record<Severity, number>;
  byStatus: Record<ChangeStatus, number>;
  wcagCoverage: Array<{
    criteria: string;
    changeCount: number;
  }>;
}

/**
 * Full comparison data response
 */
export interface ComparisonData {
  report: ComparisonReport;
  changes: RemediationChange[];
}

/**
 * Filter parameters for querying changes
 */
export interface ChangeFilters {
  types?: ChangeType[];
  severities?: Severity[];
  statuses?: ChangeStatus[];
  page?: number;
  limit?: number;
}

/**
 * Paginated response for filtered changes
 */
export interface PaginatedChanges {
  report: ComparisonReport;
  changes: RemediationChange[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

/**
 * Request body for rejecting a change (Phase 3)
 */
export interface RejectChangeRequest {
  comment?: string;
}

/**
 * Request body for rolling back a change (Phase 3)
 */
export interface RollbackChangeRequest {
  reason: string;
}

/**
 * Success response wrapper
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Generic API response
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Display labels for enums (for UI rendering)
export const ChangeTypeLabels: Record<ChangeType, string> = {
  [ChangeType.METADATA_UPDATE]: 'Metadata Update',
  [ChangeType.TAG_FIX]: 'Tag Fix',
  [ChangeType.ALT_TEXT_ADD]: 'Alt Text Added',
  [ChangeType.LANGUAGE_SET]: 'Language Set',
  [ChangeType.HEADING_FIX]: 'Heading Fix',
  [ChangeType.TABLE_FIX]: 'Table Fix',
  [ChangeType.LINK_FIX]: 'Link Fix',
  [ChangeType.COLOR_CONTRAST]: 'Color Contrast',
  [ChangeType.FORM_LABEL]: 'Form Label',
  [ChangeType.OTHER]: 'Other',
};

export const SeverityLabels: Record<Severity, string> = {
  [Severity.CRITICAL]: 'Critical',
  [Severity.SERIOUS]: 'Serious',
  [Severity.MODERATE]: 'Moderate',
  [Severity.MINOR]: 'Minor',
};

export const ChangeStatusLabels: Record<ChangeStatus, string> = {
  [ChangeStatus.APPLIED]: 'Applied',
  [ChangeStatus.REJECTED]: 'Rejected',
  [ChangeStatus.REVERTED]: 'Reverted',
  [ChangeStatus.FAILED]: 'Failed',
  [ChangeStatus.SKIPPED]: 'Skipped',
};

// Color classes for severity badges
export const SeverityColors: Record<Severity, string> = {
  [Severity.CRITICAL]: 'bg-red-100 text-red-800 border-red-300',
  [Severity.SERIOUS]: 'bg-orange-100 text-orange-800 border-orange-300',
  [Severity.MODERATE]: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  [Severity.MINOR]: 'bg-blue-100 text-blue-800 border-blue-300',
};

// Color classes for status badges
export const StatusColors: Record<ChangeStatus, string> = {
  [ChangeStatus.APPLIED]: 'bg-green-100 text-green-800 border-green-300',
  [ChangeStatus.REJECTED]: 'bg-red-100 text-red-800 border-red-300',
  [ChangeStatus.REVERTED]: 'bg-gray-100 text-gray-800 border-gray-300',
  [ChangeStatus.FAILED]: 'bg-red-100 text-red-800 border-red-300',
  [ChangeStatus.SKIPPED]: 'bg-gray-100 text-gray-800 border-gray-300',
};
---END FILE---

2. Create API Service (src/services/comparison.service.ts):

---FILE: src/services/comparison.service.ts---
import { api } from './api';
import type {
  ApiResponse,
  ComparisonData,
  RemediationChange,
  PaginatedChanges,
  ChangeFilters,
  RejectChangeRequest,
  RollbackChangeRequest,
} from '@/types/comparison';

/**
 * Comparison Service
 * Handles API calls for Visual Comparison feature
 * Base path: /api/v1/pdf/:jobId/comparison
 */
export const comparisonService = {
  /**
   * Get full comparison data for a job (report + all changes)
   * Endpoint: GET /api/v1/pdf/:jobId/comparison
   */
  async getComparisonData(jobId: string): Promise<ComparisonData> {
    const response = await api.get<ApiResponse<ComparisonData>>(
      `/pdf/${jobId}/comparison`
    );

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },

  /**
   * Get a single change by ID
   * Endpoint: GET /api/v1/pdf/:jobId/comparison/changes/:changeId
   */
  async getSingleChange(
    jobId: string,
    changeId: string
  ): Promise<RemediationChange> {
    const response = await api.get<ApiResponse<RemediationChange>>(
      `/pdf/${jobId}/comparison/changes/${changeId}`
    );

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },

  /**
   * Get filtered and paginated changes
   * Endpoint: GET /api/v1/pdf/:jobId/comparison/filter
   */
  async getFilteredChanges(
    jobId: string,
    filters: ChangeFilters
  ): Promise<PaginatedChanges> {
    const response = await api.get<ApiResponse<PaginatedChanges>>(
      `/pdf/${jobId}/comparison/filter`,
      { params: filters }
    );

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },

  /**
   * Reject a change (Phase 3)
   * Endpoint: POST /api/v1/pdf/:jobId/comparison/changes/:changeId/reject
   */
  async rejectChange(
    jobId: string,
    changeId: string,
    request: RejectChangeRequest
  ): Promise<RemediationChange> {
    const response = await api.post<ApiResponse<RemediationChange>>(
      `/pdf/${jobId}/comparison/changes/${changeId}/reject`,
      request
    );

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },

  /**
   * Rollback a change (Phase 3)
   * Endpoint: POST /api/v1/pdf/:jobId/comparison/changes/:changeId/rollback
   */
  async rollbackChange(
    jobId: string,
    changeId: string,
    request: RollbackChangeRequest
  ): Promise<{ change: RemediationChange; remediationTriggered: boolean }> {
    const response = await api.post<
      ApiResponse<{ change: RemediationChange; remediationTriggered: boolean }>
    >(`/pdf/${jobId}/comparison/changes/${changeId}/rollback`, request);

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },

  /**
   * Export comparison report to PDF (Phase 2)
   * Endpoint: POST /api/v1/pdf/:jobId/comparison/export-pdf
   */
  async exportPdf(
    jobId: string
  ): Promise<{ pdfUrl: string; reportId: string }> {
    const response = await api.post<
      ApiResponse<{ pdfUrl: string; reportId: string }>
    >(`/pdf/${jobId}/comparison/export-pdf`);

    if (!response.data.success) {
      throw new Error(response.data.error.message);
    }

    return response.data.data;
  },
};
---END FILE---

File Locations:
- Types: src/types/comparison.ts
- Service: src/services/comparison.service.ts

Follow existing patterns from:
- src/services/files.service.ts
- src/types/files.ts

Test this implementation:
1. Start the dev server: npm run dev
2. Check for TypeScript errors: npm run typecheck
3. Verify imports work in other files
4. The API calls won't work yet (backend not ready), but types should compile

Notes:
- The api.get/post methods come from src/services/api.ts
- All API paths include /api/v1 prefix automatically (configured in api.ts)
- Error handling follows the standard API response pattern
```

---

## Task F2: React Query Hooks

**Estimated Time:** 2-3 hours

### PROMPT FOR REPLIT

```
Context:
Continuing Visual Comparison implementation. Types and API service are now complete. I need to create React Query hooks for data fetching, caching, and mutations.

Task:
Create React Query hooks for the Visual Comparison feature with proper caching, error handling, and optimistic updates.

Requirements:

1. Create React Query Hooks (src/hooks/useComparison.ts):

---FILE: src/hooks/useComparison.ts---
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { comparisonService } from '@/services/comparison.service';
import type {
  ChangeFilters,
  RejectChangeRequest,
  RollbackChangeRequest,
} from '@/types/comparison';

/**
 * Query key factory for comparison queries
 * This ensures consistent cache keys across the app
 */
export const comparisonKeys = {
  all: ['comparison'] as const,
  job: (jobId: string) => [...comparisonKeys.all, jobId] as const,
  data: (jobId: string) => [...comparisonKeys.job(jobId), 'data'] as const,
  filtered: (jobId: string, filters: ChangeFilters) =>
    [...comparisonKeys.job(jobId), 'filtered', filters] as const,
  change: (jobId: string, changeId: string) =>
    [...comparisonKeys.job(jobId), 'change', changeId] as const,
};

/**
 * Fetch full comparison data for a job
 * Includes report and all changes
 */
export function useComparisonData(jobId: string) {
  return useQuery({
    queryKey: comparisonKeys.data(jobId),
    queryFn: () => comparisonService.getComparisonData(jobId),
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}

/**
 * Fetch filtered and paginated changes
 */
export function useFilteredChanges(jobId: string, filters: ChangeFilters) {
  return useQuery({
    queryKey: comparisonKeys.filtered(jobId, filters),
    queryFn: () => comparisonService.getFilteredChanges(jobId, filters),
    enabled: !!jobId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    keepPreviousData: true, // Keep old data while fetching new page
  });
}

/**
 * Fetch a single change by ID
 */
export function useSingleChange(jobId: string, changeId: string) {
  return useQuery({
    queryKey: comparisonKeys.change(jobId, changeId),
    queryFn: () => comparisonService.getSingleChange(jobId, changeId),
    enabled: !!jobId && !!changeId,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Reject a change (Phase 3)
 * Optimistically updates the cache
 */
export function useRejectChange(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      changeId,
      request,
    }: {
      changeId: string;
      request: RejectChangeRequest;
    }) => comparisonService.rejectChange(jobId, changeId, request),

    onSuccess: (updatedChange) => {
      // Invalidate all comparison queries for this job
      queryClient.invalidateQueries({ queryKey: comparisonKeys.job(jobId) });

      // Optimistically update the single change cache
      queryClient.setQueryData(
        comparisonKeys.change(jobId, updatedChange.id),
        updatedChange
      );
    },

    onError: (error) => {
      console.error('Failed to reject change:', error);
    },
  });
}

/**
 * Rollback a change (Phase 3)
 * Triggers re-remediation in the background
 */
export function useRollbackChange(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      changeId,
      request,
    }: {
      changeId: string;
      request: RollbackChangeRequest;
    }) => comparisonService.rollbackChange(jobId, changeId, request),

    onSuccess: ({ change, remediationTriggered }) => {
      // Invalidate all comparison queries
      queryClient.invalidateQueries({ queryKey: comparisonKeys.job(jobId) });

      // Update single change cache
      queryClient.setQueryData(comparisonKeys.change(jobId, change.id), change);

      // If remediation was triggered, invalidate job status
      if (remediationTriggered) {
        queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      }
    },

    onError: (error) => {
      console.error('Failed to rollback change:', error);
    },
  });
}

/**
 * Export comparison report to PDF (Phase 2)
 * Long-running operation (5-10 seconds)
 */
export function useExportPdf(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => comparisonService.exportPdf(jobId),

    onSuccess: ({ pdfUrl, reportId }) => {
      // Update the comparison report cache with the new PDF URL
      queryClient.invalidateQueries({ queryKey: comparisonKeys.data(jobId) });

      console.log('PDF exported successfully:', pdfUrl);
    },

    onError: (error) => {
      console.error('Failed to export PDF:', error);
    },
  });
}
---END FILE---

File Locations:
- Hooks: src/hooks/useComparison.ts

Follow existing patterns from:
- src/hooks/useFiles.ts
- src/hooks/useJobs.ts

Test this implementation:
1. Import the hooks in a test component
2. Verify TypeScript compilation: npm run typecheck
3. Check that query keys are properly typed
4. Verify mutations trigger cache invalidation

Important Notes:
- Query keys use a factory pattern for consistency
- keepPreviousData prevents loading flickers during pagination
- staleTime controls how long data is considered fresh
- gcTime (formerly cacheTime) controls how long unused data stays in cache
- Optimistic updates improve UX by updating cache before API response
- Always invalidate queries after mutations to keep data fresh

Common Pitfalls to Avoid:
- DON'T use inline query keys - always use the factory
- DON'T forget to enable/disable queries based on params
- DON'T forget to invalidate related queries after mutations
- DON'T use useEffect to fetch data - let React Query handle it
```

---

## Task F3: Base UI Components

**Estimated Time:** 6-8 hours

This task is split into 5 sub-components.

### PROMPT FOR REPLIT - Part 1: ComparisonHeader

```
Context:
Continuing Visual Comparison implementation. React Query hooks are complete. Now building the UI components. Starting with the header component that displays summary stats and export button.

Task:
Create the ComparisonHeader component that displays summary statistics and export functionality.

Requirements:

1. Create ComparisonHeader Component (src/components/comparison/ComparisonHeader.tsx):

---FILE: src/components/comparison/ComparisonHeader.tsx---
import { FileText, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import type { ComparisonReport } from '@/types/comparison';

interface ComparisonHeaderProps {
  report: ComparisonReport;
  onExportPdf?: () => void;
  isExporting?: boolean;
}

export function ComparisonHeader({
  report,
  onExportPdf,
  isExporting = false,
}: ComparisonHeaderProps) {
  return (
    <Card className="mb-6">
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Visual Comparison Report
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Generated on{' '}
                {new Date(report.generatedAt).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
          </div>

          {/* Export Button (Phase 2) */}
          {onExportPdf && (
            <Button
              variant="outline"
              onClick={onExportPdf}
              disabled={isExporting}
              leftIcon={
                isExporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )
              }
            >
              {isExporting ? 'Exporting...' : 'Export PDF'}
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Changes"
            value={report.totalChanges}
            color="blue"
          />
          <StatCard
            label="Applied"
            value={report.appliedCount}
            color="green"
          />
          <StatCard
            label="Rejected"
            value={report.rejectedCount}
            color="red"
          />
          <StatCard
            label="Reverted"
            value={report.revertedCount}
            color="gray"
          />
        </div>

        {/* WCAG Coverage (if available) */}
        {report.reportData?.wcagCoverage &&
          report.reportData.wcagCoverage.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                WCAG Criteria Coverage
              </h3>
              <div className="flex flex-wrap gap-2">
                {report.reportData.wcagCoverage.map((item) => (
                  <div
                    key={item.criteria}
                    className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-md text-sm font-medium border border-gray-300"
                  >
                    {item.criteria} ({item.changeCount})
                  </div>
                ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );
}

// Stat Card Sub-component
interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'gray';
}

function StatCard({ label, value, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200',
  };

  return (
    <div
      className={`p-4 rounded-lg border ${colorClasses[color]} transition-all hover:shadow-md`}
    >
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
    </div>
  );
}
---END FILE---

File Locations:
- Component: src/components/comparison/ComparisonHeader.tsx

Test this component:
1. Create a test page that renders ComparisonHeader with mock data
2. Verify the layout is responsive (mobile, tablet, desktop)
3. Test the export button (should call onExportPdf callback)
4. Check loading state during export (isExporting prop)

Mock data for testing:
const mockReport: ComparisonReport = {
  id: 'report-1',
  jobId: 'job-1',
  totalChanges: 15,
  appliedCount: 13,
  rejectedCount: 0,
  revertedCount: 2,
  reportData: {
    byType: {},
    bySeverity: {},
    byStatus: {},
    wcagCoverage: [
      { criteria: '2.4.2', changeCount: 5 },
      { criteria: '1.3.1', changeCount: 8 },
      { criteria: '1.1.1', changeCount: 2 },
    ],
  },
  pdfUrl: null,
  generatedAt: new Date().toISOString(),
};

Notes:
- Uses existing Card, Button components from src/components/ui
- Icons from lucide-react (already installed)
- Tailwind CSS for styling
- Responsive grid layout (2 cols mobile, 4 cols desktop)
```

### PROMPT FOR REPLIT - Part 2: ChangeFilters

```
Context:
Continuing Visual Comparison UI components. ComparisonHeader is complete. Now building the ChangeFilters component for filtering changes by type, severity, and status.

Task:
Create the ChangeFilters component with multi-select filters and clear functionality.

Requirements:

1. Create ChangeFilters Component (src/components/comparison/ChangeFilters.tsx):

---FILE: src/components/comparison/ChangeFilters.tsx---
import { X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import {
  ChangeType,
  Severity,
  ChangeStatus,
  ChangeTypeLabels,
  SeverityLabels,
  ChangeStatusLabels,
} from '@/types/comparison';

export interface FilterState {
  types: ChangeType[];
  severities: Severity[];
  statuses: ChangeStatus[];
}

interface ChangeFiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  totalResults?: number;
}

export function ChangeFilters({
  filters,
  onChange,
  totalResults,
}: ChangeFiltersProps) {
  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.severities.length > 0 ||
    filters.statuses.length > 0;

  const handleClearAll = () => {
    onChange({ types: [], severities: [], statuses: [] });
  };

  const handleTypeToggle = (type: ChangeType) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChange({ ...filters, types: newTypes });
  };

  const handleSeverityToggle = (severity: Severity) => {
    const newSeverities = filters.severities.includes(severity)
      ? filters.severities.filter((s) => s !== severity)
      : [...filters.severities, severity];
    onChange({ ...filters, severities: newSeverities });
  };

  const handleStatusToggle = (status: ChangeStatus) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onChange({ ...filters, statuses: newStatuses });
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {totalResults !== undefined && (
              <span className="text-sm text-gray-500">
                ({totalResults} result{totalResults !== 1 ? 's' : ''})
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              leftIcon={<X className="w-4 h-4" />}
            >
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-6">
        {/* Change Type Filters */}
        <FilterSection title="Change Type">
          <div className="flex flex-wrap gap-2">
            {Object.values(ChangeType).map((type) => (
              <FilterChip
                key={type}
                label={ChangeTypeLabels[type]}
                active={filters.types.includes(type)}
                onClick={() => handleTypeToggle(type)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Severity Filters */}
        <FilterSection title="Severity">
          <div className="flex flex-wrap gap-2">
            {Object.values(Severity).map((severity) => (
              <FilterChip
                key={severity}
                label={SeverityLabels[severity]}
                active={filters.severities.includes(severity)}
                onClick={() => handleSeverityToggle(severity)}
                variant={getSeverityVariant(severity)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Status Filters */}
        <FilterSection title="Status">
          <div className="flex flex-wrap gap-2">
            {Object.values(ChangeStatus).map((status) => (
              <FilterChip
                key={status}
                label={ChangeStatusLabels[status]}
                active={filters.statuses.includes(status)}
                onClick={() => handleStatusToggle(status)}
              />
            ))}
          </div>
        </FilterSection>
      </CardContent>
    </Card>
  );
}

// Filter Section Sub-component
interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

function FilterSection({ title, children }: FilterSectionProps) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

// Filter Chip Sub-component
interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'critical' | 'serious' | 'moderate' | 'minor';
}

function FilterChip({
  label,
  active,
  onClick,
  variant = 'default',
}: FilterChipProps) {
  const baseStyles =
    'px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer border';

  const variantStyles = {
    default: active
      ? 'bg-primary-100 text-primary-800 border-primary-300'
      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100',
    critical: active
      ? 'bg-red-100 text-red-800 border-red-300'
      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-red-50',
    serious: active
      ? 'bg-orange-100 text-orange-800 border-orange-300'
      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-orange-50',
    moderate: active
      ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-yellow-50',
    minor: active
      ? 'bg-blue-100 text-blue-800 border-blue-300'
      : 'bg-gray-50 text-gray-700 border-gray-300 hover:bg-blue-50',
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant]}`}
      type="button"
    >
      {label}
    </button>
  );
}

// Helper function to map severity to chip variant
function getSeverityVariant(
  severity: Severity
): 'critical' | 'serious' | 'moderate' | 'minor' {
  const variantMap: Record<
    Severity,
    'critical' | 'serious' | 'moderate' | 'minor'
  > = {
    [Severity.CRITICAL]: 'critical',
    [Severity.SERIOUS]: 'serious',
    [Severity.MODERATE]: 'moderate',
    [Severity.MINOR]: 'minor',
  };
  return variantMap[severity];
}
---END FILE---

File Locations:
- Component: src/components/comparison/ChangeFilters.tsx

Test this component:
1. Create a test page with controlled state:
   const [filters, setFilters] = useState<FilterState>({
     types: [],
     severities: [],
     statuses: [],
   });
2. Click chips to toggle filters (should highlight when active)
3. Click "Clear All" (should reset all filters)
4. Verify responsive layout (chips wrap on mobile)

Notes:
- Multi-select behavior (can select multiple filters)
- Active state changes chip background color
- Severity chips use color-coded variants
- Clear All button only shows when filters are active
- Chips wrap automatically on small screens
```

### PROMPT FOR REPLIT - Part 3: ChangeList

```
Context:
Continuing Visual Comparison UI components. ChangeFilters is complete. Now building the ChangeList component that displays a scrollable list of changes with selection.

Task:
Create the ChangeList component that displays changes with selection and navigation.

Requirements:

1. Create ChangeList Component (src/components/comparison/ChangeList.tsx):

---FILE: src/components/comparison/ChangeList.tsx---
import { FileText, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import {
  RemediationChange,
  ChangeTypeLabels,
  SeverityLabels,
  SeverityColors,
  StatusColors,
  ChangeStatusLabels,
} from '@/types/comparison';

interface ChangeListProps {
  changes: RemediationChange[];
  selectedChangeId: string | null;
  onSelectChange: (change: RemediationChange) => void;
}

export function ChangeList({
  changes,
  selectedChangeId,
  onSelectChange,
}: ChangeListProps) {
  if (changes.length === 0) {
    return (
      <Card className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No changes found</p>
        <p className="text-sm text-gray-500 mt-1">
          Try adjusting your filters
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {changes.map((change) => (
        <ChangeListItem
          key={change.id}
          change={change}
          selected={change.id === selectedChangeId}
          onClick={() => onSelectChange(change)}
        />
      ))}
    </div>
  );
}

// Change List Item Sub-component
interface ChangeListItemProps {
  change: RemediationChange;
  selected: boolean;
  onClick: () => void;
}

function ChangeListItem({ change, selected, onClick }: ChangeListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-full text-left p-4 rounded-lg border transition-all cursor-pointer
        ${
          selected
            ? 'bg-primary-50 border-primary-300 shadow-md'
            : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }
      `}
      type="button"
    >
      <div className="flex items-start gap-3">
        {/* Change Number Badge */}
        <div
          className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm
            ${
              selected
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }
          `}
        >
          {change.changeNumber}
        </div>

        {/* Change Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-medium text-gray-900 text-sm">
              {change.description}
            </p>
          </div>

          {/* Badges Row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Change Type Badge */}
            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 border border-gray-300 rounded text-xs font-medium">
              {ChangeTypeLabels[change.changeType]}
            </span>

            {/* Severity Badge */}
            {change.severity && (
              <span
                className={`px-2 py-0.5 border rounded text-xs font-medium ${
                  SeverityColors[change.severity]
                }`}
              >
                {SeverityLabels[change.severity]}
              </span>
            )}

            {/* Status Badge */}
            <span
              className={`px-2 py-0.5 border rounded text-xs font-medium ${
                StatusColors[change.status]
              }`}
            >
              {ChangeStatusLabels[change.status]}
            </span>

            {/* WCAG Criteria Badge */}
            {change.wcagCriteria && (
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs font-medium">
                WCAG {change.wcagCriteria}
              </span>
            )}
          </div>

          {/* File Path */}
          {change.filePath && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500">
              <FileText className="w-3 h-3" />
              <span className="truncate">{change.filePath}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
---END FILE---

File Locations:
- Component: src/components/comparison/ChangeList.tsx

Test this component:
1. Create a scrollable container with max height:
   <div className="max-h-screen overflow-y-auto">
     <ChangeList changes={mockChanges} ... />
   </div>
2. Click on items to select (should highlight selected item)
3. Test with empty array (should show "No changes found" message)
4. Verify badges wrap correctly on narrow screens

Mock data for testing:
const mockChanges: RemediationChange[] = [
  {
    id: '1',
    jobId: 'job-1',
    changeNumber: 1,
    filePath: 'PDF',
    changeType: ChangeType.LANGUAGE_SET,
    description: 'Set document language to "en"',
    beforeContent: null,
    afterContent: '<dc:language>en</dc:language>',
    severity: Severity.CRITICAL,
    wcagCriteria: '3.1.1',
    status: ChangeStatus.APPLIED,
    appliedAt: new Date().toISOString(),
    reviewedBy: null,
    reviewedAt: null,
    reviewComment: null,
  },
  // Add 5-10 more changes for scrolling
];

Notes:
- Selected item has primary color background
- Badge colors match the type definitions
- Empty state with helpful message
- Truncate long file paths with ellipsis
- Hover effects for better UX
```

### PROMPT FOR REPLIT - Part 4: ChangeDetailCard

```
Context:
Continuing Visual Comparison UI components. ChangeList is complete. Now building the ChangeDetailCard component that displays detailed information about the selected change.

Task:
Create the ChangeDetailCard component that shows change metadata, WCAG info, and action buttons (Phase 3).

Requirements:

1. Create ChangeDetailCard Component (src/components/comparison/ChangeDetailCard.tsx):

---FILE: src/components/comparison/ChangeDetailCard.tsx---
import { Calendar, FileText, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  RemediationChange,
  ChangeTypeLabels,
  SeverityLabels,
  SeverityColors,
  StatusColors,
  ChangeStatusLabels,
} from '@/types/comparison';

interface ChangeDetailCardProps {
  change: RemediationChange;
  onReject?: (changeId: string) => void;
  onRollback?: (changeId: string) => void;
  isRejecting?: boolean;
  isRollingBack?: boolean;
}

export function ChangeDetailCard({
  change,
  onReject,
  onRollback,
  isRejecting = false,
  isRollingBack = false,
}: ChangeDetailCardProps) {
  return (
    <Card>
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Change #{change.changeNumber}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{change.description}</p>
          </div>
          <span
            className={`px-3 py-1 border rounded-md text-sm font-semibold ${
              StatusColors[change.status]
            }`}
          >
            {ChangeStatusLabels[change.status]}
          </span>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-4">
          <MetadataItem
            icon={<FileText className="w-4 h-4" />}
            label="Change Type"
            value={ChangeTypeLabels[change.changeType]}
          />
          {change.severity && (
            <MetadataItem
              icon={<AlertTriangle className="w-4 h-4" />}
              label="Severity"
              value={SeverityLabels[change.severity]}
              badge
              badgeColor={SeverityColors[change.severity]}
            />
          )}
          {change.wcagCriteria && (
            <MetadataItem
              icon={<CheckCircle className="w-4 h-4" />}
              label="WCAG Criteria"
              value={change.wcagCriteria}
            />
          )}
          <MetadataItem
            icon={<Calendar className="w-4 h-4" />}
            label="Applied At"
            value={new Date(change.appliedAt).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          />
        </div>

        {/* File Path */}
        {change.filePath && (
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              File Path
            </p>
            <p className="text-sm text-gray-600 font-mono bg-gray-50 p-2 rounded border border-gray-200 break-all">
              {change.filePath}
            </p>
          </div>
        )}

        {/* Review Information (Phase 3) */}
        {change.reviewedBy && (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Review Information
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Reviewed By:</span>{' '}
                {change.reviewedBy}
              </p>
              {change.reviewedAt && (
                <p>
                  <span className="font-medium">Reviewed At:</span>{' '}
                  {new Date(change.reviewedAt).toLocaleString('en-US', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              )}
              {change.reviewComment && (
                <div className="mt-2">
                  <p className="font-medium mb-1">Comment:</p>
                  <p className="italic">{change.reviewComment}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons (Phase 3) */}
        {onReject && onRollback && change.status === 'APPLIED' && (
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={() => onReject(change.id)}
              disabled={isRejecting || isRollingBack}
              isLoading={isRejecting}
              className="flex-1"
            >
              Reject Change
            </Button>
            <Button
              variant="danger"
              onClick={() => onRollback(change.id)}
              disabled={isRejecting || isRollingBack}
              isLoading={isRollingBack}
              className="flex-1"
            >
              Rollback Change
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Metadata Item Sub-component
interface MetadataItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  badge?: boolean;
  badgeColor?: string;
}

function MetadataItem({
  icon,
  label,
  value,
  badge = false,
  badgeColor,
}: MetadataItemProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      {badge && badgeColor ? (
        <span
          className={`inline-block px-2 py-1 border rounded text-sm font-semibold ${badgeColor}`}
        >
          {value}
        </span>
      ) : (
        <p className="text-sm text-gray-900 font-medium">{value}</p>
      )}
    </div>
  );
}
---END FILE---

File Locations:
- Component: src/components/comparison/ChangeDetailCard.tsx

Test this component:
1. Render with a mock change object
2. Test action buttons (reject/rollback) with console.log callbacks
3. Verify loading states (isRejecting, isRollingBack props)
4. Test with and without review information
5. Test with changes that have different statuses (APPLIED, REJECTED, etc.)

Notes:
- Action buttons only show for APPLIED changes
- Review information only shows if change has been reviewed
- Loading states disable both buttons to prevent race conditions
- Metadata grid is responsive (stacks on mobile)
- File path uses monospace font for readability
```

### PROMPT FOR REPLIT - Part 5: ChangeNavigation

```
Context:
Continuing Visual Comparison UI components. ChangeDetailCard is complete. Now building the ChangeNavigation component for prev/next navigation between changes.

Task:
Create the ChangeNavigation component with keyboard shortcuts support.

Requirements:

1. Create ChangeNavigation Component (src/components/comparison/ChangeNavigation.tsx):

---FILE: src/components/comparison/ChangeNavigation.tsx---
import { useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ChangeNavigationProps {
  currentIndex: number;
  totalChanges: number;
  onPrevious: () => void;
  onNext: () => void;
  enableKeyboardShortcuts?: boolean;
}

export function ChangeNavigation({
  currentIndex,
  totalChanges,
  onPrevious,
  onNext,
  enableKeyboardShortcuts = true,
}: ChangeNavigationProps) {
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalChanges - 1;

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input field
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Left arrow or 'p' for previous
      if ((e.key === 'ArrowLeft' || e.key === 'p') && !isFirst) {
        e.preventDefault();
        onPrevious();
      }

      // Right arrow or 'n' for next
      if ((e.key === 'ArrowRight' || e.key === 'n') && !isLast) {
        e.preventDefault();
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    currentIndex,
    isFirst,
    isLast,
    onPrevious,
    onNext,
    enableKeyboardShortcuts,
  ]);

  if (totalChanges === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white border-t border-gray-200 sticky bottom-0">
      <Button
        variant="outline"
        onClick={onPrevious}
        disabled={isFirst}
        leftIcon={<ChevronLeft className="w-4 h-4" />}
        aria-label="Previous change"
        title="Previous change (← or P)"
      >
        Previous
      </Button>

      <div className="text-sm text-gray-600 font-medium">
        Change {currentIndex + 1} of {totalChanges}
      </div>

      <Button
        variant="outline"
        onClick={onNext}
        disabled={isLast}
        rightIcon={<ChevronRight className="w-4 h-4" />}
        aria-label="Next change"
        title="Next change (→ or N)"
      >
        Next
      </Button>
    </div>
  );
}
---END FILE---

File Locations:
- Component: src/components/comparison/ChangeNavigation.tsx

Test this component:
1. Render at bottom of a scrollable container
2. Click Previous/Next buttons (should call callbacks)
3. Test keyboard shortcuts:
   - Press Left Arrow or 'P' for previous
   - Press Right Arrow or 'N' for next
4. Verify buttons are disabled at first/last change
5. Test with enableKeyboardShortcuts={false}

Mock usage:
const [currentIndex, setCurrentIndex] = useState(0);
const totalChanges = 10;

<ChangeNavigation
  currentIndex={currentIndex}
  totalChanges={totalChanges}
  onPrevious={() => setCurrentIndex((i) => Math.max(0, i - 1))}
  onNext={() => setCurrentIndex((i) => Math.min(totalChanges - 1, i + 1))}
/>

Notes:
- Sticky positioning keeps it visible while scrolling
- Keyboard shortcuts ignore events when typing in inputs
- ARIA labels for accessibility
- Tooltips show available keyboard shortcuts
- Returns null if no changes to navigate

Accessibility:
- Keyboard navigation support
- ARIA labels for screen readers
- Focus management with Tab key
- Clear visual disabled states
```

---

## Task F4: XML Diff Viewer

**Estimated Time:** 4-5 hours

### PROMPT FOR REPLIT

```
Context:
Continuing Visual Comparison implementation. All base components are complete. Now building the XmlDiffViewer component that uses react-diff-viewer-continued with Prism.js syntax highlighting.

Task:
Create the XmlDiffViewer component with side-by-side XML diff visualization.

Requirements:

1. Create XmlDiffViewer Component (src/components/comparison/XmlDiffViewer.tsx):

---FILE: src/components/comparison/XmlDiffViewer.tsx---
import { useMemo } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import Prism from 'prismjs';
import 'prismjs/components/prism-markup'; // For XML
import 'prismjs/themes/prism.css';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { FileCode, FileX, FilePlus } from 'lucide-react';

interface XmlDiffViewerProps {
  beforeContent: string | null;
  afterContent: string | null;
  fileName?: string;
}

export function XmlDiffViewer({
  beforeContent,
  afterContent,
  fileName = 'content.xml',
}: XmlDiffViewerProps) {
  // Format XML with indentation (pretty print)
  const formatXml = (xml: string | null): string => {
    if (!xml) return '';

    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xml, 'text/xml');

      // Check for parsing errors
      const parserError = xmlDoc.querySelector('parsererror');
      if (parserError) {
        // Return unformatted if parsing failed
        return xml;
      }

      // Serialize with formatting
      const serializer = new XMLSerializer();
      const formatted = serializer.serializeToString(xmlDoc);

      // Add basic indentation (simple approach)
      return formatted
        .replace(/></g, '>\n<')
        .split('\n')
        .map((line, index) => {
          const depth = (line.match(/^<\//g) ? -1 : 0) + (line.match(/</g) || []).length - 1;
          return '  '.repeat(Math.max(0, depth)) + line;
        })
        .join('\n');
    } catch (error) {
      console.warn('Failed to format XML:', error);
      return xml;
    }
  };

  const formattedBefore = useMemo(
    () => formatXml(beforeContent),
    [beforeContent]
  );
  const formattedAfter = useMemo(() => formatXml(afterContent), [afterContent]);

  // Custom syntax highlighting using Prism.js
  const highlightSyntax = (code: string): JSX.Element => {
    if (!code) return <></>;

    const html = Prism.highlight(code, Prism.languages.markup, 'markup');

    return (
      <pre className="language-markup">
        <code
          className="language-markup"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </pre>
    );
  };

  // Handle special cases
  const isNewContent = !beforeContent && afterContent;
  const isDeletedContent = beforeContent && !afterContent;
  const isNoChanges = !beforeContent && !afterContent;

  if (isNoChanges) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <FileX className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">No content to display</p>
          <p className="text-sm text-gray-500 mt-1">
            This change has no before or after content
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="border-b border-gray-200 pb-4">
        <div className="flex items-center gap-2">
          <FileCode className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Content Comparison
          </h3>
          <span className="text-sm text-gray-500 font-mono">{fileName}</span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {isNewContent && (
          <div className="p-4 bg-green-50 border-b border-green-200 flex items-center gap-2">
            <FilePlus className="w-5 h-5 text-green-600" />
            <p className="text-sm font-medium text-green-800">
              New content added (no previous version)
            </p>
          </div>
        )}

        {isDeletedContent && (
          <div className="p-4 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <FileX className="w-5 h-5 text-red-600" />
            <p className="text-sm font-medium text-red-800">
              Content deleted (no current version)
            </p>
          </div>
        )}

        <div className="overflow-x-auto">
          <ReactDiffViewer
            oldValue={formattedBefore}
            newValue={formattedAfter}
            splitView={true}
            showDiffOnly={false}
            useDarkTheme={false}
            leftTitle="Before"
            rightTitle="After"
            renderContent={highlightSyntax}
            styles={{
              variables: {
                light: {
                  diffViewerBackground: '#ffffff',
                  diffViewerColor: '#1f2937',
                  addedBackground: '#dcfce7',
                  addedColor: '#166534',
                  removedBackground: '#fee2e2',
                  removedColor: '#991b1b',
                  wordAddedBackground: '#bbf7d0',
                  wordRemovedBackground: '#fecaca',
                  addedGutterBackground: '#86efac',
                  removedGutterBackground: '#fca5a5',
                  gutterBackground: '#f3f4f6',
                  gutterBackgroundDark: '#e5e7eb',
                  highlightBackground: '#fef3c7',
                  highlightGutterBackground: '#fde68a',
                },
              },
              line: {
                padding: '8px 12px',
                fontSize: '13px',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
                lineHeight: '1.5',
              },
              contentText: {
                fontSize: '13px',
                fontFamily:
                  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
              },
              gutter: {
                minWidth: '50px',
                padding: '8px',
                fontSize: '12px',
              },
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
---END FILE---

2. Add Prism CSS Import (src/App.tsx or src/main.tsx):

Add this import at the top of your main app file:
import 'prismjs/themes/prism.css';

File Locations:
- Component: src/components/comparison/XmlDiffViewer.tsx
- CSS import: src/App.tsx or src/main.tsx

Test this component:
1. Test with both before and after content (normal diff)
2. Test with only afterContent (new content)
3. Test with only beforeContent (deleted content)
4. Test with both null (no content)
5. Verify syntax highlighting works
6. Test with malformed XML (should handle gracefully)

Mock data for testing:
const beforeXml = `<?xml version="1.0"?>
<document>
  <title>Old Title</title>
  <content>Some content</content>
</document>`;

const afterXml = `<?xml version="1.0"?>
<document lang="en">
  <title>New Title</title>
  <content>Updated content</content>
  <author>John Doe</author>
</document>`;

<XmlDiffViewer
  beforeContent={beforeXml}
  afterContent={afterXml}
  fileName="document.xml"
/>

Notes:
- react-diff-viewer-continued provides the diff UI
- Prism.js adds XML syntax highlighting
- formatXml() pretty-prints the XML for readability
- Custom color scheme matches Tailwind colors
- Side-by-side view (splitView={true})
- Horizontal scroll for long lines
- Handles edge cases (null content, malformed XML)

Known Limitations:
- Large XML files (>1MB) may be slow to render
- Very long lines may cause horizontal scrolling
- Prism.js doesn't support all XML dialects equally

Performance Tips:
- useMemo prevents re-formatting on every render
- Only format when content actually changes
- Consider virtualization for very long diffs (future enhancement)
```

---

## Task F5: Page Integration & Route

**Estimated Time:** 3-4 hours

### PROMPT FOR REPLIT

```
Context:
All Visual Comparison components are complete. Now building the main ComparisonPage that integrates all components with state management and routing.

Task:
Create the ComparisonPage component and integrate it into the React Router configuration.

Requirements:

1. Create ComparisonPage Component (src/pages/ComparisonPage.tsx):

---FILE: src/pages/ComparisonPage.tsx---
import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ComparisonHeader } from '@/components/comparison/ComparisonHeader';
import {
  ChangeFilters,
  FilterState,
} from '@/components/comparison/ChangeFilters';
import { ChangeList } from '@/components/comparison/ChangeList';
import { ChangeDetailCard } from '@/components/comparison/ChangeDetailCard';
import { ChangeNavigation } from '@/components/comparison/ChangeNavigation';
import { XmlDiffViewer } from '@/components/comparison/XmlDiffViewer';
import {
  useComparisonData,
  useExportPdf,
  useRejectChange,
  useRollbackChange,
} from '@/hooks/useComparison';
import type { RemediationChange } from '@/types/comparison';

export function ComparisonPage() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    types: [],
    severities: [],
    statuses: [],
  });

  // Selected change index
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch comparison data
  const {
    data: comparisonData,
    isLoading,
    isError,
    error,
  } = useComparisonData(jobId!);

  // Export PDF mutation (Phase 2)
  const exportPdfMutation = useExportPdf(jobId!);

  // Reject change mutation (Phase 3)
  const rejectChangeMutation = useRejectChange(jobId!);

  // Rollback change mutation (Phase 3)
  const rollbackChangeMutation = useRollbackChange(jobId!);

  // Filter changes based on filters
  const filteredChanges = useMemo(() => {
    if (!comparisonData?.changes) return [];

    return comparisonData.changes.filter((change) => {
      // Filter by type
      if (filters.types.length > 0 && !filters.types.includes(change.changeType)) {
        return false;
      }

      // Filter by severity
      if (
        filters.severities.length > 0 &&
        change.severity &&
        !filters.severities.includes(change.severity)
      ) {
        return false;
      }

      // Filter by status
      if (filters.statuses.length > 0 && !filters.statuses.includes(change.status)) {
        return false;
      }

      return true;
    });
  }, [comparisonData?.changes, filters]);

  // Selected change
  const selectedChange = filteredChanges[selectedIndex] || null;

  // Handlers
  const handleSelectChange = (change: RemediationChange) => {
    const index = filteredChanges.findIndex((c) => c.id === change.id);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  };

  const handlePrevious = () => {
    setSelectedIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setSelectedIndex((prev) => Math.min(filteredChanges.length - 1, prev + 1));
  };

  const handleExportPdf = () => {
    exportPdfMutation.mutate(undefined, {
      onSuccess: ({ pdfUrl }) => {
        window.open(pdfUrl, '_blank');
      },
    });
  };

  const handleRejectChange = (changeId: string) => {
    const comment = prompt('Optional: Add a comment for rejection');
    rejectChangeMutation.mutate({
      changeId,
      request: { comment: comment || undefined },
    });
  };

  const handleRollbackChange = (changeId: string) => {
    const reason = prompt('Required: Explain why you are rolling back this change');
    if (!reason || reason.trim().length < 10) {
      alert('Reason must be at least 10 characters');
      return;
    }
    rollbackChangeMutation.mutate({ changeId, request: { reason } });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading comparison data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !comparisonData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Failed to Load Comparison Data
          </h2>
          <p className="text-gray-600 mb-6">
            {error instanceof Error
              ? error.message
              : 'An unexpected error occurred'}
          </p>
          <Button onClick={() => navigate(-1)} leftIcon={<ArrowLeft />}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="mb-4"
        >
          Back to Job Details
        </Button>

        {/* Header */}
        <ComparisonHeader
          report={comparisonData.report}
          onExportPdf={handleExportPdf}
          isExporting={exportPdfMutation.isPending}
        />

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar: Filters + Change List */}
          <div className="lg:col-span-4 space-y-6">
            <ChangeFilters
              filters={filters}
              onChange={setFilters}
              totalResults={filteredChanges.length}
            />
            <div className="max-h-[600px] overflow-y-auto">
              <ChangeList
                changes={filteredChanges}
                selectedChangeId={selectedChange?.id || null}
                onSelectChange={handleSelectChange}
              />
            </div>
          </div>

          {/* Right Panel: Change Details + Diff Viewer */}
          <div className="lg:col-span-8 space-y-6">
            {selectedChange ? (
              <>
                <ChangeDetailCard
                  change={selectedChange}
                  onReject={handleRejectChange}
                  onRollback={handleRollbackChange}
                  isRejecting={rejectChangeMutation.isPending}
                  isRollingBack={rollbackChangeMutation.isPending}
                />
                <XmlDiffViewer
                  beforeContent={selectedChange.beforeContent}
                  afterContent={selectedChange.afterContent}
                  fileName={selectedChange.filePath}
                />
                <ChangeNavigation
                  currentIndex={selectedIndex}
                  totalChanges={filteredChanges.length}
                  onPrevious={handlePrevious}
                  onNext={handleNext}
                />
              </>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">No change selected</p>
                <p className="text-sm text-gray-500 mt-1">
                  Select a change from the list to view details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
---END FILE---

2. Add Route to React Router (src/App.tsx):

Find the Routes section and add this route:

<Route path="/jobs/:jobId/comparison" element={<ComparisonPage />} />

Make sure to import ComparisonPage at the top:
import { ComparisonPage } from '@/pages/ComparisonPage';

3. Add Navigation Link (Optional - in your job details page):

Add a button to navigate to the comparison page from the job details or remediation plan page:

<Button onClick={() => navigate(`/jobs/${jobId}/comparison`)}>
  View Comparison Report
</Button>

File Locations:
- Page: src/pages/ComparisonPage.tsx
- Router: src/App.tsx

Test this implementation:
1. Navigate to /jobs/{jobId}/comparison in your browser
2. Verify all components render correctly
3. Test filters (should update the change list)
4. Test change selection (should update detail panel and diff viewer)
5. Test prev/next navigation (keyboard and buttons)
6. Test export PDF button (should open new tab with PDF)
7. Test reject/rollback buttons (Phase 3)

Notes:
- Two-column layout on desktop, stacked on mobile
- Filters persist during session (local state)
- Selected change auto-resets when filters change
- All mutations show loading states
- Error handling for all API calls
- Keyboard navigation support

Accessibility:
- Semantic HTML structure
- ARIA labels on all buttons
- Keyboard navigation support
- Focus management
- Loading announcements

Performance:
- useMemo for filtered changes (prevents re-filtering on every render)
- React Query caching reduces API calls
- Lazy loading for components (future enhancement)
```

---

## Testing Guidelines

### Manual Testing Checklist

1. **Data Loading**
   - [ ] Loading spinner shows while fetching data
   - [ ] Error message shows if job not found
   - [ ] All data populates correctly from API

2. **Filters**
   - [ ] Clicking a filter chip toggles it on/off
   - [ ] Multiple filters can be active simultaneously
   - [ ] Clear All button resets all filters
   - [ ] Result count updates when filters change

3. **Change List**
   - [ ] Changes display in correct order
   - [ ] Selected change is highlighted
   - [ ] Clicking a change updates the detail panel
   - [ ] Empty state shows when no results

4. **Change Details**
   - [ ] All metadata displays correctly
   - [ ] Badges use correct colors
   - [ ] Review info shows when available (Phase 3)
   - [ ] Action buttons work (Phase 3)

5. **XML Diff Viewer**
   - [ ] Syntax highlighting works
   - [ ] Side-by-side comparison is readable
   - [ ] Handles null content gracefully
   - [ ] Horizontal scroll works for long lines

6. **Navigation**
   - [ ] Prev/Next buttons work
   - [ ] Keyboard shortcuts work (arrows, P, N)
   - [ ] Navigation disabled at boundaries
   - [ ] Current position shows correctly

7. **Responsive Design**
   - [ ] Mobile layout stacks vertically
   - [ ] Tablet layout uses 2 columns
   - [ ] Desktop layout uses full width
   - [ ] All text is readable on small screens

8. **Export PDF** (Phase 2)
   - [ ] Export button shows loading state
   - [ ] PDF opens in new tab after generation
   - [ ] Error message shows if export fails

---

## Common Pitfalls

### React Query Issues

**Problem**: Stale data after mutation
```typescript
// BAD: Forgetting to invalidate queries
onSuccess: () => {
  // Missing invalidation
}

// GOOD: Always invalidate related queries
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: comparisonKeys.job(jobId) });
}
```

**Problem**: Infinite re-renders
```typescript
// BAD: Creating new objects in render
const filters = { types: [], severities: [] }; // New object every render

// GOOD: Use useState or useMemo
const [filters, setFilters] = useState({ types: [], severities: [] });
```

### State Management Issues

**Problem**: Filters reset when changing pages
```typescript
// BAD: Local state gets lost on unmount
const [filters, setFilters] = useState(...);

// BETTER: Use URL query params (future enhancement)
const [searchParams, setSearchParams] = useSearchParams();
```

**Problem**: Selected index out of bounds after filtering
```typescript
// BAD: Index doesn't update when filters change
setFilters(newFilters); // selectedIndex might now be invalid

// GOOD: Reset index when filters change
useEffect(() => {
  setSelectedIndex(0);
}, [filteredChanges.length]);
```

### Performance Issues

**Problem**: Re-rendering entire list on every change
```typescript
// BAD: Filtering in render without memoization
const filtered = changes.filter(...); // Runs every render

// GOOD: Use useMemo
const filtered = useMemo(() => changes.filter(...), [changes, filters]);
```

**Problem**: Large XML files freeze the UI
```typescript
// BAD: Rendering huge XML files synchronously
<XmlDiffViewer beforeContent={hugeXml} />

// BETTER: Add length check and truncate (future enhancement)
const truncatedXml = xml.length > 10000 ? xml.slice(0, 10000) + '...' : xml;
```

### Accessibility Issues

**Problem**: Keyboard navigation doesn't work in inputs
```typescript
// BAD: Shortcuts trigger while typing
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') onPrevious(); // Triggers in inputs!
}

// GOOD: Check if user is typing
if (e.target instanceof HTMLInputElement) return;
```

**Problem**: No focus indication on selected item
```typescript
// BAD: Only visual selection
className={selected ? 'bg-blue-50' : ''}

// GOOD: Also set focus ring
className={clsx(
  selected && 'bg-blue-50 ring-2 ring-primary-500'
)}
```

---

## Next Steps

After completing all tasks:

1. **Integration Testing**
   - Test with real backend API (once backend is deployed)
   - Verify error handling for 401/403/404/500 responses
   - Test with large datasets (100+ changes)

2. **Phase 2 Enhancements**
   - Implement PDF export progress indicator
   - Add download button for generated PDFs
   - Store PDF URLs in local state for quick access

3. **Phase 3 Enhancements**
   - Build reject/rollback confirmation modals
   - Add comment input UI (replace prompt())
   - Implement change approval workflow

4. **Performance Optimizations**
   - Add virtualization for long change lists (react-window)
   - Lazy load XmlDiffViewer when selected
   - Implement pagination for 100+ changes

5. **UX Improvements**
   - URL query params for filters and selected change
   - Export filters state to localStorage
   - Add search functionality for changes
   - Add bulk actions (approve all, reject all)

---

**Questions?** Refer to the API contract document (PHASE4_API_CONTRACT.md) or ask in team sync.

**Last Updated:** February 15, 2026
