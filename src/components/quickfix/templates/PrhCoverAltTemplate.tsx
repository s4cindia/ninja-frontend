/**
 * Quick-fix dialog body for `PRH-COVER-ALT-EMPTY`.
 *
 * The PRH UK audit fires this code on EPUBs whose cover image has an empty
 * or missing `alt`. The backend (ninja-backend PR #377) routes the fix
 * through the same `POST /epub/job/:jobId/apply-fix` endpoint as
 * `EPUB-IMG-001`, but with a stricter validator: `imageAlts` must be
 * non-empty, `imageSrc` must be non-whitespace, `altText` must be
 * non-whitespace. 400 responses carry a human-readable message naming
 * the offending field — surface it in the dialog so the operator can
 * fix in place rather than re-opening the panel.
 *
 * Cover image src is extracted from whatever issue field carries the
 * surrounding HTML; if extraction fails we expose the src as a manual
 * input so the operator can paste it.
 */

import { useState, useEffect, useId } from 'react';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import { extractCoverImageSrc, type CoverIssue } from './prh-cover-extract';

interface PrhCoverAltTemplateProps {
  issue: CoverIssue;
  /** Used to pre-fill the alt-text input as "Cover for {bookTitle}". */
  bookTitle?: string;
  altText: string;
  onAltTextChange: (value: string) => void;
  imageSrc: string;
  onImageSrcChange: (value: string) => void;
  /** Backend validation message, if any (rendered in-dialog). */
  apiError: string | null;
  isApplying: boolean;
}

export function PrhCoverAltTemplate({
  issue,
  bookTitle,
  altText,
  onAltTextChange,
  imageSrc,
  onImageSrcChange,
  apiError,
  isApplying,
}: PrhCoverAltTemplateProps) {
  const altInputId = useId();
  const srcInputId = useId();

  // Pre-fill on mount only — never overwrite something the operator has
  // already typed (re-renders from parent prop changes shouldn't clobber).
  const [hasInitialised, setHasInitialised] = useState(false);
  useEffect(() => {
    if (hasInitialised) return;
    if (!altText) {
      if (bookTitle && bookTitle.trim()) {
        onAltTextChange(`Cover for ${bookTitle.trim()}`);
      }
    }
    if (!imageSrc) {
      const extracted = extractCoverImageSrc(issue);
      if (extracted) onImageSrcChange(extracted);
    }
    setHasInitialised(true);
    // Run once when the component mounts for a given issue. Re-running on
    // every render would race with the user typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const extractedSrcMissing = imageSrc.trim() === '';

  return (
    <div className="space-y-4">
      <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg flex gap-2">
        <BookOpen className="h-4 w-4 text-teal-600 shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-teal-900 leading-relaxed">
          PRH UK requires descriptive alt text on the cover image so screen-reader
          users can identify the book. Keep it short and specific — for example,
          <em> "Cover for The Midnight Library by Matt Haig"</em>.
        </p>
      </div>

      <div>
        <label htmlFor={srcInputId} className="block text-sm font-medium text-gray-700 mb-1">
          Cover image path
          {extractedSrcMissing && <span className="ml-1 text-red-600">*</span>}
        </label>
        <input
          id={srcInputId}
          type="text"
          value={imageSrc}
          onChange={(e) => onImageSrcChange(e.target.value)}
          placeholder="e.g., EPUB/images/cover.jpg"
          disabled={isApplying}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          {extractedSrcMissing
            ? 'Could not detect the cover image src — paste the path from the EPUB.'
            : 'Auto-detected from the audit issue. Edit if it points to the wrong image.'}
        </p>
      </div>

      <div>
        <label htmlFor={altInputId} className="block text-sm font-medium text-gray-700 mb-1">
          Alt text <span className="text-red-600">*</span>
        </label>
        <textarea
          id={altInputId}
          value={altText}
          onChange={(e) => onAltTextChange(e.target.value)}
          rows={2}
          placeholder={
            bookTitle ? `Cover for ${bookTitle}` : 'e.g., Cover for [Book Title]'
          }
          maxLength={250}
          disabled={isApplying}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>Describe what the cover shows; max 250 chars.</span>
          <span>{altText.length}/250</span>
        </div>
      </div>

      {apiError && (
        <div
          role="alert"
          aria-live="polite"
          className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md"
        >
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
          <div className="text-sm text-red-700">
            <p className="font-medium">Server rejected the fix</p>
            <p className="mt-0.5">{apiError}</p>
          </div>
        </div>
      )}

      {isApplying && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Applying cover alt-text fix…
        </div>
      )}

      <p className="text-xs text-gray-400" data-testid="prh-cover-issue-location">
        Issue location: <span className="font-mono">{issue.location ?? '(unknown)'}</span>
      </p>
    </div>
  );
}
