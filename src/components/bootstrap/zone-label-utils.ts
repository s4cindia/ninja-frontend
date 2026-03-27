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
  // pdfxt / structure tag labels — preserve heading levels
  'p': 'P',
  'h': 'H',
  'h1': 'H1',
  'h2': 'H2',
  'h3': 'H3',
  'h4': 'H4',
  'h5': 'H5',
  'h6': 'H6',
  'tbl': 'TBL',
  'fig': 'FIG',
  'l': 'L',
  'li': 'LI',
  'lbody': 'LI',
  'note': 'NOT',
  'nt': 'NT',
  'toci': 'TOCI',
  'span': 'SPAN',
  'div': 'DIV',
};

export function friendlyLabel(zone: CalibrationZone, source: 'docling' | 'pdfxt' | 'operator'): string {
  const raw =
    source === 'operator' ? zone.operatorLabel :
    source === 'docling' ? zone.doclingLabel :
    zone.pdfxtLabel;
  if (!raw) return '?';
  return LABEL_MAP[raw.toLowerCase()] ?? raw.slice(0, 3).toUpperCase();
}

/** Returns the best available friendly label: operatorLabel > pdfxtLabel > doclingLabel > type */
export function bestFriendlyLabel(zone: CalibrationZone): string {
  if (zone.operatorLabel) return friendlyLabel(zone, 'operator');
  if (zone.pdfxtLabel) return friendlyLabel(zone, 'pdfxt');
  if (zone.doclingLabel) return friendlyLabel(zone, 'docling');
  return LABEL_MAP[zone.type.toLowerCase()] ?? zone.type.slice(0, 3).toUpperCase();
}
