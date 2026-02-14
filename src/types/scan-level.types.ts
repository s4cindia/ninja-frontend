/**
 * Scan Level Types
 *
 * Defines different levels of PDF accessibility scanning for the frontend.
 * Must match backend types in src/types/scan-level.types.ts
 */

export type ScanLevel = 'basic' | 'comprehensive' | 'custom';

export type ValidatorType =
  | 'structure'
  | 'alt-text'
  | 'contrast'
  | 'tables'
  | 'headings'
  | 'reading-order'
  | 'lists'
  | 'language'
  | 'metadata';

export interface ScanLevelConfig {
  level: ScanLevel;
  name: string;
  description: string;
  estimatedTime: string;
  validators: ValidatorType[];
  checksIncluded: string[];
}

/**
 * Scan level configurations (matches backend)
 */
export const scanLevelConfigs: Record<ScanLevel, ScanLevelConfig> = {
  basic: {
    level: 'basic',
    name: 'Basic Scan',
    description: 'Quick scan covering essential accessibility checks',
    estimatedTime: '~10 seconds',
    validators: ['structure', 'alt-text', 'tables'],
    checksIncluded: [
      'Tagged PDF structure',
      'Document language & title',
      'Image alternative text',
      'Basic table structure',
      'Critical Matterhorn Protocol checks',
    ],
  },
  comprehensive: {
    level: 'comprehensive',
    name: 'Comprehensive Scan',
    description: 'Complete Matterhorn Protocol compliance audit',
    estimatedTime: '~30-60 seconds',
    validators: [
      'structure',
      'alt-text',
      'contrast',
      'tables',
      'headings',
      'reading-order',
      'lists',
      'language',
      'metadata',
    ],
    checksIncluded: [
      'All Basic checks',
      'Heading hierarchy analysis',
      'Reading order validation',
      'List structure verification',
      'Color contrast analysis',
      'Complete Matterhorn Protocol',
      'WCAG 2.1 Level AA compliance',
    ],
  },
  custom: {
    level: 'custom',
    name: 'Custom Scan',
    description: 'Select specific validators to run',
    estimatedTime: 'Varies',
    validators: [], // User-defined
    checksIncluded: ['User-selected validators only'],
  },
};

/**
 * Custom scan configuration
 */
export interface CustomScanConfig {
  selectedValidators: ValidatorType[];
}

/**
 * Validator metadata for custom scan UI
 */
export interface ValidatorMetadata {
  id: ValidatorType;
  name: string;
  description: string;
  estimatedTime: string;
}

export const validatorMetadata: Record<ValidatorType, ValidatorMetadata> = {
  structure: {
    id: 'structure',
    name: 'Structure & Tags',
    description: 'PDF structure tree, tagging, and semantic elements',
    estimatedTime: '~5s',
  },
  'alt-text': {
    id: 'alt-text',
    name: 'Alternative Text',
    description: 'Image alternative text and figure descriptions',
    estimatedTime: '~5s',
  },
  contrast: {
    id: 'contrast',
    name: 'Color Contrast',
    description: 'Text and background color contrast ratios',
    estimatedTime: '~10s',
  },
  tables: {
    id: 'tables',
    name: 'Table Structure',
    description: 'Table headers, structure, and accessibility',
    estimatedTime: '~3s',
  },
  headings: {
    id: 'headings',
    name: 'Heading Hierarchy',
    description: 'Heading levels and document outline structure',
    estimatedTime: '~3s',
  },
  'reading-order': {
    id: 'reading-order',
    name: 'Reading Order',
    description: 'Logical reading order validation',
    estimatedTime: '~5s',
  },
  lists: {
    id: 'lists',
    name: 'List Structure',
    description: 'List tags and list item structure',
    estimatedTime: '~3s',
  },
  language: {
    id: 'language',
    name: 'Language',
    description: 'Document and content language declarations',
    estimatedTime: '~2s',
  },
  metadata: {
    id: 'metadata',
    name: 'Metadata',
    description: 'PDF metadata, title, and document properties',
    estimatedTime: '~2s',
  },
};
