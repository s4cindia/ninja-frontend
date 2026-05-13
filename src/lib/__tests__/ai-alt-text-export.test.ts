import { describe, it, expect } from 'vitest';
import {
  buildAiAltTextExportCsv,
  buildAiAltTextExportFilename,
} from '../ai-alt-text-export';
import type { GeneratedAltText } from '@/types/alt-text.types';

function item(over: Partial<GeneratedAltText> = {}): GeneratedAltText {
  return {
    id: 'gen-1',
    imageId: 'img-1',
    jobId: 'job-1',
    shortAlt: 'A grey cat sitting by a window.',
    extendedAlt: 'A medium-haired grey cat sits on a wooden windowsill in afternoon light.',
    confidence: 87,
    flags: ['NEEDS_MANUAL_REVIEW'],
    aiModel: 'gemini-2.0-flash',
    status: 'pending',
    createdAt: '2026-05-10T09:00:00Z',
    updatedAt: '2026-05-10T09:00:00Z',
    ...over,
  };
}

describe('buildAiAltTextExportCsv', () => {
  it('emits the expected header row in the documented order', () => {
    const csv = buildAiAltTextExportCsv([item()]);
    const header = csv.split('\r\n')[0];
    expect(header).toBe(
      'image_id,raw_ai_short_alt,raw_ai_extended_alt,ai_confidence,ai_flags,ai_model,review_status,human_reviewed,approved_alt,approved_by,approved_at,generated_at,last_updated',
    );
  });

  it('writes the raw AI fields verbatim (never replaced by approvedAlt) so PRH can compare', () => {
    const csv = buildAiAltTextExportCsv([
      item({
        shortAlt: 'Raw AI text.',
        approvedAlt: 'Operator-edited text.',
        approvedBy: 'reviewer@example.com',
        approvedAt: '2026-05-10T10:00:00Z',
        status: 'approved',
      }),
    ]);
    expect(csv).toContain('Raw AI text.');
    expect(csv).toContain('Operator-edited text.');
  });

  it('marks human_reviewed = "yes" only when approvedAt is set', () => {
    const csv = buildAiAltTextExportCsv([
      item({ approvedAt: undefined }),
      item({ imageId: 'img-2', approvedAt: '2026-05-10T11:00:00Z', approvedAlt: 'OK' }),
    ]);
    const rows = csv.trim().split('\r\n').slice(1);
    expect(rows[0]).toMatch(/,no,/);
    expect(rows[1]).toMatch(/,yes,/);
  });

  it('joins multiple flags into a single semicolon-separated cell', () => {
    const csv = buildAiAltTextExportCsv([
      item({ flags: ['FACE_DETECTED', 'TEXT_IN_IMAGE', 'NEEDS_MANUAL_REVIEW'] }),
    ]);
    expect(csv).toContain('FACE_DETECTED; TEXT_IN_IMAGE; NEEDS_MANUAL_REVIEW');
  });

  it('quotes fields containing commas so Excel does not split them', () => {
    const csv = buildAiAltTextExportCsv([
      item({ shortAlt: 'A man, a plan, a canal.' }),
    ]);
    expect(csv).toContain('"A man, a plan, a canal."');
  });

  it('escapes embedded double quotes per RFC-4180', () => {
    const csv = buildAiAltTextExportCsv([item({ shortAlt: 'She said "hello".' })]);
    expect(csv).toContain('"She said ""hello""."');
  });

  it('neutralises a formula-trigger AI alt so Excel/Sheets does not auto-execute', () => {
    // The csv-export helper prefixes leading =/+/-/@/\t/\r with a single quote.
    // Without that, an AI suggestion starting with "=" (which the model has
    // been observed to do for alt text like "=Reaction shot=") would be
    // interpreted as a formula by spreadsheet apps.
    const csv = buildAiAltTextExportCsv([item({ shortAlt: '=cmd|/c calc' })]);
    expect(csv).toContain("'=cmd|/c calc");
  });

  it('emits no data rows for an empty input but still writes the header', () => {
    const csv = buildAiAltTextExportCsv([]);
    const lines = csv.split('\r\n').filter((l) => l.length > 0);
    expect(lines).toHaveLength(1); // header only
    expect(lines[0]).toMatch(/^image_id,/);
  });

  it('renders missing extendedAlt / approvedAlt as empty cells, not "undefined"', () => {
    const csv = buildAiAltTextExportCsv([
      item({ extendedAlt: undefined, approvedAlt: undefined, approvedBy: undefined, approvedAt: undefined }),
    ]);
    expect(csv).not.toContain('undefined');
  });
});

describe('buildAiAltTextExportFilename', () => {
  it('strips a trailing .epub from the base name and appends today\'s date', () => {
    const name = buildAiAltTextExportFilename(
      'The-Midnight-Library.epub',
      new Date('2026-05-13T00:00:00Z'),
    );
    expect(name).toBe('ai-alt-text-The-Midnight-Library-2026-05-13.csv');
  });

  it('sanitises spaces and other shell-unfriendly characters in the base name', () => {
    const name = buildAiAltTextExportFilename(
      'Billy and the Giant Adventure.epub',
      new Date('2026-05-13T00:00:00Z'),
    );
    expect(name).toBe('ai-alt-text-Billy_and_the_Giant_Adventure-2026-05-13.csv');
  });

  it('uses a generic "epub" stem when the base name is missing', () => {
    const name = buildAiAltTextExportFilename(undefined, new Date('2026-05-13T00:00:00Z'));
    expect(name).toBe('ai-alt-text-epub-2026-05-13.csv');
  });
});
