import { useQuery } from '@tanstack/react-query';
import { corpusSummaryService } from '@/services/corpus-summary.service';
import type { DateRange } from '@/types/corpus-summary.types';

// React Query hooks for the Corpus Summary v2 endpoints.
//
// The query key shape is ['corpus', <endpoint>, from, to] so a range change
// produces a fresh cache entry, and we can invalidate the whole 'corpus'
// subtree at once if we ever need to.
//
// Aggregate data — not real-time — so a 60-second staleTime is plenty.

const STALE_MS = 60_000;

export function useLineageSummary(range: DateRange) {
  return useQuery({
    queryKey: ['corpus', 'lineage-summary', range.from, range.to],
    queryFn: () => corpusSummaryService.getLineageSummary(range),
    staleTime: STALE_MS,
  });
}

export function useTimesheetSummary(range: DateRange) {
  return useQuery({
    queryKey: ['corpus', 'timesheet-summary', range.from, range.to],
    queryFn: () => corpusSummaryService.getTimesheetSummary(range),
    staleTime: STALE_MS,
  });
}
