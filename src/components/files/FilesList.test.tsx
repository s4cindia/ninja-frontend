import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FilesList } from './FilesList';
import type { FileItem } from '@/services/files.service';

function mockFile(overrides?: Partial<FileItem>): FileItem {
  return {
    id: 'file-1',
    filename: 'report.pdf',
    originalName: 'report.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    status: 'UPLOADED',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    ...overrides,
  };
}

describe('FilesList', () => {
  it.each(['PENDING_UPLOAD', 'UPLOADED', 'PROCESSING', 'PROCESSED', 'ERROR'] as const)(
    'renders a status badge for %s without crashing',
    (status) => {
      render(<FilesList files={[mockFile({ status })]} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    }
  );

  it('does not crash the whole page on a status value outside the known FileStatus union', () => {
    // Regression test for a real incident: an orphaned PENDING_UPLOAD record
    // (missing from an earlier version of this map) crashed /files entirely
    // for every viewer, with no error boundary to contain it. This asserts
    // the defensive fallback holds for ANY future unmapped value too.
    const file = mockFile({ status: 'SOME_FUTURE_STATUS' as FileItem['status'] });

    expect(() => render(<FilesList files={[file]} />)).not.toThrow();
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});
