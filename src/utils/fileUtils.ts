export type DocumentFileType = 'epub' | 'pdf';

/**
 * Detects the file type based on MIME type and file extension.
 * Checks MIME type first for reliability, then falls back to extension.
 *
 * @param file - The file to detect the type of
 * @returns The detected file type ('epub' or 'pdf'), or null if not recognized
 */
export function detectFileType(file: File): DocumentFileType | null {
  // Check MIME type first (most reliable)
  if (file.type === 'application/pdf') return 'pdf';
  if (file.type === 'application/epub+zip') return 'epub';

  // Fallback to extension
  const extension = file.name.toLowerCase().split('.').pop();
  if (extension === 'pdf') return 'pdf';
  if (extension === 'epub') return 'epub';

  return null;
}

/**
 * Generates the accept attribute value for file inputs based on allowed file types.
 *
 * @param fileTypes - Array of file types to accept
 * @returns Comma-separated string of MIME types and extensions
 */
export function getAcceptedMimeTypes(fileTypes: DocumentFileType[]): string {
  const mimeMap: Record<DocumentFileType, string> = {
    epub: '.epub,application/epub+zip',
    pdf: '.pdf,application/pdf'
  };
  return fileTypes.map(type => mimeMap[type]).join(',');
}

export function isEpubFile(file: { mimeType: string; originalName: string }): boolean {
  return file.mimeType.includes('epub') || file.originalName.toLowerCase().endsWith('.epub');
}
