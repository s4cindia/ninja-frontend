/**
 * Shared constants for style validation components
 */

import type { StyleCategory, HouseRuleType, StyleSeverity, StyleGuideType } from '@/types/style';

export const categoryOptions: { value: StyleCategory; label: string }[] = [
  { value: 'PUNCTUATION', label: 'Punctuation' },
  { value: 'CAPITALIZATION', label: 'Capitalization' },
  { value: 'NUMBERS', label: 'Numbers' },
  { value: 'ABBREVIATIONS', label: 'Abbreviations' },
  { value: 'HYPHENATION', label: 'Hyphenation' },
  { value: 'SPELLING', label: 'Spelling' },
  { value: 'GRAMMAR', label: 'Grammar' },
  { value: 'TERMINOLOGY', label: 'Terminology' },
  { value: 'FORMATTING', label: 'Formatting' },
  { value: 'CITATIONS', label: 'Citations' },
  { value: 'OTHER', label: 'Other' },
];

export const ruleTypeOptions: { value: HouseRuleType; label: string }[] = [
  { value: 'TERMINOLOGY', label: 'Terminology' },
  { value: 'PATTERN', label: 'Pattern (Regex)' },
  { value: 'CAPITALIZATION', label: 'Capitalization' },
  { value: 'PUNCTUATION', label: 'Punctuation' },
];

export const severityOptions: { value: StyleSeverity; label: string }[] = [
  { value: 'ERROR', label: 'Error' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'SUGGESTION', label: 'Suggestion' },
];

export const styleGuideOptions: { value: StyleGuideType | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'CHICAGO', label: 'Chicago' },
  { value: 'APA', label: 'APA' },
  { value: 'MLA', label: 'MLA' },
  { value: 'AP', label: 'AP' },
  { value: 'VANCOUVER', label: 'Vancouver' },
  { value: 'IEEE', label: 'IEEE' },
  { value: 'NATURE', label: 'Nature' },
  { value: 'ELSEVIER', label: 'Elsevier' },
];

export const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'FIXED', label: 'Fixed' },
  { value: 'IGNORED', label: 'Ignored' },
  { value: 'WONT_FIX', label: "Won't Fix" },
  { value: 'AUTO_FIXED', label: 'Auto-Fixed' },
];

// -- Form data types and defaults for RuleSetManager sub-components --

export interface RuleFormData {
  name: string;
  description: string;
  category: StyleCategory;
  ruleType: HouseRuleType;
  pattern: string;
  preferredTerm: string;
  avoidTerms: string;
  severity: StyleSeverity;
}

export const defaultRuleFormData: RuleFormData = {
  name: '',
  description: '',
  category: 'TERMINOLOGY',
  ruleType: 'TERMINOLOGY',
  pattern: '',
  preferredTerm: '',
  avoidTerms: '',
  severity: 'WARNING',
};

export interface RuleSetFormData {
  name: string;
  description: string;
  baseStyleGuide: StyleGuideType | '';
  isDefault: boolean;
}

export const defaultRuleSetFormData: RuleSetFormData = {
  name: '',
  description: '',
  baseStyleGuide: '',
  isDefault: false,
};
