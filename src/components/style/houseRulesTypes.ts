/**
 * Shared types and utilities for HouseRulesManager sub-components
 */

import type { StyleCategory, HouseRuleType, StyleSeverity, StyleGuideType } from '@/types/style';

export type TabType = 'rules' | 'rule-sets' | 'upload' | 'best-practices';

export interface RuleFormData {
  name: string;
  description: string;
  category: StyleCategory;
  ruleType: HouseRuleType;
  pattern: string;
  preferredTerm: string;
  avoidTerms: string;
  severity: StyleSeverity;
  isActive: boolean;
  baseStyleGuide: StyleGuideType | '';
  overridesRule: string;
}

export const defaultFormData: RuleFormData = {
  name: '',
  description: '',
  category: 'TERMINOLOGY',
  ruleType: 'TERMINOLOGY',
  pattern: '',
  preferredTerm: '',
  avoidTerms: '',
  severity: 'WARNING',
  isActive: true,
  baseStyleGuide: '',
  overridesRule: '',
};

export interface ExtractedRule {
  name: string;
  description: string;
  category: string;
  ruleType: string;
  pattern?: string;
  preferredTerm?: string;
  avoidTerms: string[];
  severity: string;
  sourceSection?: string;
  examples?: Array<{ incorrect: string; correct: string }>;
}

export interface ExtractionResult {
  documentTitle?: string;
  totalRulesExtracted: number;
  categories: Record<string, number>;
  processingTimeMs: number;
  warnings: string[];
}

// Valid category values
const VALID_CATEGORIES = [
  'PUNCTUATION', 'CAPITALIZATION', 'NUMBERS', 'ABBREVIATIONS',
  'HYPHENATION', 'SPELLING', 'GRAMMAR', 'TERMINOLOGY',
  'FORMATTING', 'CITATIONS', 'OTHER',
];

// Normalize category to fix AI typos
export function normalizeCategory(category: string): string {
  if (!category) return 'OTHER';
  const upper = category.toUpperCase().trim();

  if (VALID_CATEGORIES.includes(upper)) return upper;

  // Fix common typos
  const typoMap: Record<string, string> = {
    'PUNCTUATOIN': 'PUNCTUATION', 'PUNTUATION': 'PUNCTUATION',
    'CAPITLIZATION': 'CAPITALIZATION', 'CAPTALIZATION': 'CAPITALIZATION',
    'CAPITALISATION': 'CAPITALIZATION', 'GRAMMER': 'GRAMMAR',
    'ABBREVATIONS': 'ABBREVIATIONS', 'HYPENATION': 'HYPHENATION',
    'SPELING': 'SPELLING', 'TERMINOLGY': 'TERMINOLOGY',
    'FORMATING': 'FORMATTING', 'CITATION': 'CITATIONS',
  };

  if (typoMap[upper]) return typoMap[upper];

  // Fuzzy match
  for (const valid of VALID_CATEGORIES) {
    if (upper.includes(valid) || valid.includes(upper)) return valid;
  }

  return 'OTHER';
}

// Normalize extracted rules from AI
export function normalizeExtractedRules(rules: ExtractedRule[]): ExtractedRule[] {
  return rules.map(rule => ({
    ...rule,
    category: normalizeCategory(rule.category),
    ruleType: ['TERMINOLOGY', 'PATTERN', 'CAPITALIZATION', 'PUNCTUATION'].includes(rule.ruleType?.toUpperCase())
      ? rule.ruleType.toUpperCase()
      : 'TERMINOLOGY',
    severity: ['ERROR', 'WARNING', 'SUGGESTION'].includes(rule.severity?.toUpperCase())
      ? rule.severity.toUpperCase()
      : 'WARNING',
  }));
}

// Consolidate categories for display (merge typos)
export function consolidateCategories(categories: Record<string, number>): Record<string, number> {
  const consolidated: Record<string, number> = {};
  for (const [cat, count] of Object.entries(categories)) {
    const normalized = normalizeCategory(cat);
    consolidated[normalized] = (consolidated[normalized] || 0) + count;
  }
  return consolidated;
}
