import type { QuickFixTemplate } from '@/types/quickfix.types';

export const quickFixTemplates: Record<string, QuickFixTemplate> = {};

const issueCodeAliases: Record<string, string> = {
  'METADATA-ACCESSMODE': 'metadata-accessmode',
  'METADATA-ACCESSIBILITYFEATURE': 'metadata-accessibilityfeature',
  'METADATA-ACCESSIBILITYHAZARD': 'metadata-accessibilityhazard',
  'METADATA-ACCESSIBILITYSUMMARY': 'metadata-accessibilitysummary',
  'IMG-ALT-MISSING': 'img-alt-missing',
  'IMG-ALT-EMPTY': 'img-alt-empty',
  'HEADING-ORDER': 'heading-order',
  'HEADING-EMPTY': 'heading-empty',
  'LINK-TEXT-EMPTY': 'link-text-empty',
  'LANG-MISSING': 'lang-missing',
  'TABLE-HEADER-MISSING': 'table-header-missing',
  'ARIA-LABEL-MISSING': 'aria-label-missing',
  'COLOR-CONTRAST': 'color-contrast',
  'EPUB-TYPE-MISSING': 'epub-type-missing',
  'PAGE-BREAK-MISSING': 'page-break-missing',
  'TOC-MISSING': 'toc-missing',
  'LANDMARKS-MISSING': 'landmarks-missing',
};

function normalizeIssueCode(issueCode: string): string {
  const upperCode = issueCode.toUpperCase();
  if (issueCodeAliases[upperCode]) {
    return issueCodeAliases[upperCode];
  }
  return issueCode.toLowerCase().replace(/_/g, '-');
}

export function getQuickFixTemplate(issueCode: string): QuickFixTemplate | undefined {
  const normalizedCode = normalizeIssueCode(issueCode);
  return quickFixTemplates[normalizedCode];
}

export function hasQuickFixTemplate(issueCode: string): boolean {
  return getQuickFixTemplate(issueCode) !== undefined;
}

export function registerQuickFixTemplate(template: QuickFixTemplate): void {
  quickFixTemplates[template.id] = template;
}

export function getAvailableTemplateIds(): string[] {
  return Object.keys(quickFixTemplates);
}
