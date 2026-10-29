import { describe, it, expect } from 'vitest';
import { detectFileType, isEpubFile, isPdfFile } from './fileUtils';

describe('detectFileType', () => {
  it('detects a PDF by MIME type', () => {
    const file = new File(['x'], 'doc', { type: 'application/pdf' });
    expect(detectFileType(file)).toBe('pdf');
  });

  it('detects an EPUB by MIME type', () => {
    const file = new File(['x'], 'doc', { type: 'application/epub+zip' });
    expect(detectFileType(file)).toBe('epub');
  });

  it('falls back to the file extension when the MIME type is unrecognized', () => {
    const pdf = new File(['x'], 'report.PDF', { type: '' });
    const epub = new File(['x'], 'book.EPUB', { type: '' });
    expect(detectFileType(pdf)).toBe('pdf');
    expect(detectFileType(epub)).toBe('epub');
  });

  it('returns null for an unrecognized file', () => {
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });
    expect(detectFileType(file)).toBeNull();
  });
});

describe('isEpubFile', () => {
  it('matches by MIME type', () => {
    expect(isEpubFile({ mimeType: 'application/epub+zip', originalName: 'book.bin' })).toBe(true);
  });

  it('matches by extension when the MIME type does not say so', () => {
    expect(isEpubFile({ mimeType: 'application/octet-stream', originalName: 'Book.EPUB' })).toBe(true);
  });

  it('does not match a PDF', () => {
    expect(isEpubFile({ mimeType: 'application/pdf', originalName: 'report.pdf' })).toBe(false);
  });
});

describe('isPdfFile', () => {
  // This is the branch Files.tsx's handleView depends on to route a
  // completed PDF file to /pdf/audit/:jobId instead of the EPUB-only
  // /epub?jobId=... path -- see Files.tsx's own regression coverage note.
  it('matches by MIME type', () => {
    expect(isPdfFile({ mimeType: 'application/pdf', originalName: 'report.bin' })).toBe(true);
  });

  it('matches by extension when the MIME type does not say so', () => {
    expect(isPdfFile({ mimeType: 'application/octet-stream', originalName: 'Report.PDF' })).toBe(true);
  });

  it('does not match an EPUB', () => {
    expect(isPdfFile({ mimeType: 'application/epub+zip', originalName: 'book.epub' })).toBe(false);
  });

  it('does not match an unrelated file', () => {
    expect(isPdfFile({ mimeType: 'text/plain', originalName: 'notes.txt' })).toBe(false);
  });
});
