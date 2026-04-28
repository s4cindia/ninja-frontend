import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Save, Trash2 } from 'lucide-react';
import {
  DETECTION_FAILURE_PAGE_TYPES,
  EMPTY_PAGE_CATEGORIES,
  EMPTY_PAGE_TYPES,
  LEGIT_EMPTY_PAGE_TYPES,
  type EmptyPageCategory,
  type EmptyPageType,
} from '@/services/empty-page-review.service';
import {
  useDeleteEmptyPageReview,
  useEmptyPageReview,
  useSaveEmptyPageReview,
} from '@/hooks/useEmptyPageReviews';
import { trackEvent } from '@/lib/telemetry';

interface EmptyPageReviewSidebarProps {
  runId: string;
  pageNumber: number;
  filename?: string;
}

const CATEGORY_LABEL: Record<EmptyPageCategory, string> = {
  LEGIT_EMPTY: 'Legit empty',
  DETECTION_FAILURE: 'Detection failure',
  UNSURE: 'Unsure',
};

const CATEGORY_DESCRIPTION: Record<EmptyPageCategory, string> = {
  LEGIT_EMPTY: 'Page is meant to be empty (blank, image plate, copyright, etc.)',
  DETECTION_FAILURE: 'Page has content the model should have detected',
  UNSURE: 'Borderline — flag for joint review',
};

function formatPageTypeLabel(value: string): string {
  return value.replace(/_/g, ' ');
}

function pageTypesForCategory(
  category: EmptyPageCategory | null,
): ReadonlyArray<EmptyPageType> {
  if (category === 'LEGIT_EMPTY') return LEGIT_EMPTY_PAGE_TYPES;
  if (category === 'DETECTION_FAILURE' || category === 'UNSURE') {
    // DETECTION_FAILURE_PAGE_TYPES already includes 'mixed'; append 'other' as catch-all.
    return [...DETECTION_FAILURE_PAGE_TYPES, 'other'];
  }
  return EMPTY_PAGE_TYPES;
}

export function EmptyPageReviewSidebar({
  runId,
  pageNumber,
  filename,
}: EmptyPageReviewSidebarProps) {
  const { data: existing, isLoading } = useEmptyPageReview(runId, pageNumber);
  const saveMutation = useSaveEmptyPageReview(runId);
  const deleteMutation = useDeleteEmptyPageReview(runId);

  const [category, setCategory] = useState<EmptyPageCategory | null>(null);
  const [pageType, setPageType] = useState<string>('');
  const [expectedContent, setExpectedContent] = useState('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);

  // Reset form when navigating to a different page or when the loaded review changes.
  useEffect(() => {
    if (existing) {
      setCategory(existing.category);
      setPageType(existing.pageType);
      setExpectedContent(existing.expectedContent ?? '');
      setNotes(existing.notes ?? '');
    } else {
      setCategory(null);
      setPageType('');
      setExpectedContent('');
      setNotes('');
    }
    setFeedback(null);
    setPendingDelete(false);
  }, [existing, pageNumber, runId]);

  // When category changes, ensure the selected pageType is still valid for that
  // category. If not, clear it so the operator picks again.
  useEffect(() => {
    if (!category || !pageType) return;
    const allowed = pageTypesForCategory(category);
    if (!allowed.includes(pageType as EmptyPageType)) {
      setPageType('');
    }
  }, [category, pageType]);

  const isDirty = useMemo(() => {
    if (!existing) {
      return (
        category !== null ||
        pageType !== '' ||
        expectedContent !== '' ||
        notes !== ''
      );
    }
    return (
      category !== existing.category ||
      pageType !== existing.pageType ||
      expectedContent !== (existing.expectedContent ?? '') ||
      notes !== (existing.notes ?? '')
    );
  }, [existing, category, pageType, expectedContent, notes]);

  const requiresExpectedContent = category === 'DETECTION_FAILURE';
  const isValid =
    category !== null &&
    pageType !== '' &&
    (!requiresExpectedContent || expectedContent.trim().length > 0);

  const isSaving = saveMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const handleSave = useCallback(async () => {
    if (!category || !pageType || !isValid) return;
    setFeedback(null);
    const wasUpdate = !!existing;
    try {
      await saveMutation.mutateAsync({
        pageNumber,
        payload: {
          category,
          pageType,
          expectedContent: expectedContent.trim() || undefined,
          notes: notes.trim() || undefined,
        },
      });
      setFeedback({ kind: 'success', text: 'Review saved.' });
      trackEvent('empty-page-review.save', {
        runId,
        pageNumber,
        category,
        pageType,
        wasUpdate,
        expectedContentLength: expectedContent.trim().length,
        notesLength: notes.trim().length,
      });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to save review.',
      });
      trackEvent('empty-page-review.save-error', {
        runId,
        pageNumber,
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  }, [
    category,
    pageType,
    isValid,
    existing,
    saveMutation,
    pageNumber,
    expectedContent,
    notes,
    runId,
  ]);

  const handleDelete = async () => {
    if (!existing) return;
    setFeedback(null);
    try {
      await deleteMutation.mutateAsync(pageNumber);
      setFeedback({ kind: 'success', text: 'Review cleared.' });
      setPendingDelete(false);
      trackEvent('empty-page-review.delete', { runId, pageNumber });
    } catch (err) {
      setFeedback({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Failed to clear review.',
      });
      trackEvent('empty-page-review.delete-error', {
        runId,
        pageNumber,
        message: err instanceof Error ? err.message : 'unknown',
      });
    }
  };

  // Cmd/Ctrl+S to save when this component is mounted on a focused page.
  // Always preventDefault to suppress the browser's "save page" dialog —
  // even when our own save would no-op (no category yet, etc).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (isValid && isDirty && !isSaving) handleSave();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isValid, isDirty, isSaving, handleSave]);

  // Browser-level guard: warn before tab close / refresh / external nav while
  // the form has unsaved changes. (In-app navigation between empty pages still
  // discards changes silently — the visible "Unsaved changes" indicator is the
  // mitigation there.)
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the returnValue text but require it to be set.
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  const allowedPageTypes = pageTypesForCategory(category);

  return (
    <div className="w-72 border-l border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-2 bg-amber-50 border-b border-amber-200">
        <div className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
          Empty page {pageNumber}
        </div>
        {filename && (
          <div
            className="text-[11px] text-amber-700 truncate"
            title={filename}
          >
            {filename}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-xs text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin mr-1" />
          Loading…
        </div>
      ) : (
        <div className="flex-1 overflow-auto px-3 py-3 space-y-4 text-xs">
          {/* Category */}
          <fieldset className="space-y-1">
            <legend className="font-semibold text-gray-700 mb-1">
              Category
            </legend>
            {EMPTY_PAGE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={`flex items-start gap-2 px-2 py-1.5 rounded border cursor-pointer transition-colors ${
                  category === c
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="mt-0.5"
                />
                <span className="flex-1">
                  <span className="block font-medium text-gray-800">
                    {CATEGORY_LABEL[c]}
                  </span>
                  <span className="block text-gray-500 leading-tight">
                    {CATEGORY_DESCRIPTION[c]}
                  </span>
                </span>
              </label>
            ))}
          </fieldset>

          {/* Page type */}
          <div className="space-y-1">
            <label
              htmlFor="empty-page-type"
              className="block font-semibold text-gray-700"
            >
              Page type
            </label>
            <select
              id="empty-page-type"
              value={pageType}
              onChange={(e) => setPageType(e.target.value)}
              disabled={!category}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">
                {category ? 'Select a page type…' : 'Pick a category first'}
              </option>
              {allowedPageTypes.map((pt) => (
                <option key={pt} value={pt}>
                  {formatPageTypeLabel(pt)}
                </option>
              ))}
            </select>
          </div>

          {/* Expected content */}
          {(category === 'DETECTION_FAILURE' || category === 'UNSURE') && (
            <div className="space-y-1">
              <label
                htmlFor="empty-page-expected-content"
                className="block font-semibold text-gray-700"
              >
                Expected content{' '}
                {requiresExpectedContent && (
                  <span className="text-red-600">*</span>
                )}
              </label>
              <textarea
                id="empty-page-expected-content"
                value={expectedContent}
                onChange={(e) => setExpectedContent(e.target.value)}
                rows={3}
                placeholder='e.g. "Two-column body text with footnotes"'
                className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1">
            <label
              htmlFor="empty-page-notes"
              className="block font-semibold text-gray-700"
            >
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="empty-page-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-400 resize-y"
            />
          </div>

          {feedback && (
            <div
              className={`text-xs px-2 py-1.5 rounded ${
                feedback.kind === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>
      )}

      {!isLoading && (
        <div className="border-t border-gray-200 px-3 py-2 space-y-2 bg-gray-50">
          {existing && (
            <div className="text-[11px] text-gray-500">
              Last reviewed by{' '}
              <span className="text-gray-700">
                {existing.annotator.firstName} {existing.annotator.lastName}
              </span>{' '}
              on{' '}
              <span className="text-gray-700">
                {new Date(existing.reviewedAt).toLocaleDateString()}
              </span>
              {isDirty && (
                <span className="ml-1 text-amber-700 font-medium">
                  · unsaved changes
                </span>
              )}
            </div>
          )}
          {!existing && isDirty && (
            <div className="text-[11px] text-amber-700 font-medium">
              Unsaved changes
            </div>
          )}
          {pendingDelete ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Confirm clear
              </button>
              <button
                type="button"
                onClick={() => setPendingDelete(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!isValid || isSaving || (!isDirty && !!existing)}
                title="Save (Ctrl/Cmd+S)"
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded bg-[#006B6B] text-white hover:bg-[#005858] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Save className="h-3 w-3" />
                )}
                {existing ? 'Update' : 'Save'}
              </button>
              {existing && (
                <button
                  type="button"
                  onClick={() => setPendingDelete(true)}
                  title="Clear this review"
                  className="inline-flex items-center justify-center px-2 py-1.5 text-xs rounded border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
