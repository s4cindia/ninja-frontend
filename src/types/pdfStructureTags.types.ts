/**
 * Structure Tag QC Review types -- GET/PATCH /pdf/:jobId/structure-tags*
 * (ninja-backend's structure-tag-inventory.service.ts). Gated by the Full
 * QC toggle (JobSettingsResponse.fullQC in pdfAutoMode.types.ts).
 */

export interface StructureTagBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  pageWidth: number;
  pageHeight: number;
}

export interface StructureTagElement {
  elementId: string;
  tag: string;
  pageNumber: number;
  bbox: StructureTagBoundingBox;
  textSnippet?: string;
  parentElementId?: string;
}

/**
 * The full PDF/UA structure-type vocabulary an operator can retag an
 * element into -- must stay in sync with PDF_UA_STRUCTURE_TAGS in
 * ninja-backend's structure-tag-inventory.service.ts. Duplicated rather
 * than shared, since there's no shared package between these two repos;
 * this is a fixed, rarely-changing spec list (PDF32000-1:2008 standard
 * structure types), so the duplication risk is low.
 */
export const PDF_UA_STRUCTURE_TAGS = [
  'Document', 'Part', 'Art', 'Sect', 'Div', 'BlockQuote', 'Caption', 'TOC', 'TOCI', 'Index',
  'NonStruct', 'Private',
  'P', 'H', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'L', 'LI', 'Lbl', 'LBody',
  'Table', 'TR', 'TH', 'TD', 'THead', 'TBody', 'TFoot',
  'Span', 'Quote', 'Note', 'Reference', 'BibEntry', 'Code', 'Link', 'Annot',
  'Figure', 'Formula', 'Form', 'Artifact',
] as const;
export type PdfUaStructureTag = typeof PDF_UA_STRUCTURE_TAGS[number];
