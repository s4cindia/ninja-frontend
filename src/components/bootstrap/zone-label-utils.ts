import type { CalibrationZone } from '@/services/zone-correction.service';

const LABEL_MAP: Record<string, string> = {
  // Docling labels
  'text': 'P',
  'paragraph': 'P',
  'section-header': 'H',
  'section_header': 'H',
  'table': 'TBL',
  'picture': 'FIG',
  'figure': 'FIG',
  'list_item': 'LI',
  'list-item': 'LI',
  'caption': 'CAP',
  'footnote': 'FN',
  'page_header': 'HDR',
  'page_footer': 'FTR',
  'header': 'HDR',
  'footer': 'FTR',
  // pdfxt / structure tag labels
  'p': 'P',
  'h1': 'H',
  'h2': 'H',
  'h3': 'H',
  'h4': 'H',
  'h5': 'H',
  'h6': 'H',
  'tbl': 'TBL',
  'fig': 'FIG',
  'l': 'L',
  'li': 'LI',
  'lbody': 'LI',
  'span': 'SPAN',
  'div': 'DIV',
};

export function friendlyLabel(zone: CalibrationZone, source: 'docling' | 'pdfxt'): string {
  const raw = source === 'docling' ? zone.doclingLabel : zone.pdfxtLabel;
  if (!raw) return '?';
  return LABEL_MAP[raw.toLowerCase()] ?? raw.slice(0, 3).toUpperCase();
}
