export const SUPPORTED_FORMATS = {
  PDF: { extension: '.pdf', mimeType: 'application/pdf' },
  EPUB: { extension: '.epub', mimeType: 'application/epub+zip' },
  DOCX: { extension: '.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  TXT: { extension: '.txt', mimeType: 'text/plain' },
  XML: { extension: '.xml', mimeType: 'application/xml' },
} as const;

export type SupportedFormat = keyof typeof SUPPORTED_FORMATS;
