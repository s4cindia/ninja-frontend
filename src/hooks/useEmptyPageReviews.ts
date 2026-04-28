import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteEmptyPageReview,
  getEmptyPageReview,
  listEmptyPageReviews,
  saveEmptyPageReview,
  type SaveEmptyPageReviewPayload,
} from '../services/empty-page-review.service';

export const EMPTY_PAGE_REVIEW_KEYS = {
  list: (runId: string) => ['calibration', 'empty-page-reviews', runId] as const,
  one: (runId: string, pageNumber: number) =>
    ['calibration', 'empty-page-reviews', runId, pageNumber] as const,
};

export function useEmptyPageReviews(runId: string) {
  return useQuery({
    queryKey: EMPTY_PAGE_REVIEW_KEYS.list(runId),
    queryFn: () => listEmptyPageReviews(runId),
    enabled: !!runId,
  });
}

export function useEmptyPageReview(runId: string, pageNumber: number) {
  return useQuery({
    queryKey: EMPTY_PAGE_REVIEW_KEYS.one(runId, pageNumber),
    queryFn: () => getEmptyPageReview(runId, pageNumber),
    enabled: !!runId && Number.isInteger(pageNumber) && pageNumber > 0,
  });
}

export function useSaveEmptyPageReview(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      pageNumber,
      payload,
    }: {
      pageNumber: number;
      payload: SaveEmptyPageReviewPayload;
    }) => saveEmptyPageReview(runId, pageNumber, payload),
    onSuccess: (_data, { pageNumber }) => {
      qc.invalidateQueries({ queryKey: EMPTY_PAGE_REVIEW_KEYS.list(runId) });
      qc.invalidateQueries({
        queryKey: EMPTY_PAGE_REVIEW_KEYS.one(runId, pageNumber),
      });
    },
  });
}

export function useDeleteEmptyPageReview(runId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pageNumber: number) => deleteEmptyPageReview(runId, pageNumber),
    onSuccess: (_data, pageNumber) => {
      qc.invalidateQueries({ queryKey: EMPTY_PAGE_REVIEW_KEYS.list(runId) });
      qc.invalidateQueries({
        queryKey: EMPTY_PAGE_REVIEW_KEYS.one(runId, pageNumber),
      });
    },
  });
}
