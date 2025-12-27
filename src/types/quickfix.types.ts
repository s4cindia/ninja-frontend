export type QuickFixInputType = 
  | 'checkbox-group' 
  | 'radio-group' 
  | 'text' 
  | 'textarea' 
  | 'color-picker';

export interface QuickFixInputOption {
  value: string;
  label: string;
  description?: string;
}

export interface QuickFixInput {
  type: QuickFixInputType;
  id: string;
  label: string;
  options?: QuickFixInputOption[];
  default?: string | string[] | boolean;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
}

export interface FileChange {
  type: 'insert' | 'replace' | 'delete';
  filePath: string;
  content?: string;
  oldContent?: string;
  lineNumber?: number;
  description?: string;
}

export interface QuickFix {
  issueId: string;
  targetFile: string;
  changes: FileChange[];
  summary?: string;
}

export interface QuickFixTemplate {
  id: string;
  title: string;
  description: string;
  targetFile: string;
  inputs: QuickFixInput[];
  generateFix: (inputs: Record<string, unknown>, context: QuickFixContext) => QuickFix;
}

export interface QuickFixContext {
  issueId: string;
  issueCode: string;
  currentContent?: string;
  filePath?: string;
  lineNumber?: number;
  elementContext?: string;
}

export interface QuickFixPreview {
  before: string;
  after: string;
  diff: string;
  affectedLines: number[];
}
