# Citation Management - US-4.1 & US-4.2 (FRONTEND)
## Replit Prompts for Dev2 (Sakthi)

**Repository:** `ninja-frontend`
**Purpose:** Implement Citation Management UI components for Editorial Services module
**Note:** This is FRONTEND only. Backend services must be deployed first.
**Dependency:** Backend Citation APIs from `ninja-backend/src/services/citation/`

**Schema Update (synced with backend):**
- CitationComponent has `parseVariant` (string | null) and `confidence` (number 0-1)
- CitationComponent has validation fields: `doiVerified`, `urlValid`, `urlCheckedAt`
- **Primary component pattern:** Citation has `primaryComponentId` pointing to the selected CitationComponent
- Pass `isPrimary` prop to components based on `Citation.primaryComponentId === component.id`
- Added SourceType values: NEWSPAPER, MAGAZINE, PATENT, LEGAL, PERSONAL_COMMUNICATION, UNKNOWN

---

## Sprint Technical Standards (Include in Each Session)

```
Runtime: React 18 + TypeScript 5.x (strict mode)
Build Tool: Vite
State Management: TanStack Query (React Query)
Styling: TailwindCSS (no inline styles)
Icons: Lucide React
Path Alias: @/ → src/
Component Pattern: Functional components with hooks
File Naming: PascalCase for components, camelCase for services/hooks
```

---

## Module Ownership Rules

**YOUR directories (create and own):**
```
src/
├── types/citation.types.ts
├── services/citation.service.ts
├── hooks/useCitation.ts
├── components/citation/
│   ├── CitationList.tsx
│   ├── CitationDetail.tsx
│   ├── CitationStats.tsx
│   ├── CitationTypeFilter.tsx
│   ├── ParsedComponentsView.tsx
│   └── index.ts
└── pages/CitationPage.tsx (optional - or integrate into JobDetails)
```

**DO NOT modify (shared/other ownership):**
```
src/components/ui/           # Shared UI components (use, don't modify)
src/components/shared/       # AVR's shared components (use, don't modify)
src/services/api.ts          # Axios instance (use, don't modify)
```

**USE these shared components from AVR (src/components/shared/):**
```typescript
import { FileUploader, ProgressIndicator, ReportExporter } from '../shared';
```
- `FileUploader.tsx` - Drag-drop file upload with validation
- `ProgressIndicator.tsx` - Linear/circular/steps progress variants
- `ReportExporter.tsx` - Multi-format export (PDF, Word, etc.)

---

## Prerequisites

Before starting, ensure:

1. **Pull latest main:**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create feature branch:**
   ```bash
   git checkout -b feature/citation/US-4-1-US-4-2-frontend
   ```

3. **Verify backend APIs are deployed:**
   ```bash
   # Test detection endpoint exists
   curl -I https://your-api-url/api/v1/citation/detect
   ```

4. **Check existing patterns:**
   ```bash
   ls src/services/
   ls src/hooks/
   ls src/types/
   ```

---

## Prompt 1: Create TypeScript Types

**File:** `src/types/citation.types.ts`

**Prompt:**
```
Create TypeScript type definitions for Citation Management.

Create file: src/types/citation.types.ts

```typescript
/**
 * Citation Management Types
 * Frontend types for US-4.1 (Detection) and US-4.2 (Parsing)
 */

// Enums matching backend Prisma enums
export type CitationType =
  | 'PARENTHETICAL'
  | 'NARRATIVE'
  | 'FOOTNOTE'
  | 'ENDNOTE'
  | 'NUMERIC'
  | 'UNKNOWN';

export type CitationStyle =
  | 'APA'
  | 'MLA'
  | 'CHICAGO'
  | 'VANCOUVER'
  | 'HARVARD'
  | 'IEEE'
  | 'UNKNOWN';

export type SourceType =
  | 'JOURNAL_ARTICLE'
  | 'BOOK'
  | 'BOOK_CHAPTER'
  | 'CONFERENCE_PAPER'
  | 'WEBSITE'
  | 'THESIS'
  | 'REPORT'
  | 'NEWSPAPER'
  | 'MAGAZINE'
  | 'PATENT'
  | 'LEGAL'
  | 'PERSONAL_COMMUNICATION'
  | 'UNKNOWN';

// Citation from detection (US-4.1)
export interface Citation {
  id: string;
  documentId: string;
  rawText: string;
  citationType: CitationType;
  detectedStyle: CitationStyle | null;
  pageNumber: number | null;
  paragraphIndex: number | null;
  startOffset: number;
  endOffset: number;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  // Primary component pattern (from schema)
  primaryComponentId: string | null;
  primaryComponent?: CitationComponent;
  // AC-26: Aggregated review status from primary component
  needsReview: boolean;
}

// Parsed citation component (US-4.2)
export interface CitationComponent {
  id: string;
  citationId: string;
  parseVariant: string | null;   // Which style was used to parse (e.g., "APA", "MLA")
  confidence: number;            // Overall parse confidence (0-1)
  authors: string[];
  year: string | null;
  title: string | null;
  source: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  publisher: string | null;
  edition: string | null;
  accessDate: string | null;
  sourceType: SourceType | null;
  fieldConfidence: Record<string, number>;
  // Validation fields
  doiVerified: boolean | null;
  urlValid: boolean | null;
  urlCheckedAt: string | null;
  // AC-26: Explicit flag for ambiguous/incomplete citations
  needsReview: boolean;          // True if citation is ambiguous or incomplete
  reviewReasons: string[];       // Reasons why review is needed
  createdAt: string;
}

// AC-26: Review reason labels for display
export const REVIEW_REASON_LABELS: Record<string, string> = {
  'Overall parse confidence below 70%': 'Low confidence',
  'One or more fields have confidence below 50%': 'Uncertain fields',
  'No authors could be extracted': 'Missing authors',
  'Publication year could not be determined': 'Missing year',
  'Title could not be extracted': 'Missing title',
  'Source type could not be determined': 'Unknown source type',
  'DOI format appears invalid': 'Invalid DOI',
  'URL format appears invalid': 'Invalid URL',
};

// Detection result summary
export interface DetectionResult {
  documentId: string;
  citations: Citation[];
  totalCount: number;
  byType: Record<CitationType, number>;
  byStyle: Record<CitationStyle, number>;
}

// Bulk parse result
export interface BulkParseResult {
  documentId: string;
  parsed: number;
  failed: number;
  results: Array<{
    citationId: string;
    componentId: string;
    success: boolean;
    error?: string;
  }>;
}

// Filter options for citation list
export interface CitationFilters {
  type?: CitationType;
  style?: CitationStyle;
  minConfidence?: number;
  needsReview?: boolean;         // AC-26: Filter by review status
  page?: number;
  limit?: number;
}

// Paginated response
export interface PaginatedCitations {
  items: Citation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Statistics for dashboard
export interface CitationStats {
  total: number;
  parsed: number;
  unparsed: number;
  needsReview: number;           // AC-26: Count of citations flagged for review
  byType: Record<CitationType, number>;
  byStyle: Record<CitationStyle, number>;
  averageConfidence: number;
}
```

Test: Run `npm run type-check` to verify no TypeScript errors.
```

---

## Prompt 2: Create Citation Service

**File:** `src/services/citation.service.ts`

**Prompt:**
```
Create the Citation API service for frontend.

Create file: src/services/citation.service.ts

```typescript
import { api, ApiResponse } from './api';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

export const citationService = {
  /**
   * Detect citations in an uploaded file
   * POST /api/v1/citation/detect
   */
  async detectFromFile(file: File): Promise<DetectionResult> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<DetectionResult>>(
      '/citation/detect',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data.data;
  },

  /**
   * Detect citations from an existing job's file
   * POST /api/v1/citation/detect/:jobId
   */
  async detectFromJob(jobId: string): Promise<DetectionResult> {
    const response = await api.post<ApiResponse<DetectionResult>>(
      `/citation/detect/${jobId}`
    );
    return response.data.data;
  },

  /**
   * Get all citations for a document
   * GET /api/v1/citation/document/:documentId
   */
  async getByDocument(
    documentId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.style) params.append('style', filters.style);
    if (filters?.minConfidence) params.append('minConfidence', String(filters.minConfidence));
    // AC-26: Filter by review status
    if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<PaginatedCitations>>(
      `/citation/document/${documentId}?${params}`
    );
    return response.data.data;
  },

  /**
   * Get citations by job ID
   * GET /api/v1/citation/job/:jobId
   */
  async getByJob(
    jobId: string,
    filters?: CitationFilters
  ): Promise<PaginatedCitations> {
    const params = new URLSearchParams();
    if (filters?.type) params.append('type', filters.type);
    if (filters?.style) params.append('style', filters.style);
    if (filters?.minConfidence) params.append('minConfidence', String(filters.minConfidence));
    // AC-26: Filter by review status
    if (filters?.needsReview !== undefined) params.append('needsReview', String(filters.needsReview));
    if (filters?.page) params.append('page', String(filters.page));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const response = await api.get<ApiResponse<PaginatedCitations>>(
      `/citation/job/${jobId}?${params}`
    );
    return response.data.data;
  },

  /**
   * Get a single citation with its components
   * GET /api/v1/citation/:citationId
   */
  async getById(citationId: string): Promise<Citation> {
    const response = await api.get<ApiResponse<Citation>>(
      `/citation/${citationId}`
    );
    return response.data.data;
  },

  /**
   * Parse a single citation into components
   * POST /api/v1/citation/:citationId/parse
   */
  async parse(citationId: string): Promise<CitationComponent> {
    const response = await api.post<ApiResponse<CitationComponent>>(
      `/citation/${citationId}/parse`
    );
    return response.data.data;
  },

  /**
   * Parse all citations for a document
   * POST /api/v1/citation/document/:documentId/parse-all
   */
  async parseAll(documentId: string): Promise<BulkParseResult> {
    const response = await api.post<ApiResponse<BulkParseResult>>(
      `/citation/document/${documentId}/parse-all`
    );
    return response.data.data;
  },

  /**
   * Get all parse history for a citation
   * GET /api/v1/citation/:citationId/components
   */
  async getComponents(citationId: string): Promise<CitationComponent[]> {
    const response = await api.get<ApiResponse<CitationComponent[]>>(
      `/citation/${citationId}/components`
    );
    return response.data.data;
  },

  /**
   * Get citation statistics for a document
   * GET /api/v1/citation/document/:documentId/stats
   */
  async getStats(documentId: string): Promise<CitationStats> {
    const response = await api.get<ApiResponse<CitationStats>>(
      `/citation/document/${documentId}/stats`
    );
    return response.data.data;
  },
};
```

Test: Run `npm run type-check` to verify no TypeScript errors.
```

---

## Prompt 3: Create React Query Hooks

**File:** `src/hooks/useCitation.ts`

**Prompt:**
```
Create React Query hooks for Citation Management.

Create file: src/hooks/useCitation.ts

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { citationService } from '@/services/citation.service';
import type {
  Citation,
  CitationComponent,
  DetectionResult,
  BulkParseResult,
  CitationFilters,
  PaginatedCitations,
  CitationStats,
} from '@/types/citation.types';

// Query keys for cache management
export const citationKeys = {
  all: ['citations'] as const,
  byDocument: (documentId: string) => [...citationKeys.all, 'document', documentId] as const,
  byJob: (jobId: string) => [...citationKeys.all, 'job', jobId] as const,
  detail: (id: string) => [...citationKeys.all, 'detail', id] as const,
  components: (id: string) => [...citationKeys.all, 'components', id] as const,
  stats: (documentId: string) => [...citationKeys.all, 'stats', documentId] as const,
};

/**
 * Hook to get citations by job ID
 */
export function useCitationsByJob(jobId: string, filters?: CitationFilters) {
  return useQuery<PaginatedCitations>({
    queryKey: [...citationKeys.byJob(jobId), filters],
    queryFn: () => citationService.getByJob(jobId, filters),
    enabled: !!jobId,
  });
}

/**
 * Hook to get citations by document ID
 */
export function useCitationsByDocument(documentId: string, filters?: CitationFilters) {
  return useQuery<PaginatedCitations>({
    queryKey: [...citationKeys.byDocument(documentId), filters],
    queryFn: () => citationService.getByDocument(documentId, filters),
    enabled: !!documentId,
  });
}

/**
 * Hook to get a single citation with details
 */
export function useCitation(citationId: string) {
  return useQuery<Citation>({
    queryKey: citationKeys.detail(citationId),
    queryFn: () => citationService.getById(citationId),
    enabled: !!citationId,
  });
}

/**
 * Hook to get citation component history
 */
export function useCitationComponents(citationId: string) {
  return useQuery<CitationComponent[]>({
    queryKey: citationKeys.components(citationId),
    queryFn: () => citationService.getComponents(citationId),
    enabled: !!citationId,
  });
}

/**
 * Hook to get citation statistics
 */
export function useCitationStats(documentId: string) {
  return useQuery<CitationStats>({
    queryKey: citationKeys.stats(documentId),
    queryFn: () => citationService.getStats(documentId),
    enabled: !!documentId,
  });
}

/**
 * Hook to detect citations from file upload
 */
export function useDetectCitations() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, Error, File>({
    mutationFn: (file: File) => citationService.detectFromFile(file),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
    },
  });
}

/**
 * Hook to detect citations from existing job
 */
export function useDetectCitationsFromJob() {
  const queryClient = useQueryClient();

  return useMutation<DetectionResult, Error, string>({
    mutationFn: (jobId: string) => citationService.detectFromJob(jobId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
    },
  });
}

/**
 * Hook to parse a single citation
 */
export function useParseCitation() {
  const queryClient = useQueryClient();

  return useMutation<CitationComponent, Error, string>({
    mutationFn: (citationId: string) => citationService.parse(citationId),
    onSuccess: (data, citationId) => {
      // Update citation detail cache
      queryClient.invalidateQueries({ queryKey: citationKeys.detail(citationId) });
      queryClient.invalidateQueries({ queryKey: citationKeys.components(citationId) });
      // Invalidate list queries
      queryClient.invalidateQueries({ queryKey: citationKeys.all });
    },
  });
}

/**
 * Hook to parse all citations in a document
 */
export function useParseAllCitations() {
  const queryClient = useQueryClient();

  return useMutation<BulkParseResult, Error, string>({
    mutationFn: (documentId: string) => citationService.parseAll(documentId),
    onSuccess: (data) => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: citationKeys.byDocument(data.documentId) });
      queryClient.invalidateQueries({ queryKey: citationKeys.stats(data.documentId) });
    },
  });
}
```

Test: Run `npm run type-check` to verify no TypeScript errors.
```

---

## Prompt 4: Create CitationStats Component

**File:** `src/components/citation/CitationStats.tsx`

**Prompt:**
```
Create the CitationStats component showing summary statistics.

Create file: src/components/citation/CitationStats.tsx

```typescript
import {
  FileText,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Quote
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/utils/cn';
import type { CitationStats as CitationStatsType } from '@/types/citation.types';

interface CitationStatsProps {
  stats: CitationStatsType;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}

function StatCard({ title, value, icon: Icon, color, bgColor }: StatCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', bgColor)}>
          <Icon className={cn('h-5 w-5', color)} />
        </div>
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function CitationStats({ stats, isLoading }: CitationStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gray-200 rounded-lg" />
              <div>
                <div className="h-4 w-16 bg-gray-200 rounded mb-1" />
                <div className="h-6 w-12 bg-gray-200 rounded" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const parseRate = stats.total > 0
    ? Math.round((stats.parsed / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      {/* Main stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          title="Total Citations"
          value={stats.total}
          icon={Quote}
          color="text-blue-600"
          bgColor="bg-blue-50"
        />
        <StatCard
          title="Parsed"
          value={stats.parsed}
          icon={CheckCircle}
          color="text-green-600"
          bgColor="bg-green-50"
        />
        <StatCard
          title="Unparsed"
          value={stats.unparsed}
          icon={AlertCircle}
          color="text-yellow-600"
          bgColor="bg-yellow-50"
        />
        {/* AC-26: Show citations needing review */}
        <StatCard
          title="Needs Review"
          value={stats.needsReview}
          icon={AlertTriangle}
          color="text-orange-600"
          bgColor="bg-orange-50"
        />
        <StatCard
          title="Avg Confidence"
          value={`${Math.round(stats.averageConfidence)}%`}
          icon={BarChart3}
          color="text-purple-600"
          bgColor="bg-purple-50"
        />
      </div>

      {/* Type breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Citations by Type
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Object.entries(stats.byType).map(([type, count]) => (
            <div
              key={type}
              className="text-center p-2 bg-gray-50 rounded-lg"
            >
              <p className="text-lg font-semibold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500 capitalize">
                {type.toLowerCase().replace('_', ' ')}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Style breakdown */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Citations by Style
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
          {Object.entries(stats.byStyle).map(([style, count]) => (
            <div
              key={style}
              className="text-center p-2 bg-gray-50 rounded-lg"
            >
              <p className="text-lg font-semibold text-gray-900">{count}</p>
              <p className="text-xs text-gray-500">{style}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Parse progress bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Parse Progress</span>
          <span className="text-sm font-medium text-gray-900">{parseRate}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${parseRate}%` }}
          />
        </div>
      </Card>
    </div>
  );
}
```

Test: Import component in a test page and verify it renders correctly.
```

---

## Prompt 5: Create CitationTypeFilter Component

**File:** `src/components/citation/CitationTypeFilter.tsx`

**Prompt:**
```
Create the CitationTypeFilter component for filtering citations.

Create file: src/components/citation/CitationTypeFilter.tsx

```typescript
import { Filter, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { CitationType, CitationStyle, CitationFilters } from '@/types/citation.types';

interface CitationTypeFilterProps {
  filters: CitationFilters;
  onFilterChange: (filters: CitationFilters) => void;
}

const CITATION_TYPES: CitationType[] = [
  'PARENTHETICAL',
  'NARRATIVE',
  'FOOTNOTE',
  'ENDNOTE',
  'NUMERIC',
  'UNKNOWN',
];

const CITATION_STYLES: CitationStyle[] = [
  'APA',
  'MLA',
  'CHICAGO',
  'VANCOUVER',
  'HARVARD',
  'IEEE',
  'UNKNOWN',
];

const CONFIDENCE_LEVELS = [
  { label: 'All', value: undefined },
  { label: 'High (80%+)', value: 80 },
  { label: 'Medium (50%+)', value: 50 },
  { label: 'Low (<50%)', value: 0 },
];

export function CitationTypeFilter({ filters, onFilterChange }: CitationTypeFilterProps) {
  const hasActiveFilters = filters.type || filters.style || filters.minConfidence || filters.needsReview;

  const handleTypeChange = (type: CitationType | undefined) => {
    onFilterChange({ ...filters, type, page: 1 });
  };

  const handleStyleChange = (style: CitationStyle | undefined) => {
    onFilterChange({ ...filters, style, page: 1 });
  };

  const handleConfidenceChange = (minConfidence: number | undefined) => {
    onFilterChange({ ...filters, minConfidence, page: 1 });
  };

  // AC-26: Toggle needs review filter
  const handleNeedsReviewChange = (needsReview: boolean | undefined) => {
    onFilterChange({ ...filters, needsReview, page: 1 });
  };

  const clearFilters = () => {
    onFilterChange({ page: 1, limit: filters.limit });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-4 w-4 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Citation Type */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Type
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={!filters.type ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              !filters.type && 'bg-blue-600 text-white'
            )}
            onClick={() => handleTypeChange(undefined)}
          >
            All
          </Badge>
          {CITATION_TYPES.map((type) => (
            <Badge
              key={type}
              variant={filters.type === type ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-colors',
                filters.type === type && 'bg-blue-600 text-white'
              )}
              onClick={() => handleTypeChange(type)}
            >
              {type.toLowerCase().replace('_', ' ')}
            </Badge>
          ))}
        </div>
      </div>

      {/* Citation Style */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Citation Style
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={!filters.style ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              !filters.style && 'bg-green-600 text-white'
            )}
            onClick={() => handleStyleChange(undefined)}
          >
            All
          </Badge>
          {CITATION_STYLES.map((style) => (
            <Badge
              key={style}
              variant={filters.style === style ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-colors',
                filters.style === style && 'bg-green-600 text-white'
              )}
              onClick={() => handleStyleChange(style)}
            >
              {style}
            </Badge>
          ))}
        </div>
      </div>

      {/* Confidence Level */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Confidence Level
        </label>
        <div className="flex flex-wrap gap-2">
          {CONFIDENCE_LEVELS.map((level) => (
            <Badge
              key={level.label}
              variant={filters.minConfidence === level.value ? 'default' : 'outline'}
              className={cn(
                'cursor-pointer transition-colors',
                filters.minConfidence === level.value && 'bg-purple-600 text-white'
              )}
              onClick={() => handleConfidenceChange(level.value)}
            >
              {level.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* AC-26: Needs Review Filter */}
      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">
          Review Status
        </label>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filters.needsReview === undefined ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === undefined && 'bg-gray-600 text-white'
            )}
            onClick={() => handleNeedsReviewChange(undefined)}
          >
            All
          </Badge>
          <Badge
            variant={filters.needsReview === true ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors flex items-center gap-1',
              filters.needsReview === true && 'bg-orange-600 text-white'
            )}
            onClick={() => handleNeedsReviewChange(true)}
          >
            <AlertTriangle className="h-3 w-3" />
            Needs Review
          </Badge>
          <Badge
            variant={filters.needsReview === false ? 'default' : 'outline'}
            className={cn(
              'cursor-pointer transition-colors',
              filters.needsReview === false && 'bg-green-600 text-white'
            )}
            onClick={() => handleNeedsReviewChange(false)}
          >
            No Issues
          </Badge>
        </div>
      </div>
    </div>
  );
}
```

Test: Import and use in a parent component to verify filter changes work.
```

---

## Prompt 6: Create CitationList Component

**File:** `src/components/citation/CitationList.tsx`

**Prompt:**
```
Create the CitationList component for displaying detected citations.

Create file: src/components/citation/CitationList.tsx

```typescript
import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Wand2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Quote
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import type { Citation, CitationType, CitationStyle } from '@/types/citation.types';

interface CitationListProps {
  citations: Citation[];
  isLoading?: boolean;
  onParse?: (citationId: string) => void;
  onViewDetail?: (citation: Citation) => void;
  isParsing?: string | null; // citationId being parsed
}

const typeColors: Record<CitationType, string> = {
  PARENTHETICAL: 'bg-blue-100 text-blue-800',
  NARRATIVE: 'bg-green-100 text-green-800',
  FOOTNOTE: 'bg-purple-100 text-purple-800',
  ENDNOTE: 'bg-indigo-100 text-indigo-800',
  NUMERIC: 'bg-orange-100 text-orange-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

const styleColors: Record<CitationStyle, string> = {
  APA: 'bg-sky-100 text-sky-800',
  MLA: 'bg-emerald-100 text-emerald-800',
  CHICAGO: 'bg-amber-100 text-amber-800',
  VANCOUVER: 'bg-rose-100 text-rose-800',
  HARVARD: 'bg-violet-100 text-violet-800',
  IEEE: 'bg-cyan-100 text-cyan-800',
  UNKNOWN: 'bg-gray-100 text-gray-800',
};

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const color = confidence >= 80
    ? 'text-green-600'
    : confidence >= 50
      ? 'text-yellow-600'
      : 'text-red-600';

  return (
    <span className={cn('text-sm font-medium', color)}>
      {confidence}%
    </span>
  );
}

function CitationRow({
  citation,
  onParse,
  onViewDetail,
  isParsing
}: {
  citation: Citation;
  onParse?: (id: string) => void;
  onViewDetail?: (citation: Citation) => void;
  isParsing?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasParsedComponent = !!citation.primaryComponent;

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isExpanded && 'ring-2 ring-blue-200'
    )}>
      {/* Main row */}
      <div
        className="p-4 cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Citation text */}
            <div className="flex items-start gap-2">
              <Quote className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
              <p className="text-sm text-gray-900 font-medium line-clamp-2">
                {citation.rawText}
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge className={typeColors[citation.citationType]}>
                {citation.citationType.toLowerCase().replace('_', ' ')}
              </Badge>
              {citation.detectedStyle && (
                <Badge className={styleColors[citation.detectedStyle]}>
                  {citation.detectedStyle}
                </Badge>
              )}
              {hasParsedComponent ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Parsed
                </Badge>
              ) : (
                <Badge className="bg-yellow-100 text-yellow-800">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unparsed
                </Badge>
              )}
              {/* AC-26: Show needs review badge */}
              {citation.needsReview && (
                <Badge className="bg-orange-100 text-orange-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Needs Review
                </Badge>
              )}
            </div>
          </div>

          {/* Right side: confidence + expand */}
          <div className="flex items-center gap-4">
            <ConfidenceBadge confidence={citation.confidence} />
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
          {/* Location info */}
          <div className="text-xs text-gray-500 flex gap-4">
            {citation.pageNumber && (
              <span>Page: {citation.pageNumber}</span>
            )}
            {citation.paragraphIndex !== null && (
              <span>Paragraph: {citation.paragraphIndex + 1}</span>
            )}
            <span>
              Position: {citation.startOffset}-{citation.endOffset}
            </span>
          </div>

          {/* Parsed component preview */}
          {hasParsedComponent && citation.primaryComponent && (
            <div className="bg-gray-50 p-3 rounded-lg text-sm">
              <p className="text-gray-500 text-xs uppercase tracking-wide mb-2">
                Parsed Components
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {citation.primaryComponent.authors.length > 0 && (
                  <div>
                    <span className="text-gray-500">Authors:</span>{' '}
                    <span className="text-gray-900">
                      {citation.primaryComponent.authors.join(', ')}
                    </span>
                  </div>
                )}
                {citation.primaryComponent.year && (
                  <div>
                    <span className="text-gray-500">Year:</span>{' '}
                    <span className="text-gray-900">{citation.primaryComponent.year}</span>
                  </div>
                )}
                {citation.primaryComponent.title && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Title:</span>{' '}
                    <span className="text-gray-900">{citation.primaryComponent.title}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!hasParsedComponent && onParse && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onParse(citation.id);
                }}
                disabled={isParsing}
              >
                {isParsing ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Parse Citation
                  </>
                )}
              </Button>
            )}
            {onViewDetail && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetail(citation);
                }}
              >
                <ExternalLink className="h-4 w-4 mr-1" />
                View Details
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export function CitationList({
  citations,
  isLoading,
  onParse,
  onViewDetail,
  isParsing
}: CitationListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-4 w-3/4 bg-gray-200 rounded mb-2" />
            <div className="flex gap-2">
              <div className="h-5 w-20 bg-gray-200 rounded" />
              <div className="h-5 w-16 bg-gray-200 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (citations.length === 0) {
    return (
      <Card className="p-8 text-center">
        <Quote className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No citations found</p>
        <p className="text-sm text-gray-400 mt-1">
          Upload a document to detect citations
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {citations.map((citation) => (
        <CitationRow
          key={citation.id}
          citation={citation}
          onParse={onParse}
          onViewDetail={onViewDetail}
          isParsing={isParsing === citation.id}
        />
      ))}
    </div>
  );
}
```

Test: Render with mock citation data to verify layout and interactions.
```

---

## Prompt 7: Create ParsedComponentsView Component

**File:** `src/components/citation/ParsedComponentsView.tsx`

**Prompt:**
```
Create the ParsedComponentsView component for displaying parsed citation details.

Create file: src/components/citation/ParsedComponentsView.tsx

```typescript
import {
  User,
  Calendar,
  BookOpen,
  Building,
  Hash,
  FileText,
  Link,
  ExternalLink,
  Percent,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { CitationComponent, SourceType } from '@/types/citation.types';
import { REVIEW_REASON_LABELS } from '@/types/citation.types';

interface ParsedComponentsViewProps {
  component: CitationComponent;
  isPrimary?: boolean;        // Pass from parent (Citation.primaryComponentId === component.id)
  showConfidence?: boolean;
}

const sourceTypeLabels: Record<SourceType, string> = {
  JOURNAL_ARTICLE: 'Journal Article',
  BOOK: 'Book',
  BOOK_CHAPTER: 'Book Chapter',
  CONFERENCE_PAPER: 'Conference Paper',
  WEBSITE: 'Website',
  THESIS: 'Thesis',
  REPORT: 'Report',
  NEWSPAPER: 'Newspaper',
  MAGAZINE: 'Magazine',
  PATENT: 'Patent',
  LEGAL: 'Legal Document',
  PERSONAL_COMMUNICATION: 'Personal Communication',
  UNKNOWN: 'Unknown',
};

interface FieldRowProps {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
  confidence?: number;
  showConfidence?: boolean;
  isLink?: boolean;
}

function FieldRow({
  icon: Icon,
  label,
  value,
  confidence,
  showConfidence,
  isLink
}: FieldRowProps) {
  if (!value) return null;

  const confidenceColor = confidence
    ? confidence >= 80
      ? 'text-green-600'
      : confidence >= 50
        ? 'text-yellow-600'
        : 'text-red-600'
    : '';

  return (
    <div className="flex items-start gap-3 py-2">
      <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
        <Icon className="h-4 w-4 text-gray-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <p className="text-sm text-gray-900">{value}</p>
        )}
      </div>
      {showConfidence && confidence !== undefined && (
        <div className="flex items-center gap-1">
          <Percent className={cn('h-3 w-3', confidenceColor)} />
          <span className={cn('text-xs font-medium', confidenceColor)}>
            {confidence}%
          </span>
        </div>
      )}
    </div>
  );
}

export function ParsedComponentsView({
  component,
  isPrimary = false,
  showConfidence = true
}: ParsedComponentsViewProps) {
  const { fieldConfidence } = component;

  return (
    <Card className="divide-y divide-gray-100">
      {/* Header with Source Type, Parse Variant, and Primary indicator */}
      <div className="p-4 bg-gray-50 flex items-center gap-2 flex-wrap">
        {component.sourceType && (
          <Badge className="bg-blue-100 text-blue-800">
            {sourceTypeLabels[component.sourceType]}
          </Badge>
        )}
        {/* Parse Variant - which style was used to parse */}
        {component.parseVariant && (
          <Badge className="bg-purple-100 text-purple-800">
            Parsed as {component.parseVariant}
          </Badge>
        )}
        {/* Confidence score */}
        <Badge className={cn(
          component.confidence >= 0.8 ? 'bg-green-100 text-green-800' :
          component.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        )}>
          {Math.round(component.confidence * 100)}% confidence
        </Badge>
        {/* Primary indicator - passed from parent */}
        {isPrimary && (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Primary
          </Badge>
        )}
        {/* AC-26: Needs Review indicator */}
        {component.needsReview && (
          <Badge className="bg-orange-100 text-orange-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Needs Review
          </Badge>
        )}
      </div>

      {/* AC-26: Review reasons panel */}
      {component.needsReview && component.reviewReasons.length > 0 && (
        <div className="p-3 bg-orange-50 border-l-4 border-orange-400">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-orange-800">Review Required</p>
              <ul className="mt-1 text-xs text-orange-700 space-y-0.5">
                {component.reviewReasons.map((reason, idx) => (
                  <li key={idx}>
                    {REVIEW_REASON_LABELS[reason] || reason}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-1">
        {/* Authors */}
        {component.authors.length > 0 && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Authors</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {component.authors.map((author, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {author}
                  </Badge>
                ))}
              </div>
            </div>
            {showConfidence && fieldConfidence.authors !== undefined && (
              <div className="flex items-center gap-1">
                <Percent className={cn(
                  'h-3 w-3',
                  fieldConfidence.authors >= 80 ? 'text-green-600' :
                  fieldConfidence.authors >= 50 ? 'text-yellow-600' : 'text-red-600'
                )} />
                <span className={cn(
                  'text-xs font-medium',
                  fieldConfidence.authors >= 80 ? 'text-green-600' :
                  fieldConfidence.authors >= 50 ? 'text-yellow-600' : 'text-red-600'
                )}>
                  {fieldConfidence.authors}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Year */}
        <FieldRow
          icon={Calendar}
          label="Year"
          value={component.year}
          confidence={fieldConfidence.year}
          showConfidence={showConfidence}
        />

        {/* Title */}
        <FieldRow
          icon={BookOpen}
          label="Title"
          value={component.title}
          confidence={fieldConfidence.title}
          showConfidence={showConfidence}
        />

        {/* Source/Journal */}
        <FieldRow
          icon={Building}
          label="Source"
          value={component.source}
          confidence={fieldConfidence.source}
          showConfidence={showConfidence}
        />

        {/* Volume & Issue */}
        {(component.volume || component.issue) && (
          <div className="flex items-start gap-3 py-2">
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <Hash className="h-4 w-4 text-gray-600" />
            </div>
            <div className="flex-1 min-w-0 flex gap-4">
              {component.volume && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Volume</p>
                  <p className="text-sm text-gray-900">{component.volume}</p>
                </div>
              )}
              {component.issue && (
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">Issue</p>
                  <p className="text-sm text-gray-900">{component.issue}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pages */}
        <FieldRow
          icon={FileText}
          label="Pages"
          value={component.pages}
          confidence={fieldConfidence.pages}
          showConfidence={showConfidence}
        />

        {/* DOI */}
        <FieldRow
          icon={Link}
          label="DOI"
          value={component.doi}
          confidence={fieldConfidence.doi}
          showConfidence={showConfidence}
          isLink={component.doi?.startsWith('http')}
        />

        {/* URL */}
        <FieldRow
          icon={ExternalLink}
          label="URL"
          value={component.url}
          confidence={fieldConfidence.url}
          showConfidence={showConfidence}
          isLink={true}
        />
      </div>

      {/* Parsed date footer */}
      <div className="px-4 py-2 bg-gray-50 text-xs text-gray-500">
        Parsed on {new Date(component.createdAt).toLocaleString()}
      </div>
    </Card>
  );
}
```

Test: Render with mock CitationComponent data to verify all fields display correctly.
```

---

## Prompt 8: Create CitationDetail Component

**File:** `src/components/citation/CitationDetail.tsx`

**Prompt:**
```
Create the CitationDetail modal/panel component for viewing full citation details.

Create file: src/components/citation/CitationDetail.tsx

```typescript
import { useState } from 'react';
import {
  X,
  Quote,
  Wand2,
  History,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Tabs } from '@/components/ui/Tabs';
import { ParsedComponentsView } from './ParsedComponentsView';
import { useCitationComponents, useParseCitation } from '@/hooks/useCitation';
import { cn } from '@/utils/cn';
import type { Citation } from '@/types/citation.types';

interface CitationDetailProps {
  citation: Citation;
  onClose: () => void;
}

export function CitationDetail({ citation, onClose }: CitationDetailProps) {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const {
    data: components,
    isLoading: isLoadingHistory
  } = useCitationComponents(citation.id);

  const parseMutation = useParseCitation();

  const handleParse = () => {
    parseMutation.mutate(citation.id);
  };

  const hasParsedComponent = !!citation.primaryComponent;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Quote className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Citation Details
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto h-[calc(100%-64px)] space-y-6">
          {/* Raw Citation Text */}
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Original Citation
            </h3>
            <p className="text-gray-900 bg-gray-50 p-3 rounded-lg border">
              {citation.rawText}
            </p>

            {/* Metadata badges */}
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge className="bg-blue-100 text-blue-800">
                {citation.citationType.toLowerCase().replace('_', ' ')}
              </Badge>
              {citation.detectedStyle && (
                <Badge className="bg-green-100 text-green-800">
                  {citation.detectedStyle}
                </Badge>
              )}
              <Badge className={cn(
                citation.confidence >= 80 ? 'bg-green-100 text-green-800' :
                citation.confidence >= 50 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              )}>
                {citation.confidence}% confidence
              </Badge>
            </div>

            {/* Location info */}
            <div className="text-xs text-gray-500 mt-3 flex gap-4">
              {citation.pageNumber && (
                <span>Page: {citation.pageNumber}</span>
              )}
              {citation.paragraphIndex !== null && (
                <span>Paragraph: {citation.paragraphIndex + 1}</span>
              )}
              <span>
                Position: {citation.startOffset}-{citation.endOffset}
              </span>
            </div>
          </Card>

          {/* Parsed Components Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                {hasParsedComponent ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Parsed Components
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    Not Yet Parsed
                  </>
                )}
              </h3>
              <Button
                size="sm"
                onClick={handleParse}
                disabled={parseMutation.isPending}
              >
                {parseMutation.isPending ? (
                  <>
                    <Spinner className="h-4 w-4 mr-1" />
                    Parsing...
                  </>
                ) : hasParsedComponent ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Re-parse
                  </>
                ) : (
                  <>
                    <Wand2 className="h-4 w-4 mr-1" />
                    Parse Citation
                  </>
                )}
              </Button>
            </div>

            {/* Success message */}
            {parseMutation.isSuccess && (
              <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                Citation parsed successfully!
              </div>
            )}

            {/* Error message */}
            {parseMutation.isError && (
              <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                Failed to parse citation. Please try again.
              </div>
            )}

            {hasParsedComponent ? (
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as 'current' | 'history')}
              >
                <Tabs.List>
                  <Tabs.Trigger value="current">
                    Current Parse
                  </Tabs.Trigger>
                  <Tabs.Trigger value="history" className="flex items-center gap-1">
                    <History className="h-4 w-4" />
                    History
                    {components && components.length > 1 && (
                      <Badge variant="outline" className="ml-1">
                        {components.length}
                      </Badge>
                    )}
                  </Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="current" className="mt-4">
                  {citation.primaryComponent && (
                    <ParsedComponentsView
                      component={citation.primaryComponent}
                      isPrimary={true}
                    />
                  )}
                </Tabs.Content>

                <Tabs.Content value="history" className="mt-4">
                  {isLoadingHistory ? (
                    <div className="flex justify-center py-8">
                      <Spinner className="h-6 w-6" />
                    </div>
                  ) : components && components.length > 0 ? (
                    <div className="space-y-4">
                      {components.map((comp) => (
                        <div key={comp.id}>
                          <div className="text-xs text-gray-500 mb-2">
                            {comp.parseVariant || 'Unknown style'}
                            {' - '}
                            {new Date(comp.createdAt).toLocaleDateString()}
                          </div>
                          <ParsedComponentsView
                            component={comp}
                            isPrimary={citation.primaryComponentId === comp.id}
                            showConfidence={true}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No parse history available
                    </p>
                  )}
                </Tabs.Content>
              </Tabs>
            ) : (
              <Card className="p-8 text-center">
                <Wand2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">
                  Click "Parse Citation" to extract structured components
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  This will identify authors, year, title, and other metadata
                </p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Test: Open the detail panel with a mock citation to verify all functionality.
```

---

## Prompt 9: Create Component Index Export

**File:** `src/components/citation/index.ts`

**Prompt:**
```
Create the index file to export all citation components.

Create file: src/components/citation/index.ts

```typescript
export { CitationList } from './CitationList';
export { CitationDetail } from './CitationDetail';
export { CitationStats } from './CitationStats';
export { CitationTypeFilter } from './CitationTypeFilter';
export { ParsedComponentsView } from './ParsedComponentsView';
```

Test: Import from '@/components/citation' and verify all exports are available.
```

---

## Prompt 10: Update Hook Index (Optional)

**File:** `src/hooks/index.ts`

**Prompt:**
```
Add citation hooks to the hooks index file if it exists.

Update file: src/hooks/index.ts

Add these exports:

```typescript
// Citation Management
export {
  useCitationsByJob,
  useCitationsByDocument,
  useCitation,
  useCitationComponents,
  useCitationStats,
  useDetectCitations,
  useDetectCitationsFromJob,
  useParseCitation,
  useParseAllCitations,
  citationKeys,
} from './useCitation';
```

Test: Import hooks from '@/hooks' and verify citation hooks are available.
```

---

## Integration Example

Here's how to integrate the citation components into an existing page (e.g., JobDetails):

```typescript
// In a page component like JobDetails.tsx

import { useState } from 'react';
import {
  CitationList,
  CitationDetail,
  CitationStats,
  CitationTypeFilter
} from '@/components/citation';
// USE AVR's shared components
import { FileUploader, ProgressIndicator } from '@/components/shared';
import {
  useCitationsByJob,
  useCitationStats,
  useParseCitation,
  useDetectCitations,
  useParseAllCitations
} from '@/hooks/useCitation';
import type { Citation, CitationFilters } from '@/types/citation.types';

function CitationsTab({ jobId }: { jobId: string }) {
  const [filters, setFilters] = useState<CitationFilters>({ page: 1, limit: 20 });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const { data: citations, isLoading } = useCitationsByJob(jobId, filters);
  const { data: stats } = useCitationStats(citations?.items[0]?.documentId || '');
  const parseMutation = useParseCitation();
  const parseAllMutation = useParseAllCitations();
  const detectMutation = useDetectCitations();

  // Handle file upload for citation detection
  const handleFileUpload = (file: File) => {
    detectMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      {/* File Upload - Using AVR's shared FileUploader */}
      <FileUploader
        onFileSelect={handleFileUpload}
        acceptedTypes={['.pdf', '.docx', '.epub', '.xml']}
        maxSizeMB={50}
        isUploading={detectMutation.isPending}
      />

      {/* Detection Progress - Using AVR's shared ProgressIndicator */}
      {detectMutation.isPending && (
        <ProgressIndicator
          variant="linear"
          label="Detecting citations..."
          indeterminate
        />
      )}

      {/* Stats */}
      {stats && <CitationStats stats={stats} />}

      {/* Bulk Parse Progress */}
      {parseAllMutation.isPending && (
        <ProgressIndicator
          variant="circular"
          label="Parsing all citations..."
          indeterminate
        />
      )}

      {/* Filter */}
      <CitationTypeFilter
        filters={filters}
        onFilterChange={setFilters}
      />

      {/* List */}
      <CitationList
        citations={citations?.items || []}
        isLoading={isLoading}
        onParse={(id) => parseMutation.mutate(id)}
        onViewDetail={setSelectedCitation}
        isParsing={parseMutation.isPending ? parseMutation.variables : null}
      />

      {/* Detail panel */}
      {selectedCitation && (
        <CitationDetail
          citation={selectedCitation}
          onClose={() => setSelectedCitation(null)}
        />
      )}
    </div>
  );
}
```

---

## Verification Checklist

After completing all prompts, verify:

1. **Type Check:**
   ```bash
   npm run type-check
   ```

2. **Lint:**
   ```bash
   npm run lint
   ```

3. **Build:**
   ```bash
   npm run build
   ```

4. **Manual Testing:**
   - [ ] CitationStats renders with mock data
   - [ ] CitationList shows citations correctly
   - [ ] CitationTypeFilter updates filters
   - [ ] CitationDetail opens and closes
   - [ ] ParsedComponentsView displays all fields
   - [ ] Parse button triggers API call
   - [ ] Error states display correctly
   - [ ] Loading states show spinners

5. **API Integration:**
   - [ ] Service methods call correct endpoints
   - [ ] React Query caches and invalidates correctly
   - [ ] Mutations update UI optimistically

---

## Notes

- All components use existing UI primitives from `src/components/ui/`
- TailwindCSS classes only (no inline styles)
- Lucide React icons for consistency
- React Query for all data fetching
- TypeScript strict mode throughout
- Components are self-contained and reusable

---

**Created:** January 2026
**Author:** Dev2 (Sakthi)
**Status:** Ready for Replit execution
