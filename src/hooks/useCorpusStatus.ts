import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchCorpusStatus,
  updateCorpusStatus,
  type CorpusStatusResponse,
  type CorpusStatusRow,
  type UpdateCorpusStatusPayload,
} from '../services/corpus-status.service';

export const CORPUS_STATUS_KEYS = {
  list: () => ['calibration', 'corpus-status'] as const,
};

export function useCorpusStatus() {
  return useQuery({
    queryKey: CORPUS_STATUS_KEYS.list(),
    queryFn: fetchCorpusStatus,
  });
}

interface UpdateVariables {
  documentId: string;
  payload: UpdateCorpusStatusPayload;
}

/**
 * Optimistic update on the corpus-status list cache. On success, the server
 * row replaces our optimistic patch; on error, we roll back to the snapshot.
 */
export function useUpdateCorpusStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, payload }: UpdateVariables) =>
      updateCorpusStatus(documentId, payload),
    onMutate: async ({ documentId, payload }) => {
      await queryClient.cancelQueries({ queryKey: CORPUS_STATUS_KEYS.list() });
      const previous = queryClient.getQueryData<CorpusStatusResponse>(
        CORPUS_STATUS_KEYS.list(),
      );
      if (previous) {
        queryClient.setQueryData<CorpusStatusResponse>(
          CORPUS_STATUS_KEYS.list(),
          {
            ...previous,
            rows: previous.rows.map((row) =>
              row.documentId === documentId
                ? applyOptimisticPatch(row, payload)
                : row,
            ),
          },
        );
      }
      return { previous };
    },
    onError: (_err, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(CORPUS_STATUS_KEYS.list(), context.previous);
      }
    },
    onSettled: () => {
      // Always re-fetch after the mutation settles so derived fields
      // (lastUpdatedAt, derived status, hoursSpent) reflect server state.
      queryClient.invalidateQueries({ queryKey: CORPUS_STATUS_KEYS.list() });
    },
  });
}

/**
 * Build an optimistic version of the row given a partial update payload.
 * Mirrors what we expect the server to do: when statusOverride is set,
 * surface it as the row's `status`; when cleared, leave the existing
 * derived status in place until the refetch lands.
 */
function applyOptimisticPatch(
  row: CorpusStatusRow,
  payload: UpdateCorpusStatusPayload,
): CorpusStatusRow {
  const next: CorpusStatusRow = { ...row };
  if (payload.statusOverride !== undefined) {
    next.statusOverride = payload.statusOverride;
    if (payload.statusOverride !== null) {
      next.status = payload.statusOverride;
    }
  }
  if (payload.statusNote !== undefined) {
    next.statusNote = payload.statusNote.trim() || null;
  }
  next.lastUpdatedAt = new Date().toISOString();
  return next;
}
