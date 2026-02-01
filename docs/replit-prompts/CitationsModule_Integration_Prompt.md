# CitationsModule Integration Prompt

**Repository:** `ninja-frontend`
**Author:** Dev2 (Sakthi)
**Purpose:** Create wrapper component for Editorial Services integration
**Dependency:** AVR's Editorial Services shell (ready Feb 2)

---

## Prerequisites (Do This First!)

Before creating the wrapper component, pull the latest changes from GitHub to get AVR's implemented components:

```bash
# In Replit Shell, run these commands:
git fetch origin
git checkout feature/citation/US-4-1-US-4-2-frontend
git pull origin feature/citation/US-4-1-US-4-2-frontend
```

This ensures you have all of AVR's citation components:
- `CitationList.tsx`
- `CitationDetail.tsx`
- `CitationStats.tsx`
- `CitationTypeFilter.tsx`
- `ParsedComponentsView.tsx`
- `badgeStyles.ts`
- `useCitation.ts` hook
- `citation.service.ts`
- `citation.types.ts`

---

## Context

AVR has implemented all citation components in `src/components/citation/`:
- `CitationList.tsx` - Paginated list with expandable rows
- `CitationDetail.tsx` - Side panel for viewing/parsing
- `CitationStats.tsx` - Dashboard statistics cards
- `CitationTypeFilter.tsx` - Multi-filter UI
- `ParsedComponentsView.tsx` - Parsed component display
- `badgeStyles.ts` - Color definitions

**What's needed:** A single `CitationsModule` wrapper component that AVR can import at `/editorial/citations/:jobId`

---

## Prompt for Replit

````text
Create a wrapper component that combines all citation components into a single entry point.

Create file: src/components/citation/CitationsModule.tsx

```typescript
import { useState } from 'react';
import { CitationList } from './CitationList';
import { CitationDetail } from './CitationDetail';
import { CitationStats } from './CitationStats';
import { CitationTypeFilter } from './CitationTypeFilter';
import {
  useCitationsByJob,
  useCitationStats,
  useParseCitation,
  useParseAllCitations
} from '@/hooks/useCitation';
import { Button } from '@/components/ui/Button';
import { Wand2, AlertCircle } from 'lucide-react';
import type { Citation, CitationFilters } from '@/types/citation.types';

interface CitationsModuleProps {
  jobId: string;
}

export function CitationsModule({ jobId }: CitationsModuleProps) {
  const [filters, setFilters] = useState<CitationFilters>({ page: 1, limit: 20 });
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // Fetch citations for job
  const {
    data: citations,
    isLoading,
    isError,
    error
  } = useCitationsByJob(jobId, filters);

  // Get documentId from first citation
  const documentId = citations?.items[0]?.documentId || '';

  // Fetch stats
  const {
    data: stats,
    isLoading: isLoadingStats
  } = useCitationStats(documentId);

  // Mutations
  const parseMutation = useParseCitation();
  const parseAllMutation = useParseAllCitations();

  // Handle parse all
  const handleParseAll = () => {
    if (documentId) {
      parseAllMutation.mutate(documentId);
    }
  };

  // Calculate unparsed count
  const unparsedCount = stats?.unparsed || 0;

  // Error state
  if (isError) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load citations
        </h2>
        <p className="text-sm text-gray-500">
          {error?.message || 'An unexpected error occurred'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Citation Analysis
          </h2>
          <p className="text-sm text-gray-500">
            Detected citations and parsed components
          </p>
        </div>

        {/* Parse All Button */}
        {unparsedCount > 0 && (
          <Button
            onClick={handleParseAll}
            disabled={parseAllMutation.isPending || !documentId}
          >
            <Wand2 className="h-4 w-4 mr-2" />
            {parseAllMutation.isPending
              ? 'Parsing...'
              : `Parse All (${unparsedCount})`
            }
          </Button>
        )}
      </div>

      {/* Parse All Success/Error Messages */}
      {parseAllMutation.isSuccess && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          Successfully parsed {parseAllMutation.data.parsed} citations.
          {parseAllMutation.data.failed > 0 && (
            <span className="ml-1">
              ({parseAllMutation.data.failed} failed)
            </span>
          )}
        </div>
      )}

      {parseAllMutation.isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          Failed to parse citations. Please try again.
        </div>
      )}

      {/* Statistics */}
      {stats && (
        <CitationStats stats={stats} isLoading={isLoadingStats} />
      )}

      {/* Filters */}
      <CitationTypeFilter filters={filters} onFilterChange={setFilters} />

      {/* Citation List */}
      <CitationList
        citations={citations?.items || []}
        isLoading={isLoading}
        onParse={(id) => parseMutation.mutate(id)}
        onViewDetail={setSelectedCitation}
        isParsing={parseMutation.isPending ? parseMutation.variables : null}
      />

      {/* Pagination */}
      {citations && citations.totalPages > 1 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-gray-500">
            Page {citations.page} of {citations.totalPages}
            <span className="ml-1">({citations.total} total citations)</span>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={citations.page <= 1}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={citations.page >= citations.totalPages}
              onClick={() => setFilters(f => ({ ...f, page: (f.page || 1) + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Side Panel */}
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

Then update the index.ts to export it:

File: src/components/citation/index.ts

Add this export:
```typescript
export { CitationsModule } from './CitationsModule';
```
````

---

## Verification

After creating the component:

```bash
# Type check
npx tsc --noEmit --skipLibCheck

# Run tests
npm test

# Start dev server and test at /test/citations
npm run dev
```

---

## Commit & Push

```bash
git add src/components/citation/CitationsModule.tsx
git add src/components/citation/index.ts
git commit -m "feat(citation): add CitationsModule wrapper for editorial integration

- Single entry point component for /editorial/citations/:jobId
- Composes CitationStats, CitationTypeFilter, CitationList, CitationDetail
- Includes Parse All button with success/error feedback
- Pagination controls for large citation lists
- Error state handling
- Ready for AVR's Editorial Services shell integration

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
git push
```

---

## Integration (AVR's Side)

AVR will use this in the Editorial Services shell:

```tsx
// src/pages/editorial/CitationsPage.tsx
import { useParams, Navigate } from 'react-router-dom';
import { CitationsModule } from '@/components/citation';

export const CitationsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();

  if (!jobId) return <Navigate to="/editorial" />;

  return <CitationsModule jobId={jobId} />;
};
```

Route: `/editorial/citations/:jobId`

---

## Summary

| Task | Owner | Status |
|------|-------|--------|
| Citation components | AVR | ✅ Complete |
| Citation hooks/service | AVR | ✅ Complete |
| CitationsModule wrapper | **Sakthi** | ⏳ To create |
| Editorial Services shell | AVR | ⏳ Feb 2 |
| Route integration | AVR | ⏳ After shell |

---

*Created: February 1, 2026*
