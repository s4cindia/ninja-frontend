import { api } from '@/services/api';

export interface ApplyAllAiSuggestionsResult {
  applied: number;
  failed: number;
  errors?: Array<{ issueId: string; suggestionType: string; reason: string }>;
}

/**
 * Applies all AI suggestions in bulk. Defaults to approved-only, matching the
 * backend's default and keeping the human review step (pending → approved)
 * meaningful — passing includePending bypasses that review entirely.
 */
export async function applyAllAiSuggestions(
  jobId: string,
  includePending = false
): Promise<ApplyAllAiSuggestionsResult> {
  const res = await api.post<{ data: ApplyAllAiSuggestionsResult }>(
    `/pdf/${encodeURIComponent(jobId)}/ai-analysis/apply-all${includePending ? '?includePending=true' : ''}`
  );
  return res.data.data;
}
