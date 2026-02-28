/**
 * useHouseRulesState Hook
 *
 * Manages all state and handlers for the HouseRulesManager component.
 * Combines rule CRUD, style guide upload, and best practices logic.
 */

import { useState } from 'react';
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
  useRuleSets,
} from '@/hooks/useStyleValidation';
import type {
  HouseStyleRule,
  CreateHouseRuleInput,
  UpdateHouseRuleInput,
  StyleCategory,
  StyleGuideType,
} from '@/types/style';
import { defaultFormData, normalizeExtractedRules, consolidateCategories } from './houseRulesTypes';
import type { TabType, RuleFormData, ExtractedRule, ExtractionResult } from './houseRulesTypes';

export function useHouseRulesState() {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<StyleCategory | ''>('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRule, setEditingRule] = useState<HouseStyleRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>(defaultFormData);
  const [testText, setTestText] = useState('');
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [styleGuideFile, setStyleGuideFile] = useState<File | null>(null);
  const [extractedRules, setExtractedRules] = useState<ExtractedRule[]>([]);
  const [selectedExtractedRules, setSelectedExtractedRules] = useState<Set<number>>(new Set());
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveRuleSetName, setSaveRuleSetName] = useState('');
  const [saveRuleSetDescription, setSaveRuleSetDescription] = useState('');
  const [saveRuleSetStyleGuide, setSaveRuleSetStyleGuide] = useState<StyleGuideType | ''>('');
  const [selectedBestPractices, setSelectedBestPractices] = useState<Set<string>>(new Set());

  // Queries
  const { data: rulesData, isLoading } = useHouseRules({
    category: categoryFilter || undefined,
    search: searchQuery || undefined,
  });
  const { data: bestPracticesData, isLoading: isLoadingBestPractices } = useBestPractices();
  const { data: ruleSetsData } = useRuleSets();

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

  const rules = rulesData?.rules || [];
  const bestPractices = bestPracticesData?.rules || [];
  const ruleSets = ruleSetsData?.ruleSets || [];

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
      name: rule.name, description: rule.description || '',
      category: rule.category, ruleType: rule.ruleType,
      pattern: rule.pattern || '', preferredTerm: rule.preferredTerm || '',
      avoidTerms: rule.avoidTerms.join(', '), severity: rule.severity,
      isActive: rule.isActive, baseStyleGuide: rule.baseStyleGuide || '',
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

  const buildRuleInput = (): CreateHouseRuleInput => ({
    name: formData.name, description: formData.description || undefined,
    category: formData.category, ruleType: formData.ruleType,
    pattern: formData.pattern || undefined, preferredTerm: formData.preferredTerm || undefined,
    avoidTerms: formData.avoidTerms ? formData.avoidTerms.split(',').map((t) => t.trim()) : [],
    severity: formData.severity, isActive: formData.isActive,
    baseStyleGuide: formData.baseStyleGuide || undefined,
    overridesRule: formData.overridesRule || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = buildRuleInput();
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ ruleId: editingRule.id, input: input as UpdateHouseRuleInput });
        toast.success('Rule updated successfully');
      } else {
        await createRule.mutateAsync(input);
        toast.success('Rule created successfully');
      }
      handleCloseForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save rule');
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await deleteRule.mutateAsync(ruleId);
      toast.success('Rule deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete rule');
    }
  };

  const handleTestRule = async () => {
    if (!testText) return;
    try {
      await testRule.mutateAsync({ rule: buildRuleInput(), sampleText: testText });
    } catch {
      toast.error('Failed to test rule');
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
    } catch {
      toast.error('Failed to export rules');
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    try {
      const text = await importFile.text();
      const result = await importRules.mutateAsync(JSON.parse(text));
      setImportFile(null);
      toast.success(`Imported ${result.imported} rule(s)${result.skipped > 0 ? `, ${result.skipped} skipped` : ''}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import rules - check JSON format');
    }
  };

  const handleStyleGuideUpload = async () => {
    if (!styleGuideFile) return;
    try {
      const result = await uploadStyleGuide.mutateAsync(styleGuideFile);
      const normalized = normalizeExtractedRules(result.rules);
      setExtractedRules(normalized);
      setExtractionResult({
        documentTitle: result.documentTitle,
        totalRulesExtracted: result.totalRulesExtracted,
        categories: consolidateCategories(result.categories),
        processingTimeMs: result.processingTimeMs,
        warnings: result.warnings,
      });
      setSelectedExtractedRules(new Set(normalized.map((_, i) => i)));
      toast.success(`Extracted ${normalized.length} rules from document`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract rules');
    }
  };

  const handleOpenSaveDialog = () => {
    if (extractedRules.filter((_, i) => selectedExtractedRules.has(i)).length === 0) return;
    setSaveRuleSetName(
      extractionResult?.documentTitle ||
      styleGuideFile?.name?.replace(/\.(pdf|docx?|doc)$/i, '') || 'Imported Rules'
    );
    setSaveRuleSetDescription(`Rules extracted from ${styleGuideFile?.name || 'uploaded document'}`);
    setSaveRuleSetStyleGuide('');
    setShowSaveDialog(true);
  };

  const handleSaveExtractedRules = async () => {
    const rulesToSave = extractedRules.filter((_, i) => selectedExtractedRules.has(i));
    if (rulesToSave.length === 0) return;
    if (!saveRuleSetName.trim()) { toast.error('Please enter a name for the rule set'); return; }
    try {
      const result = await saveExtractedRules.mutateAsync({
        rules: rulesToSave, sourceDocumentName: styleGuideFile?.name,
        ruleSetName: saveRuleSetName.trim(),
        ruleSetDescription: saveRuleSetDescription.trim() || undefined,
        baseStyleGuide: saveRuleSetStyleGuide || undefined,
      });
      toast.success(`Created rule set "${saveRuleSetName}" with ${result.savedCount} rules`);
      setStyleGuideFile(null); setExtractedRules([]); setSelectedExtractedRules(new Set());
      setExtractionResult(null); setShowSaveDialog(false);
      setSaveRuleSetName(''); setSaveRuleSetDescription(''); setSaveRuleSetStyleGuide('');
      setActiveTab('rule-sets');
    } catch (error) {
      let message = 'Failed to save rules';
      if (error && typeof error === 'object' && 'response' in error) {
        const resp = (error as { response?: { data?: { error?: { code?: string; message?: string } } } }).response;
        const code = resp?.data?.error?.code;
        const serverMsg = resp?.data?.error?.message;
        if (code === 'DUPLICATE_NAME' || (serverMsg && serverMsg.toLowerCase().includes('already exists'))) {
          message = `A rule set named "${saveRuleSetName}" already exists. Please choose a different name.`;
        } else if (code === 'RULE_SET_CREATE_FAILED') {
          message = serverMsg || 'Failed to create rule set. Please try again.';
        } else if (serverMsg) { message = serverMsg; }
      } else if (error instanceof Error) { message = error.message; }
      toast.error(message);
    }
  };

  const toggleExtractedRule = (idx: number) => {
    setSelectedExtractedRules((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAllExtractedRules = () => {
    setSelectedExtractedRules(
      selectedExtractedRules.size === extractedRules.length
        ? new Set() : new Set(extractedRules.map((_, i) => i))
    );
  };

  const handleClearExtraction = () => {
    setExtractedRules([]); setSelectedExtractedRules(new Set());
    setExtractionResult(null); setStyleGuideFile(null);
  };

  const handleImportBestPractices = async () => {
    try {
      await importBestPractices.mutateAsync(
        selectedBestPractices.size > 0 ? Array.from(selectedBestPractices) : undefined
      );
      setSelectedBestPractices(new Set());
      setActiveTab('rules');
    } catch {
      toast.error('Failed to import best practices');
    }
  };

  const toggleBestPractice = (name: string) => {
    setSelectedBestPractices((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleAllBestPractices = () => {
    setSelectedBestPractices(
      selectedBestPractices.size === bestPractices.length
        ? new Set() : new Set(bestPractices.map((r) => r.name))
    );
  };

  return {
    activeTab, setActiveTab,
    rules, isLoading, searchQuery, setSearchQuery,
    categoryFilter, setCategoryFilter,
    importFile, setImportFile, handleImport, isImporting: importRules.isPending,
    handleExport, isExporting: exportRules.isPending,
    showForm, editingRule, formData, handleFormChange,
    handleOpenCreate, handleOpenEdit, handleCloseForm, handleSubmit,
    isSaving: createRule.isPending || updateRule.isPending,
    handleDelete,
    testText, setTestText, showTestPanel, setShowTestPanel,
    handleTestRule, isTestingRule: testRule.isPending, testResult: testRule.data,
    styleGuideFile, setStyleGuideFile,
    extractedRules, selectedExtractedRules, extractionResult,
    handleStyleGuideUpload, isUploading: uploadStyleGuide.isPending,
    toggleExtractedRule, toggleAllExtractedRules, handleClearExtraction,
    showSaveDialog, setShowSaveDialog, handleOpenSaveDialog, handleSaveExtractedRules,
    saveRuleSetName, setSaveRuleSetName,
    saveRuleSetDescription, setSaveRuleSetDescription,
    saveRuleSetStyleGuide, setSaveRuleSetStyleGuide,
    isSavingExtracted: saveExtractedRules.isPending,
    ruleSets,
    bestPractices, isLoadingBestPractices, bestPracticesData,
    selectedBestPractices, toggleBestPractice, toggleAllBestPractices,
    handleImportBestPractices, isImportingBestPractices: importBestPractices.isPending,
  };
}
