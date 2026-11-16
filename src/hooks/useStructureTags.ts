/**
 * Structure Tag QC Review — job-scoped hooks, gated by the Full QC toggle
 * (see useJobSettings in useAutoMode.ts / JobSettingsResponse.fullQC).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { pdfStructureTagsService } from '@/services/pdfStructureTags.service';
import type { StructureTagElement } from '@/types/pdfStructureTags.types';

const STRUCTURE_TAGS_KEY = (jobId: string, page: number) => ['pdf-structure-tags', jobId, page] as const;

/**
 * Every structure element on `page`, with its current tag and bounding box.
 * `opts.enabled` lets the caller fetch only while structure-tag review mode
 * is actually active, same convention as useJobSettings/useBudgetEstimate.
 */
export function useStructureTags(jobId: string | undefined, page: number, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: STRUCTURE_TAGS_KEY(jobId ?? '', page),
    queryFn: () => pdfStructureTagsService.getStructureTagsForPage(jobId!, page),
    enabled: !!jobId && page >= 1 && (opts?.enabled ?? true),
  });
}

/**
 * Retags a single element, applied immediately. Patches the current page's
 * cached list in place with the response rather than refetching, so the
 * overlay updates without a round trip.
 */
export function useRetagStructureElement(jobId: string | undefined, page: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ elementId, newTag }: { elementId: string; newTag: string }) =>
      pdfStructureTagsService.retagStructureElement(jobId!, elementId, newTag),
    onSuccess: (updated) => {
      if (!jobId) return;
      queryClient.setQueryData<StructureTagElement[]>(STRUCTURE_TAGS_KEY(jobId, page), (prev) =>
        prev ? prev.map((el) => (el.elementId === updated.elementId ? updated : el)) : prev
      );
    },
  });
}
