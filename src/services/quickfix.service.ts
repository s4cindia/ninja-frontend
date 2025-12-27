import type { QuickFixTemplate } from '@/types/quickfix.types';
import type { AccessibilityIssue } from '@/types/accessibility.types';
import type { FileChange } from '@/types/remediation.types';
import { api, ApiResponse } from './api';

export interface DetectedEpubType {
  value: string;
  file: string;
  count: number;
  suggestedRole: string;
  elementType?: string;
}

export interface ScanEpubTypesResult {
  epubTypes: DetectedEpubType[];
  files: string[];
}

export async function generateFixPreviewFromTemplate(
  template: QuickFixTemplate,
  values: Record<string, unknown>,
  issue: AccessibilityIssue
): Promise<string> {
  const context = {
    issueId: issue.id,
    issueCode: issue.code,
    currentContent: issue.currentContent,
    filePath: issue.filePath,
    lineNumber: issue.lineNumber,
    elementContext: issue.location,
  };

  const fix = template.generateFix(values, context);
  const lines: string[] = [];

  lines.push(`  File: ${fix.targetFile || issue.location || 'content.opf'}`);
  
  fix.changes.forEach(change => {
    if (change.oldContent) {
      change.oldContent.split('\n').forEach(line => {
        lines.push(`- ${line}`);
      });
    }
    if (change.content) {
      change.content.split('\n').forEach(line => {
        lines.push(`+ ${line}`);
      });
    }
  });

  return lines.join('\n');
}

export async function generateFileChangesFromTemplate(
  template: QuickFixTemplate,
  values: Record<string, unknown>,
  issue: AccessibilityIssue
): Promise<FileChange[]> {
  const context = {
    issueId: issue.id,
    issueCode: issue.code,
    currentContent: issue.currentContent,
    filePath: issue.filePath,
    lineNumber: issue.lineNumber,
    elementContext: issue.location,
  };

  const fix = template.generateFix(values, context);

  return fix.changes.map(change => ({
    type: change.type as FileChange['type'],
    filePath: change.filePath || issue.location || 'content.opf',
    content: change.content,
    oldContent: change.oldContent,
    lineNumber: change.lineNumber,
    description: change.description,
  }));
}

export async function applyQuickFixToEpub(
  jobId: string,
  issueId: string,
  changes: FileChange[]
): Promise<{ success: boolean; modifiedFiles: string[]; simulated?: boolean }> {
  try {
    const response = await api.post<ApiResponse<{ success: boolean; modifiedFiles: string[] }>>(
      `/epub/${jobId}/apply-fix`,
      { issueId, changes }
    );
    return response.data.data;
  } catch (error) {
    console.error('Apply fix API failed:', error);
    throw new Error('Failed to apply fix - API unavailable');
  }
}

export function getQuickFixableIssueCodes(): string[] {
  return [
    'EPUB-META-001',
    'EPUB-META-002',
    'EPUB-META-003',
    'EPUB-META-004',
    'EPUB-SEM-001',
    'EPUB-SEM-002',
    'EPUB-SEM-003',
    'EPUB-IMG-001',
    'EPUB-STRUCT-002',
    'EPUB-CONTRAST-001',
    'METADATA-ACCESSMODE',
    'METADATA-ACCESSIBILITYFEATURE',
    'METADATA-ACCESSIBILITYHAZARD',
    'METADATA-ACCESSIBILITYSUMMARY',
    'IMAGE-ALT',
    'IMG-ALT-MISSING',
    'COLOR-CONTRAST',
    'HEADING-ORDER',
    'LANDMARK-UNIQUE',
    'EPUB-TYPE-ROLE',
    'EPUB-TYPE-HAS-MATCHING-ROLE',
  ];
}

export function isQuickFixable(issueCode: string): boolean {
  return getQuickFixableIssueCodes().includes(issueCode.toUpperCase());
}

export async function scanEpubTypes(
  jobId: string,
  filePath?: string
): Promise<ScanEpubTypesResult> {
  try {
    const params = filePath ? `?filePath=${encodeURIComponent(filePath)}` : '';
    const response = await api.get<ApiResponse<ScanEpubTypesResult>>(
      `/epub/job/${jobId}/scan-epub-types${params}`
    );
    return response.data.data;
  } catch (error) {
    console.error('Failed to scan epub:types:', error);
    return { epubTypes: [], files: [] };
  }
}

export async function applyQuickFix(
  jobId: string,
  fixCode: string,
  options?: Record<string, unknown>
): Promise<{ success: boolean; results: unknown[] }> {
  try {
    const response = await api.post<ApiResponse<{ fixCode: string; results: unknown[] }>>(
      `/epub/job/${jobId}/apply-fix`,
      { fixCode, options }
    );
    return { success: true, results: response.data.data.results };
  } catch (error) {
    console.error('Apply quick fix failed:', error);
    throw new Error('Failed to apply quick fix');
  }
}
