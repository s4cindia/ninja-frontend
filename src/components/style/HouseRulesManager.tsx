/**
 * HouseRulesManager Component
 *
 * CRUD interface for managing house style rules
 * Includes style guide upload and best practices import
 */

import { useState, useRef } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  Play,
  XCircle,
  Filter,
  ChevronDown,
  Loader2,
  FileText,
  BookOpen,
  CheckCircle,
  AlertCircle,
  FolderOpen,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  useHouseRules,
  useCreateHouseRule,
  useUpdateHouseRule,
  useDeleteHouseRule,
  useTestHouseRule,
  useExportHouseRules,
  useImportHouseRules,
  useUploadStyleGuide,
  useSaveExtractedRules,
  useBestPractices,
  useImportBestPractices,
  useCustomRuleSets,
  useCustomRuleSet,
  useCreateRuleSet,
  useUpdateRuleSet,
  useDeleteRuleSet,
  useAddRuleToSet,
} from '@/hooks/useStyleValidation';
import type {
  HouseStyleRule,
  HouseRuleSet,
  CreateHouseRuleInput,
  UpdateHouseRuleInput,
  CreateRuleSetInput,
  StyleCategory,
  HouseRuleType,
  StyleSeverity,
  StyleGuideType,
} from '@/types/style';

interface HouseRulesManagerProps {
  className?: string;
}

interface RuleFormData {
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

const defaultFormData: RuleFormData = {
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

const categoryOptions: { value: StyleCategory; label: string }[] = [
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

const ruleTypeOptions: { value: HouseRuleType; label: string }[] = [
  { value: 'TERMINOLOGY', label: 'Terminology' },
  { value: 'PATTERN', label: 'Pattern (Regex)' },
  { value: 'CAPITALIZATION', label: 'Capitalization' },
  { value: 'PUNCTUATION', label: 'Punctuation' },
];

const severityOptions: { value: StyleSeverity; label: string }[] = [
  { value: 'ERROR', label: 'Error' },
  { value: 'WARNING', label: 'Warning' },
  { value: 'SUGGESTION', label: 'Suggestion' },
];

const styleGuideOptions: { value: StyleGuideType | ''; label: string }[] = [
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

type TabType = 'rules' | 'rule-sets' | 'upload' | 'best-practices';

interface ExtractedRule {
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

// Valid category values
const VALID_CATEGORIES = [
  'PUNCTUATION', 'CAPITALIZATION', 'NUMBERS', 'ABBREVIATIONS',
  'HYPHENATION', 'SPELLING', 'GRAMMAR', 'TERMINOLOGY',
  'FORMATTING', 'CITATIONS', 'OTHER',
];

// Normalize category to fix AI typos
function normalizeCategory(category: string): string {
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
function normalizeExtractedRules(rules: ExtractedRule[]): ExtractedRule[] {
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
function consolidateCategories(categories: Record<string, number>): Record<string, number> {
  const consolidated: Record<string, number> = {};
  for (const [cat, count] of Object.entries(categories)) {
    const normalized = normalizeCategory(cat);
    consolidated[normalized] = (consolidated[normalized] || 0) + count;
  }
  return consolidated;
}

export function HouseRulesManager({ className }: HouseRulesManagerProps) {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StyleCategory | ''>('');
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<HouseStyleRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [testText, setTestText] = useState('');
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  // Style guide upload state
  const [styleGuideFile, setStyleGuideFile] = useState<File | null>(null);
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  const [selectedExtractedRules, setSelectedExtractedRules] = useState<Set<number>>(new Set());
  const [extractionResult, setExtractionResult] = useState<{
    documentTitle?: string;
    totalRulesExtracted: number;
    categories: Record<string, number>;
    processingTimeMs: number;
    warnings: string[];
  } | null>(null);
  const styleGuideInputRef = useRef<HTMLInputElement>(null);

  // Save extracted rules dialog state
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveRuleSetName, setSaveRuleSetName] = useState('');
  const [saveRuleSetDescription, setSaveRuleSetDescription] = useState('');
  const [saveRuleSetStyleGuide, setSaveRuleSetStyleGuide] = useState<StyleGuideType | ''>('');

  // Best practices state
  const [selectedBestPractices, setSelectedBestPractices] = useState<Set<string>>(new Set());

  // Rule sets state
  const [showRuleSetForm, setShowRuleSetForm] = useState(false);
  const [editingRuleSet, setEditingRuleSet] = useState<HouseRuleSet | null>(null);
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string | null>(null);
  const [ruleSetFormData, setRuleSetFormData] = useState<{
    name: string;
    description: string;
    baseStyleGuide: StyleGuideType | '';
    isDefault: boolean;
  }>({
    name: '',
    description: '',
    baseStyleGuide: '',
    isDefault: false,
  });
  const [showAddRuleToSetForm, setShowAddRuleToSetForm] = useState(false);

  // Queries
  const { data: rulesData, isLoading } = useHouseRules({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: bestPracticesData, isLoading: isLoadingBestPractices } = useBestPractices();
  const { data: ruleSetsData, isLoading: isLoadingRuleSets } = useCustomRuleSets({ includeRules: false });
  const { data: selectedRuleSet, isLoading: isLoadingSelectedRuleSet } = useCustomRuleSet(selectedRuleSetId || '');

  // Mutations
  const createRule = useCreateHouseRule();
  const updateRule = useUpdateHouseRule();
  const deleteRule = useDeleteHouseRule();
  const testRule = useTestHouseRule();
  const exportRules = useExportHouseRules();
  const importRules = useImportHouseRules();
  const uploadStyleGuide = useUploadStyleGuide();
  const saveExtractedRules = useSaveExtractedRules();
  const importBestPractices = useImportBestPractices();
  const createRuleSet = useCreateRuleSet();
  const updateRuleSet = useUpdateRuleSet();
  const deleteRuleSet = useDeleteRuleSet();
  const addRuleToSet = useAddRuleToSet();

  const rules = rulesData?.rules || [];
  const ruleSets = ruleSetsData?.ruleSets || [];
  const bestPractices = bestPracticesData?.rules || [];

  const handleFormChange = (field: keyof RuleFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleOpenCreate = () => {
    setFormData(defaultFormData);
    setEditingRule(null);
    setShowForm(true);
  };

  const handleOpenEdit = (rule: HouseStyleRule) => {
    setFormData({
      name: rule.name,
      description: rule.description || '',
      category: rule.category,
      ruleType: rule.ruleType,
      pattern: rule.pattern || '',
      preferredTerm: rule.preferredTerm || '',
      avoidTerms: rule.avoidTerms.join(', '),
      severity: rule.severity,
      isActive: rule.isActive,
      baseStyleGuide: rule.baseStyleGuide || '',
      overridesRule: rule.overridesRule || '',
    });
    setEditingRule(rule);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingRule(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateHouseRuleInput = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      ruleType: formData.ruleType,
      pattern: formData.pattern || undefined,
      preferredTerm: formData.preferredTerm || undefined,
      avoidTerms: formData.avoidTerms
        ? formData.avoidTerms.split(',').map((t) => t.trim())
        : [],
      severity: formData.severity,
      isActive: formData.isActive,
      baseStyleGuide: formData.baseStyleGuide || undefined,
      overridesRule: formData.overridesRule || undefined,
    };

    try {
      if (editingRule) {
        await updateRule.mutateAsync({
          ruleId: editingRule.id,
          input: input as UpdateHouseRuleInput,
        });
        toast.success('Rule updated successfully');
      } else {
        await createRule.mutateAsync(input);
        toast.success('Rule created successfully');
      }
      handleCloseForm();
    } catch (error) {
      console.error('Failed to save rule:', error);
      const message = error instanceof Error ? error.message : 'Failed to save rule';
      toast.error(message);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await deleteRule.mutateAsync(ruleId);
      toast.success('Rule deleted successfully');
    } catch (error) {
      console.error('Failed to delete rule:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete rule';
      toast.error(message);
    }
  };

  const handleTestRule = async () => {
    if (!testText) return;

    const input: CreateHouseRuleInput = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      ruleType: formData.ruleType,
      pattern: formData.pattern || undefined,
      preferredTerm: formData.preferredTerm || undefined,
      avoidTerms: formData.avoidTerms
        ? formData.avoidTerms.split(',').map((t) => t.trim())
        : [],
      severity: formData.severity,
    };

    try {
      await testRule.mutateAsync({ rule: input, sampleText: testText });
    } catch (error) {
      console.error('Failed to test rule:', error);
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportRules.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'house-rules-export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export rules:', error);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const data = JSON.parse(text);
      const result = await importRules.mutateAsync(data);
      setImportFile(null);
      toast.success(`Imported ${result.imported} rule(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
    } catch (error) {
      console.error('Failed to import rules:', error);
      const message = error instanceof Error ? error.message : 'Failed to import rules - check JSON format';
      toast.error(message);
    }
  };

  // Style guide upload handlers
  const handleStyleGuideUpload = async () => {
    if (!styleGuideFile) return;

    try {
      const result = await uploadStyleGuide.mutateAsync(styleGuideFile);

      // Normalize rules to fix AI typos in categories
      const normalizedRules = normalizeExtractedRules(result.rules);
      const consolidatedCategories = consolidateCategories(result.categories);

      setExtractedRules(normalizedRules);
      setExtractionResult({
        documentTitle: result.documentTitle,
        totalRulesExtracted: result.totalRulesExtracted,
        categories: consolidatedCategories,
        processingTimeMs: result.processingTimeMs,
        warnings: result.warnings,
      });
      // Select all rules by default
      setSelectedExtractedRules(new Set(normalizedRules.map((_, idx) => idx)));
      toast.success(`Extracted ${normalizedRules.length} rules from document`);
    } catch (error) {
      console.error('Failed to upload style guide:', error);
      const message = error instanceof Error ? error.message : 'Failed to extract rules';
      toast.error(message);
    }
  };

  const handleOpenSaveDialog = () => {
    const rulesToSave = extractedRules.filter((_, idx) => selectedExtractedRules.has(idx));
    if (rulesToSave.length === 0) return;

    // Pre-populate the rule set name from the document title
    const defaultName = extractionResult?.documentTitle ||
      styleGuideFile?.name?.replace(/\.(pdf|docx?|doc)$/i, '') ||
      'Imported Rules';
    setSaveRuleSetName(defaultName);
    setSaveRuleSetDescription(`Rules extracted from ${styleGuideFile?.name || 'uploaded document'}`);
    setSaveRuleSetStyleGuide('');
    setShowSaveDialog(true);
  };

  const handleSaveExtractedRules = async () => {
    const rulesToSave = extractedRules.filter((_, idx) => selectedExtractedRules.has(idx));
    if (rulesToSave.length === 0) return;

    if (!saveRuleSetName.trim()) {
      toast.error('Please enter a name for the rule set');
      return;
    }

    try {
      const result = await saveExtractedRules.mutateAsync({
        rules: rulesToSave,
        sourceDocumentName: styleGuideFile?.name,
        ruleSetName: saveRuleSetName.trim(),
        ruleSetDescription: saveRuleSetDescription.trim() || undefined,
        baseStyleGuide: saveRuleSetStyleGuide || undefined,
      });

      toast.success(`Created rule set "${saveRuleSetName}" with ${result.savedCount} rules`);

      // Reset state after successful save
      setStyleGuideFile(null);
      setExtractedRules([]);
      setSelectedExtractedRules(new Set());
      setExtractionResult(null);
      setShowSaveDialog(false);
      setSaveRuleSetName('');
      setSaveRuleSetDescription('');
      setSaveRuleSetStyleGuide('');
      setActiveTab('rule-sets'); // Switch to rule sets tab to see the new set
    } catch (error) {
      console.error('Failed to save extracted rules:', error);
      const message = error instanceof Error ? error.message : 'Failed to save rules';
      toast.error(message);
    }
  };

  const toggleExtractedRule = (idx: number) => {
    setSelectedExtractedRules((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const toggleAllExtractedRules = () => {
    if (selectedExtractedRules.size === extractedRules.length) {
      setSelectedExtractedRules(new Set());
    } else {
      setSelectedExtractedRules(new Set(extractedRules.map((_, idx) => idx)));
    }
  };

  // Best practices handlers
  const handleImportBestPractices = async () => {
    const ruleNames = selectedBestPractices.size > 0
      ? Array.from(selectedBestPractices)
      : undefined;

    try {
      await importBestPractices.mutateAsync(ruleNames);
      setSelectedBestPractices(new Set());
      setActiveTab('rules');
    } catch (error) {
      console.error('Failed to import best practices:', error);
    }
  };

  const toggleBestPractice = (name: string) => {
    setSelectedBestPractices((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const toggleAllBestPractices = () => {
    if (selectedBestPractices.size === bestPractices.length) {
      setSelectedBestPractices(new Set());
    } else {
      setSelectedBestPractices(new Set(bestPractices.map((r) => r.name)));
    }
  };

  // Rule Set handlers
  const handleOpenCreateRuleSet = () => {
    setRuleSetFormData({
      name: '',
      description: '',
      baseStyleGuide: '',
      isDefault: false,
    });
    setEditingRuleSet(null);
    setShowRuleSetForm(true);
  };

  const handleOpenEditRuleSet = (ruleSet: HouseRuleSet) => {
    setRuleSetFormData({
      name: ruleSet.name,
      description: ruleSet.description || '',
      baseStyleGuide: ruleSet.baseStyleGuide || '',
      isDefault: ruleSet.isDefault,
    });
    setEditingRuleSet(ruleSet);
    setShowRuleSetForm(true);
  };

  const handleCloseRuleSetForm = () => {
    setShowRuleSetForm(false);
    setEditingRuleSet(null);
    setRuleSetFormData({
      name: '',
      description: '',
      baseStyleGuide: '',
      isDefault: false,
    });
  };

  const handleRuleSetFormChange = (field: keyof typeof ruleSetFormData, value: string | boolean) => {
    setRuleSetFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmitRuleSet = async (e: React.FormEvent) => {
    e.preventDefault();

    const input: CreateRuleSetInput = {
      name: ruleSetFormData.name,
      description: ruleSetFormData.description || undefined,
      baseStyleGuide: ruleSetFormData.baseStyleGuide || undefined,
      isDefault: ruleSetFormData.isDefault,
    };

    try {
      if (editingRuleSet) {
        await updateRuleSet.mutateAsync({
          ruleSetId: editingRuleSet.id,
          input,
        });
        toast.success('Rule set updated successfully');
      } else {
        await createRuleSet.mutateAsync(input);
        toast.success('Rule set created successfully');
      }
      handleCloseRuleSetForm();
    } catch (error) {
      console.error('Failed to save rule set:', error);
      const message = error instanceof Error ? error.message : 'Failed to save rule set';
      toast.error(message);
    }
  };

  const handleDeleteRuleSet = async (ruleSetId: string) => {
    if (!confirm('Are you sure you want to delete this rule set? All rules in this set will also be deleted.')) return;

    try {
      await deleteRuleSet.mutateAsync(ruleSetId);
      toast.success('Rule set deleted successfully');
      if (selectedRuleSetId === ruleSetId) {
        setSelectedRuleSetId(null);
      }
    } catch (error) {
      console.error('Failed to delete rule set:', error);
      const message = error instanceof Error ? error.message : 'Failed to delete rule set';
      toast.error(message);
    }
  };

  const handleSelectRuleSet = (ruleSetId: string) => {
    setSelectedRuleSetId(ruleSetId);
  };

  const handleBackToRuleSets = () => {
    setSelectedRuleSetId(null);
    setShowAddRuleToSetForm(false);
  };

  const handleAddRuleToSet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleSetId) return;

    const input: CreateHouseRuleInput = {
      name: formData.name,
      description: formData.description || undefined,
      category: formData.category,
      ruleType: formData.ruleType,
      pattern: formData.pattern || undefined,
      preferredTerm: formData.preferredTerm || undefined,
      avoidTerms: formData.avoidTerms
        ? formData.avoidTerms.split(',').map((t) => t.trim())
        : [],
      severity: formData.severity,
      isActive: formData.isActive,
      baseStyleGuide: formData.baseStyleGuide || undefined,
      overridesRule: formData.overridesRule || undefined,
    };

    try {
      await addRuleToSet.mutateAsync({
        ruleSetId: selectedRuleSetId,
        input,
      });
      toast.success('Rule added to set successfully');
      setShowAddRuleToSetForm(false);
      setFormData(defaultFormData);
    } catch (error) {
      console.error('Failed to add rule to set:', error);
      const message = error instanceof Error ? error.message : 'Failed to add rule';
      toast.error(message);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">House Style Rules</h2>
          <div className="flex items-center gap-2">
            {activeTab === 'rules' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleExport}
                  isLoading={exportRules.isPending}
                  leftIcon={<Download className="h-4 w-4" />}
                >
                  Export
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenCreate}
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  New Rule
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('rule-sets')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'rule-sets'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <FolderOpen className="inline h-4 w-4 mr-2" />
            Rule Sets ({ruleSets.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'rules'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <Filter className="inline h-4 w-4 mr-2" />
            Individual Rules ({rules.length})
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'upload'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <FileText className="inline h-4 w-4 mr-2" />
            Upload Style Guide
          </button>
          <button
            onClick={() => setActiveTab('best-practices')}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'best-practices'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            <BookOpen className="inline h-4 w-4 mr-2" />
            Best Practices
          </button>
        </div>

        {/* Search and Filter - only for rules tab */}
        {activeTab === 'rules' && (
          <>
            <div className="mt-4 flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search rules..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as StyleCategory | '')}
                className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Categories</option>
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Import JSON */}
            <div className="mt-3 flex items-center gap-2">
              <input
                type="file"
                accept=".json"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {importFile && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleImport}
                  isLoading={importRules.isPending}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  Import JSON
                </Button>
              )}
              <a
                href="/house-rules-template.json"
                download="house-rules-template.json"
                className="text-sm text-primary-600 hover:text-primary-700 underline ml-2"
              >
                Download Sample Template
              </a>
            </div>
          </>
        )}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Upload Style Guide Tab */}
        {activeTab === 'upload' && (
          <div className="p-6">
            {extractedRules.length === 0 ? (
              <div className="space-y-6">
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    Upload Your Style Guide
                  </h3>
                  <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
                    Upload a PDF or Word document containing your style guide. We'll extract
                    the rules automatically using AI and let you review them before saving.
                  </p>
                  <div className="mt-6">
                    <input
                      ref={styleGuideInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      onChange={(e) => setStyleGuideFile(e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => styleGuideInputRef.current?.click()}
                      leftIcon={<Upload className="h-4 w-4" />}
                    >
                      Select File
                    </Button>
                  </div>
                  {styleGuideFile && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <span className="text-sm text-gray-700">{styleGuideFile.name}</span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleStyleGuideUpload}
                        isLoading={uploadStyleGuide.isPending}
                      >
                        Extract Rules
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setStyleGuideFile(null)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">Supported Formats</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• PDF documents (up to 50MB)</li>
                    <li>• Microsoft Word (.docx, .doc)</li>
                  </ul>
                  <h4 className="text-sm font-medium text-blue-800 mt-4 mb-2">What Gets Extracted</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Terminology preferences (use/avoid terms)</li>
                    <li>• Punctuation and capitalization rules</li>
                    <li>• Formatting guidelines</li>
                    <li>• Grammar and style requirements</li>
                    <li>• Citation and reference standards</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Extraction Summary */}
                {extractionResult && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <h4 className="font-medium text-green-800">
                        {extractionResult.totalRulesExtracted} Rules Extracted
                      </h4>
                    </div>
                    {extractionResult.documentTitle && (
                      <p className="text-sm text-green-700 mb-2">
                        From: {extractionResult.documentTitle}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {Object.entries(extractionResult.categories).map(([cat, count]) => (
                        <span
                          key={cat}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs"
                        >
                          {cat}: {count}
                        </span>
                      ))}
                    </div>
                    {extractionResult.warnings.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <p className="text-sm text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-4 w-4" />
                          {extractionResult.warnings.length} warning(s)
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedExtractedRules.size === extractedRules.length}
                      onChange={toggleAllExtractedRules}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-sm text-gray-700">
                      Select All ({selectedExtractedRules.size} of {extractedRules.length} selected)
                    </span>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setExtractedRules([]);
                        setSelectedExtractedRules(new Set());
                        setExtractionResult(null);
                        setStyleGuideFile(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={handleOpenSaveDialog}
                      disabled={selectedExtractedRules.size === 0}
                    >
                      Save {selectedExtractedRules.size} Rule(s) as Rule Set
                    </Button>
                  </div>
                </div>

                {/* Extracted Rules List */}
                <div className="space-y-3">
                  {extractedRules.map((rule, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-colors',
                        selectedExtractedRules.has(idx)
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      )}
                      onClick={() => toggleExtractedRule(idx)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedExtractedRules.has(idx)}
                          onChange={() => toggleExtractedRule(idx)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded border-gray-300 text-primary-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{rule.name}</h4>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                rule.severity === 'ERROR' && 'bg-red-100 text-red-700',
                                rule.severity === 'WARNING' && 'bg-amber-100 text-amber-700',
                                rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-700'
                              )}
                            >
                              {rule.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {rule.category}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {rule.ruleType}
                            </span>
                            {rule.sourceSection && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                Source: {rule.sourceSection}
                              </span>
                            )}
                          </div>
                          {rule.examples && rule.examples.length > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-gray-500">Example: </span>
                              <span className="text-red-600 line-through">
                                {rule.examples[0].incorrect}
                              </span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-green-600">{rule.examples[0].correct}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Save Dialog Overlay */}
                {showSaveDialog && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Save as Rule Set
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Enter a name for this rule set. You can select it later when validating documents.
                      </p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rule Set Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={saveRuleSetName}
                            onChange={(e) => setSaveRuleSetName(e.target.value)}
                            placeholder="e.g., Chicago Manual of Style 17th"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            autoFocus
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <textarea
                            value={saveRuleSetDescription}
                            onChange={(e) => setSaveRuleSetDescription(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Base Style Guide
                          </label>
                          <select
                            value={saveRuleSetStyleGuide}
                            onChange={(e) => setSaveRuleSetStyleGuide(e.target.value as StyleGuideType | '')}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          >
                            {styleGuideOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end gap-3 mt-6">
                        <Button
                          variant="outline"
                          onClick={() => setShowSaveDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          variant="primary"
                          onClick={handleSaveExtractedRules}
                          isLoading={saveExtractedRules.isPending}
                          disabled={!saveRuleSetName.trim()}
                        >
                          Save Rule Set
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Rule Sets Tab */}
        {activeTab === 'rule-sets' && (
          <div className="p-6">
            {/* Rule Set Form */}
            {showRuleSetForm ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">
                    {editingRuleSet ? 'Edit Rule Set' : 'Create New Rule Set'}
                  </h3>
                  <button onClick={handleCloseRuleSetForm} className="text-gray-400 hover:text-gray-600">
                    <XCircle className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmitRuleSet} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Set Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ruleSetFormData.name}
                      onChange={(e) => handleRuleSetFormChange('name', e.target.value)}
                      required
                      placeholder="e.g., APA 7th Edition House Rules"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={ruleSetFormData.description}
                      onChange={(e) => handleRuleSetFormChange('description', e.target.value)}
                      rows={2}
                      placeholder="Describe the purpose of this rule set"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Base Style Guide
                    </label>
                    <select
                      value={ruleSetFormData.baseStyleGuide}
                      onChange={(e) => handleRuleSetFormChange('baseStyleGuide', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {styleGuideOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={ruleSetFormData.isDefault}
                      onChange={(e) => handleRuleSetFormChange('isDefault', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <label htmlFor="isDefault" className="text-sm text-gray-700">
                      Set as default rule set for validation
                    </label>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={handleCloseRuleSetForm}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isLoading={createRuleSet.isPending || updateRuleSet.isPending}
                    >
                      {editingRuleSet ? 'Update Rule Set' : 'Create Rule Set'}
                    </Button>
                  </div>
                </form>
              </div>
            ) : selectedRuleSetId && selectedRuleSet ? (
              /* Selected Rule Set View */
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <button
                    onClick={handleBackToRuleSets}
                    className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{selectedRuleSet.name}</h3>
                    {selectedRuleSet.description && (
                      <p className="text-sm text-gray-500">{selectedRuleSet.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRuleSet.baseStyleGuide && (
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs">
                        {selectedRuleSet.baseStyleGuide}
                      </span>
                    )}
                    {selectedRuleSet.isDefault && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Default
                      </span>
                    )}
                  </div>
                </div>

                {/* Add Rule to Set button */}
                <div className="flex justify-between items-center mb-4">
                  <p className="text-sm text-gray-600">
                    {selectedRuleSet.rules?.length || 0} rule(s) in this set
                  </p>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => setShowAddRuleToSetForm(true)}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    Add Rule
                  </Button>
                </div>

                {/* Add Rule Form */}
                {showAddRuleToSetForm && (
                  <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900">Add New Rule</h4>
                      <button
                        onClick={() => setShowAddRuleToSetForm(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>
                    <form onSubmit={handleAddRuleToSet} className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleFormChange('name', e.target.value)}
                            required
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={formData.category}
                            onChange={(e) => handleFormChange('category', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                          >
                            {categoryOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                        <input
                          type="text"
                          value={formData.description}
                          onChange={(e) => handleFormChange('description', e.target.value)}
                          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Rule Type</label>
                          <select
                            value={formData.ruleType}
                            onChange={(e) => handleFormChange('ruleType', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                          >
                            {ruleTypeOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Severity</label>
                          <select
                            value={formData.severity}
                            onChange={(e) => handleFormChange('severity', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                          >
                            {severityOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      {formData.ruleType === 'TERMINOLOGY' && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Preferred Term
                            </label>
                            <input
                              type="text"
                              value={formData.preferredTerm}
                              onChange={(e) => handleFormChange('preferredTerm', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Avoid Terms (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={formData.avoidTerms}
                              onChange={(e) => handleFormChange('avoidTerms', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md"
                            />
                          </div>
                        </div>
                      )}
                      {formData.ruleType === 'PATTERN' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Regex Pattern
                          </label>
                          <input
                            type="text"
                            value={formData.pattern}
                            onChange={(e) => handleFormChange('pattern', e.target.value)}
                            className="w-full px-2 py-1.5 text-sm font-mono border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setShowAddRuleToSetForm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="primary"
                          isLoading={addRuleToSet.isPending}
                        >
                          Add Rule
                        </Button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Rules in Set */}
                {isLoadingSelectedRuleSet ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                  </div>
                ) : selectedRuleSet.rules && selectedRuleSet.rules.length > 0 ? (
                  <div className="space-y-2">
                    {selectedRuleSet.rules.map((rule) => (
                      <div
                        key={rule.id}
                        className="p-3 border rounded-lg bg-white hover:bg-gray-50"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="font-medium text-gray-900 text-sm">{rule.name}</h5>
                              <span
                                className={cn(
                                  'px-1.5 py-0.5 rounded text-xs font-medium',
                                  rule.severity === 'ERROR' && 'bg-red-100 text-red-700',
                                  rule.severity === 'WARNING' && 'bg-amber-100 text-amber-700',
                                  rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-700'
                                )}
                              >
                                {rule.severity}
                              </span>
                            </div>
                            {rule.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{rule.description}</p>
                            )}
                            <div className="flex gap-1 mt-1">
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {rule.category}
                              </span>
                              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                                {rule.ruleType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleOpenEdit(rule)}
                              aria-label="Edit rule"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(rule.id)}
                              aria-label="Delete rule"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                    <p className="text-sm">No rules in this set yet.</p>
                    <p className="text-xs mt-1">Click "Add Rule" to add your first rule.</p>
                  </div>
                )}
              </div>
            ) : (
              /* Rule Sets List */
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Rule Sets</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Organize rules into named collections. Select rule sets during validation.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleOpenCreateRuleSet}
                    leftIcon={<Plus className="h-4 w-4" />}
                  >
                    New Rule Set
                  </Button>
                </div>

                {isLoadingRuleSets ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                  </div>
                ) : ruleSets.length === 0 ? (
                  <div className="text-center py-12">
                    <FolderOpen className="mx-auto h-12 w-12 text-gray-300" />
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No Rule Sets</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create a rule set to organize your style rules into collections.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleOpenCreateRuleSet}
                      className="mt-4"
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Create Rule Set
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {ruleSets.map((ruleSet) => (
                      <div
                        key={ruleSet.id}
                        className="p-4 border rounded-lg bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleSelectRuleSet(ruleSet.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <FolderOpen className="h-5 w-5 text-primary-500" />
                              <h4 className="font-medium text-gray-900">{ruleSet.name}</h4>
                              {ruleSet.isDefault && (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                                  Default
                                </span>
                              )}
                              {ruleSet.baseStyleGuide && (
                                <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                                  {ruleSet.baseStyleGuide}
                                </span>
                              )}
                              {!ruleSet.isActive && (
                                <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                                  Inactive
                                </span>
                              )}
                            </div>
                            {ruleSet.description && (
                              <p className="text-sm text-gray-500 mt-1 ml-7">{ruleSet.description}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-1 ml-7">
                              {ruleSet._count?.rules || 0} rules • {ruleSet.source}
                              {ruleSet.sourceFile && ` • ${ruleSet.sourceFile}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditRuleSet(ruleSet);
                              }}
                              aria-label="Edit rule set"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRuleSet(ruleSet.id);
                              }}
                              aria-label="Delete rule set"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Best Practices Tab */}
        {activeTab === 'best-practices' && (
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Editorial Best Practices</h3>
              <p className="text-sm text-gray-600">
                Import proven editorial rules from industry standards. These rules cover common
                style, grammar, and formatting guidelines used by professional publishers.
              </p>
            </div>

            {isLoadingBestPractices ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : bestPractices.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  No Best Practices Available
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Best practices rules are not configured on the server.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Categories Summary */}
                {bestPracticesData?.categories && (
                  <div className="flex flex-wrap gap-2 pb-4 border-b">
                    {Object.entries(bestPracticesData.categories).map(([cat, count]) => (
                      <span
                        key={cat}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                      >
                        {cat}: {count as number}
                      </span>
                    ))}
                  </div>
                )}

                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBestPractices.size === bestPractices.length}
                      onChange={toggleAllBestPractices}
                      className="rounded border-gray-300 text-primary-600"
                    />
                    <span className="text-sm text-gray-700">
                      Select All ({selectedBestPractices.size} of {bestPractices.length} selected)
                    </span>
                  </label>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleImportBestPractices}
                    isLoading={importBestPractices.isPending}
                    disabled={selectedBestPractices.size === 0}
                    leftIcon={<Upload className="h-4 w-4" />}
                  >
                    Import {selectedBestPractices.size > 0 ? `${selectedBestPractices.size} Rule(s)` : 'Selected'}
                  </Button>
                </div>

                {/* Best Practices List */}
                <div className="space-y-3">
                  {bestPractices.map((rule) => (
                    <div
                      key={rule.name}
                      className={cn(
                        'p-4 border rounded-lg cursor-pointer transition-colors',
                        selectedBestPractices.has(rule.name)
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      )}
                      onClick={() => toggleBestPractice(rule.name)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedBestPractices.has(rule.name)}
                          onChange={() => toggleBestPractice(rule.name)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1 rounded border-gray-300 text-primary-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-900">{rule.name}</h4>
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-medium',
                                rule.severity === 'ERROR' && 'bg-red-100 text-red-700',
                                rule.severity === 'WARNING' && 'bg-amber-100 text-amber-700',
                                rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-700'
                              )}
                            >
                              {rule.severity}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {rule.category}
                            </span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                              {rule.ruleType}
                            </span>
                          </div>
                          {rule.examples && rule.examples.length > 0 && (
                            <div className="mt-2 text-xs">
                              <span className="text-gray-500">Example: </span>
                              <span className="text-red-600 line-through">
                                {rule.examples[0].incorrect}
                              </span>
                              <span className="text-gray-400 mx-1">→</span>
                              <span className="text-green-600">{rule.examples[0].correct}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && showForm ? (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h3>
              <button onClick={handleCloseForm} className="text-gray-400 hover:text-gray-600">
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Category and Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleFormChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rule Type</label>
                  <select
                    value={formData.ruleType}
                    onChange={(e) => handleFormChange('ruleType', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {ruleTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pattern (for PATTERN type) */}
              {formData.ruleType === 'PATTERN' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Regex Pattern
                  </label>
                  <input
                    type="text"
                    value={formData.pattern}
                    onChange={(e) => handleFormChange('pattern', e.target.value)}
                    placeholder="e.g., \b(colour|favourite)\b"
                    className="w-full px-3 py-2 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              {/* Terminology fields */}
              {formData.ruleType === 'TERMINOLOGY' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preferred Term
                    </label>
                    <input
                      type="text"
                      value={formData.preferredTerm}
                      onChange={(e) => handleFormChange('preferredTerm', e.target.value)}
                      placeholder="The term to use"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Terms to Avoid (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={formData.avoidTerms}
                      onChange={(e) => handleFormChange('avoidTerms', e.target.value)}
                      placeholder="term1, term2, term3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </>
              )}

              {/* Severity and Active */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={formData.severity}
                    onChange={(e) => handleFormChange('severity', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {severityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Style Guide
                  </label>
                  <select
                    value={formData.baseStyleGuide}
                    onChange={(e) => handleFormChange('baseStyleGuide', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {styleGuideOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => handleFormChange('isActive', e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  Rule is active
                </label>
              </div>

              {/* Test Rule Panel */}
              <div className="border-t pt-4 mt-4">
                <button
                  type="button"
                  onClick={() => setShowTestPanel(!showTestPanel)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Play className="h-4 w-4" />
                  Test Rule
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', showTestPanel && 'rotate-180')}
                  />
                </button>

                {showTestPanel && (
                  <div className="mt-3 space-y-3">
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      placeholder="Enter sample text to test the rule..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleTestRule}
                      isLoading={testRule.isPending}
                      leftIcon={<Play className="h-4 w-4" />}
                    >
                      Run Test
                    </Button>

                    {testRule.data && (
                      <div className="p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700">
                          {testRule.data.matches.length} match(es) found
                        </p>
                        {testRule.data.matches.map((match, idx) => (
                          <div key={idx} className="mt-2 p-2 bg-white rounded border text-sm">
                            <p className="text-red-600 line-through">{match.matchedText}</p>
                            <p className="text-green-600">{match.suggestedFix}</p>
                          </div>
                        ))}
                        {testRule.data.error && (
                          <p className="text-red-600 text-sm mt-2">{testRule.data.error}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCloseForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createRule.isPending || updateRule.isPending}
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </Button>
              </div>
            </form>
          </div>
        ) : activeTab === 'rules' ? (
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              </div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12">
                <Filter className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No Rules Found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery || categoryFilter
                    ? 'No rules match the current filters.'
                    : 'Get started by creating your first house style rule.'}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleOpenCreate}
                  className="mt-4"
                  leftIcon={<Plus className="h-4 w-4" />}
                >
                  Create Rule
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={cn(
                      'p-4 border rounded-lg transition-colors',
                      rule.isActive
                        ? 'border-gray-200 bg-white'
                        : 'border-gray-200 bg-gray-50 opacity-60'
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">{rule.name}</h4>
                          {!rule.isActive && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">
                              Inactive
                            </span>
                          )}
                          <span
                            className={cn(
                              'px-2 py-0.5 rounded text-xs font-medium',
                              rule.severity === 'ERROR' && 'bg-red-100 text-red-700',
                              rule.severity === 'WARNING' && 'bg-amber-100 text-amber-700',
                              rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-700'
                            )}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="text-sm text-gray-600 mt-1">{rule.description}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {rule.category}
                          </span>
                          <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                            {rule.ruleType}
                          </span>
                          {rule.baseStyleGuide && (
                            <span className="inline-block px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                              {rule.baseStyleGuide}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleOpenEdit(rule)}
                          aria-label="Edit rule"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(rule.id)}
                          aria-label="Delete rule"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default HouseRulesManager;
