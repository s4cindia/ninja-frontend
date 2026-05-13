/**
 * CSV export of AI-generated image alt text for a job — built to satisfy the
 * PRH UK trial requirement that the *raw, unedited AI output* be delivered
 * **separately** from the human-reviewed alt text in the EPUB.
 *
 * The data already lives end-to-end in the alt-text review queue:
 *   - `shortAlt` / `extendedAlt` are the raw AI output (never mutated after
 *     generation).
 *   - `approvedAlt` is the operator-final version (set only when the
 *     reviewer accepted/edited the suggestion).
 *   - `status`, `approvedBy`, `approvedAt` form the audit trail.
 *
 * No new backend endpoint is needed — `altTextService.getReviewQueue(jobId)`
 * returns everything. This file is the operator-side packaging into a
 * spreadsheet-friendly CSV.
 */

import type { GeneratedAltText } from '@/types/alt-text.types';
import { buildCsv } from './csv-export';

export interface AiAltTextExportOptions {
  /**
   * Filename slug — typically the EPUB base name without extension.
   * Falls back to a generic name if omitted.
   */
  baseName?: string;
}

/**
 * Build the CSV body for the export. Pure function so the CSV shape is
 * easily testable without mocking the alt-text service.
 *
 * Column order is chosen to put raw-AI fields and human-reviewed fields
 * on opposite sides of the row, so PRH's spreadsheet reviewer can
 * visually scan "is the AI suggestion close to the final alt?" without
 * jumping back and forth.
 */
export function buildAiAltTextExportCsv(items: ReadonlyArray<GeneratedAltText>): string {
  return buildCsv<GeneratedAltText>({
    columns: [
      { label: 'image_id', value: (r) => r.imageId },
      // Raw AI output — these fields are set at generation time and never
      // mutated, even when an operator approves or edits the suggestion.
      { label: 'raw_ai_short_alt', value: (r) => r.shortAlt },
      { label: 'raw_ai_extended_alt', value: (r) => r.extendedAlt ?? '' },
      { label: 'ai_confidence', value: (r) => r.confidence },
      { label: 'ai_flags', value: (r) => r.flags.join('; ') },
      { label: 'ai_model', value: (r) => r.aiModel },
      // Audit trail / human-review side.
      { label: 'review_status', value: (r) => r.status },
      { label: 'human_reviewed', value: (r) => (r.approvedAt ? 'yes' : 'no') },
      { label: 'approved_alt', value: (r) => r.approvedAlt ?? '' },
      { label: 'approved_by', value: (r) => r.approvedBy ?? '' },
      { label: 'approved_at', value: (r) => r.approvedAt ?? '' },
      { label: 'generated_at', value: (r) => r.createdAt },
      { label: 'last_updated', value: (r) => r.updatedAt },
    ],
    rows: items,
  });
}

/**
 * Build the export filename. Includes the EPUB base name when supplied so
 * reviewers can keep one file per title in their working folder.
 */
export function buildAiAltTextExportFilename(baseName: string | undefined, today: Date = new Date()): string {
  const slug = baseName?.replace(/\.epub$/i, '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'epub';
  const date = today.toISOString().slice(0, 10);
  return `ai-alt-text-${slug}-${date}.csv`;
}
