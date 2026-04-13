/**
 * MarkCompleteModal
 *
 * Captures a structured issue log when an operator clicks "Mark Complete"
 * in Zone Review. The categories are derived from recurring patterns in
 * operator emails (page alignment mismatches, extractor coverage gaps,
 * zone content divergence, etc.) and feed the corpus-level lineage rollup.
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Plus, X, Trash2 } from 'lucide-react';

export type RunIssueCategory =
  | 'PAGE_ALIGNMENT_MISMATCH'
  | 'INSUFFICIENT_JOINT_COVERAGE'
  | 'LIMITED_ZONE_COVERAGE'
  | 'UNEQUAL_EXTRACTOR_COVERAGE'
  | 'SINGLE_EXTRACTOR_ONLY'
  | 'ZONE_CONTENT_DIVERGENCE'
  | 'COMPLETED_WITH_REDUCED_SCOPE'
  | 'OTHER';

export interface RunIssueInput {
  category: RunIssueCategory;
  pagesAffected?: number;
  description: string;
  blocking: boolean;
}

// Local-only stable id so that removing an issue from the middle of the list
// does not shift React's key mapping onto the wrong DOM nodes.
interface RunIssueDraft extends RunIssueInput {
  _key: string;
}

let __issueKeyCounter = 0;
function nextIssueKey(): string {
  __issueKeyCounter += 1;
  return `issue-${__issueKeyCounter}`;
}

export interface MarkCompleteRequest {
  pagesReviewed: number;
  issues: RunIssueInput[];
  notes?: string;
}

interface MarkCompleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MarkCompleteRequest) => Promise<void>;
  documentName: string;
  totalPages: number;
  defaultPagesReviewed: number;
  zonesReviewed: number;
  totalZones: number;
  isSubmitting: boolean;
}

const CATEGORY_OPTIONS: Array<{ value: RunIssueCategory; label: string; hint: string }> = [
  {
    value: 'PAGE_ALIGNMENT_MISMATCH',
    label: 'Page alignment mismatch',
    hint: 'e.g. PDFxt offset by one page vs Docling',
  },
  {
    value: 'INSUFFICIENT_JOINT_COVERAGE',
    label: 'Insufficient joint coverage',
    hint: 'Both extractors do not cover the 150-page minimum',
  },
  {
    value: 'LIMITED_ZONE_COVERAGE',
    label: 'Limited zone coverage',
    hint: 'Extractors produced zones for only a fraction of pages',
  },
  {
    value: 'UNEQUAL_EXTRACTOR_COVERAGE',
    label: 'Unequal extractor coverage',
    hint: 'Docling and PDFxt zone counts diverge significantly',
  },
  {
    value: 'SINGLE_EXTRACTOR_ONLY',
    label: 'Single extractor only',
    hint: 'One extractor produced no zones at all',
  },
  {
    value: 'ZONE_CONTENT_DIVERGENCE',
    label: 'Zone content divergence',
    hint: 'Same position but different content (e.g. list vs paragraph)',
  },
  {
    value: 'COMPLETED_WITH_REDUCED_SCOPE',
    label: 'Completed with reduced scope',
    hint: 'Verification done based on available zoning only',
  },
  {
    value: 'OTHER',
    label: 'Other',
    hint: 'Describe in the text field below',
  },
];

function emptyIssue(): RunIssueDraft {
  return {
    _key: nextIssueKey(),
    category: 'PAGE_ALIGNMENT_MISMATCH',
    description: '',
    blocking: false,
  };
}

export function MarkCompleteModal({
  isOpen,
  onClose,
  onSubmit,
  documentName,
  totalPages,
  defaultPagesReviewed,
  zonesReviewed,
  totalZones,
  isSubmitting,
}: MarkCompleteModalProps) {
  const [pagesReviewed, setPagesReviewed] = useState<number>(defaultPagesReviewed);
  const [issues, setIssues] = useState<RunIssueDraft[]>([]);
  const pagesReviewedRef = useRef<HTMLInputElement | null>(null);
  const errorRef = useRef<HTMLDivElement | null>(null);
  const wasOpenRef = useRef(false);
  // Capture defaultPagesReviewed in a ref so the reset-on-open effect can
  // read the latest value without re-running when it changes mid-session.
  const defaultPagesReviewedRef = useRef(defaultPagesReviewed);
  useEffect(() => {
    defaultPagesReviewedRef.current = defaultPagesReviewed;
  }, [defaultPagesReviewed]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form ONLY on the closed → open transition so stale state from a
  // previous open (issues, notes, error) does not leak through. Crucially we
  // do NOT reset when defaultPagesReviewed changes mid-session — a background
  // React Query refetch updating that prop must not wipe out a user who is
  // mid-way through adding issues.
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setPagesReviewed(defaultPagesReviewedRef.current);
      setIssues([]);
      setNotes('');
      setError(null);
      // Defer focus until after the element mounts.
      const id = window.setTimeout(() => pagesReviewedRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    if (!isOpen && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
    return undefined;
  }, [isOpen]);

  // Escape-to-close — attached to window because divs do not receive keydown
  // events unless they are focusable.
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const clearError = () => {
    if (error) setError(null);
  };

  const handleAddIssue = () => {
    clearError();
    setIssues((prev) => [...prev, emptyIssue()]);
  };
  const handleRemoveIssue = (idx: number) => {
    clearError();
    setIssues((prev) => prev.filter((_, i) => i !== idx));
  };
  const handleUpdateIssue = (idx: number, patch: Partial<RunIssueInput>) => {
    clearError();
    setIssues((prev) => prev.map((issue, i) => (i === idx ? { ...issue, ...patch } : issue)));
  };

  const validate = (): string | null => {
    if (!Number.isInteger(pagesReviewed) || pagesReviewed < 1) {
      return 'Pages reviewed must be a whole number ≥ 1.';
    }
    if (totalPages > 0 && pagesReviewed > totalPages) {
      return `Pages reviewed cannot exceed total pages (${totalPages}).`;
    }
    for (let i = 0; i < issues.length; i++) {
      const issue = issues[i];
      if (issue.category === 'OTHER' && !issue.description.trim()) {
        return `Issue ${i + 1}: description is required for "Other".`;
      }
      if (issue.pagesAffected !== undefined) {
        if (!Number.isInteger(issue.pagesAffected) || issue.pagesAffected < 0) {
          return `Issue ${i + 1}: pages affected must be a whole number ≥ 0.`;
        }
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      // Bring the error into view — the body is scrollable and a long
      // issues list can push the error below the fold.
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      return;
    }
    setError(null);
    const payload: MarkCompleteRequest = {
      pagesReviewed,
      issues: issues.map((i) => ({
        category: i.category,
        pagesAffected: i.pagesAffected,
        description: i.description.trim(),
        blocking: i.blocking,
      })),
      notes: notes.trim() || undefined,
    };
    try {
      await onSubmit(payload);
    } catch (err) {
      // Surface submit failures inside the modal — the parent's banner is
      // hidden behind the backdrop so the user would otherwise see nothing.
      setError(err instanceof Error ? err.message : 'Failed to generate analysis report.');
      requestAnimationFrame(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mark-complete-title"
    >
      <form
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col"
        onSubmit={handleSubmit}
        noValidate
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h3 id="mark-complete-title" className="text-lg font-semibold text-gray-900">
              Mark Annotation Complete
            </h3>
            <p className="text-xs text-gray-500 mt-1 truncate max-w-md" title={documentName}>
              {documentName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3 bg-gray-50 border border-gray-200 rounded-md p-3 text-sm">
            <div>
              <div className="text-xs text-gray-500 uppercase">Pages reviewed</div>
              <input
                ref={pagesReviewedRef}
                type="number"
                min={1}
                max={totalPages || undefined}
                step={1}
                value={Number.isFinite(pagesReviewed) ? pagesReviewed : ''}
                onChange={(e) => {
                  clearError();
                  const raw = e.target.value;
                  if (raw === '') {
                    setPagesReviewed(NaN);
                    return;
                  }
                  const parsed = Number(raw);
                  setPagesReviewed(Number.isFinite(parsed) ? parsed : NaN);
                }}
                // Prevent the scroll-wheel from silently mutating the value
                // while the user is scrolling the modal body.
                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                className="mt-1 w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                aria-label="Pages reviewed"
              />
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Total pages</div>
              <div className="mt-1 text-gray-800 font-medium">{totalPages || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 uppercase">Zones reviewed</div>
              <div className="mt-1 text-gray-800 font-medium">
                {zonesReviewed} / {totalZones}
              </div>
            </div>
          </div>

          {/* Issues */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Issues encountered</h4>
                <p className="text-xs text-gray-500">
                  Log any problems found during annotation so they can be rolled up into the corpus
                  lineage report. Leave empty if there were none.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddIssue}
                className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900"
              >
                <Plus className="w-3.5 h-3.5" />
                Add issue
              </button>
            </div>

            {issues.length === 0 && (
              <div className="text-xs text-gray-400 italic border border-dashed border-gray-200 rounded p-3 text-center">
                No issues logged.
              </div>
            )}

            <div className="space-y-3">
              {issues.map((issue, idx) => {
                const catOption = CATEGORY_OPTIONS.find((o) => o.value === issue.category);
                const descriptionRequired = issue.category === 'OTHER';
                return (
                  <div
                    key={issue._key}
                    className="border border-gray-200 rounded-md p-3 bg-white relative"
                  >
                    <button
                      type="button"
                      onClick={() => handleRemoveIssue(idx)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-600"
                      aria-label={`Remove issue ${idx + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Category
                        </label>
                        <select
                          value={issue.category}
                          onChange={(e) =>
                            handleUpdateIssue(idx, {
                              category: e.target.value as RunIssueCategory,
                            })
                          }
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {catOption && (
                          <p className="text-xs text-gray-400 mt-1">{catOption.hint}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Pages affected
                        </label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={issue.pagesAffected ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              handleUpdateIssue(idx, { pagesAffected: undefined });
                              return;
                            }
                            const parsed = Number(raw);
                            handleUpdateIssue(idx, {
                              pagesAffected: Number.isFinite(parsed) ? parsed : undefined,
                            });
                          }}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          placeholder="—"
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          aria-label={`Pages affected by issue ${idx + 1}`}
                        />
                      </div>

                      <div className="flex items-center mt-5">
                        <label className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={issue.blocking}
                            onChange={(e) =>
                              handleUpdateIssue(idx, { blocking: e.target.checked })
                            }
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                          Blocking?
                        </label>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Description{' '}
                          {descriptionRequired && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          rows={2}
                          value={issue.description}
                          onChange={(e) =>
                            handleUpdateIssue(idx, { description: e.target.value })
                          }
                          placeholder="Describe the issue, pages, and any workaround..."
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                          required={descriptionRequired}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-1">
              Additional notes{' '}
              <span className="text-xs font-normal text-gray-500">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => {
                clearError();
                setNotes(e.target.value);
              }}
              placeholder="Anything else worth capturing alongside the analysis report..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              maxLength={2000}
            />
          </div>

          {error && (
            <div
              ref={errorRef}
              role="alert"
              aria-live="assertive"
              className="bg-red-50 border border-red-200 rounded p-2 text-xs text-red-700"
            >
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Mark Complete &amp; Generate Report
          </Button>
        </div>
      </form>
    </div>
  );
}
