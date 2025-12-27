import type { 
  QuickFixTemplate, 
  QuickFixContext, 
  QuickFix, 
  FileChange,
  QuickFixPreview 
} from '@/types/quickfix.types';
import { getQuickFixTemplate } from '@/data/quickFixTemplates';

export function canQuickFix(issueCode: string): boolean {
  return getQuickFixTemplate(issueCode) !== undefined;
}

export function generateFixPreview(
  template: QuickFixTemplate,
  inputs: Record<string, unknown>,
  context: QuickFixContext
): QuickFixPreview {
  const fix = template.generateFix(inputs, context);
  
  const beforeLines: string[] = [];
  const afterLines: string[] = [];
  const affectedLines: number[] = [];
  
  fix.changes.forEach((change, index) => {
    const lineNum = change.lineNumber ?? index + 1;
    affectedLines.push(lineNum);
    
    switch (change.type) {
      case 'insert':
        afterLines.push(change.content ?? '');
        break;
      case 'replace':
        beforeLines.push(change.oldContent ?? '');
        afterLines.push(change.content ?? '');
        break;
      case 'delete':
        beforeLines.push(change.oldContent ?? '');
        break;
    }
  });
  
  const diff = generateDiffHtml(fix.changes);
  
  return {
    before: beforeLines.join('\n'),
    after: afterLines.join('\n'),
    diff,
    affectedLines,
  };
}

function generateDiffHtml(changes: FileChange[]): string {
  const lines: string[] = [];
  
  changes.forEach(change => {
    switch (change.type) {
      case 'insert':
        if (change.content) {
          change.content.split('\n').forEach(line => {
            lines.push(`<span class="diff-add">+ ${escapeHtml(line)}</span>`);
          });
        }
        break;
      case 'replace':
        if (change.oldContent) {
          change.oldContent.split('\n').forEach(line => {
            lines.push(`<span class="diff-remove">- ${escapeHtml(line)}</span>`);
          });
        }
        if (change.content) {
          change.content.split('\n').forEach(line => {
            lines.push(`<span class="diff-add">+ ${escapeHtml(line)}</span>`);
          });
        }
        break;
      case 'delete':
        if (change.oldContent) {
          change.oldContent.split('\n').forEach(line => {
            lines.push(`<span class="diff-remove">- ${escapeHtml(line)}</span>`);
          });
        }
        break;
    }
  });
  
  return `<div class="diff-container">${lines.join('\n')}</div>`;
}

function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, char => htmlEntities[char] ?? char);
}

export function applyQuickFix(
  template: QuickFixTemplate,
  inputs: Record<string, unknown>,
  context: QuickFixContext
): QuickFix {
  return template.generateFix(inputs, context);
}

export function validateInputs(
  template: QuickFixTemplate,
  inputs: Record<string, unknown>
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  
  template.inputs.forEach(input => {
    if (input.required) {
      const value = inputs[input.id];
      if (value === undefined || value === null || value === '') {
        errors[input.id] = `${input.label} is required`;
      }
      if (Array.isArray(value) && value.length === 0) {
        errors[input.id] = `${input.label} requires at least one selection`;
      }
    }
  });
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function getDefaultInputValues(
  template: QuickFixTemplate
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  
  template.inputs.forEach(input => {
    if (input.default !== undefined) {
      defaults[input.id] = input.default;
    } else {
      switch (input.type) {
        case 'checkbox-group':
          defaults[input.id] = [];
          break;
        case 'radio-group':
          defaults[input.id] = input.options?.[0]?.value ?? '';
          break;
        case 'text':
        case 'textarea':
        case 'color-picker':
          defaults[input.id] = '';
          break;
      }
    }
  });
  
  return defaults;
}

export function formatChangeDescription(change: FileChange): string {
  const path = change.filePath || 'unknown file';
  const line = change.lineNumber ? ` at line ${change.lineNumber}` : '';
  
  switch (change.type) {
    case 'insert':
      return `Insert content into ${path}${line}`;
    case 'replace':
      return `Replace content in ${path}${line}`;
    case 'delete':
      return `Remove content from ${path}${line}`;
    default:
      return `Modify ${path}${line}`;
  }
}
