/**
 * RuleSetManager Component
 *
 * Manages house style rule sets with:
 * - Expand/collapse for rules
 * - Pagination (10 rules per page)
 * - Copy/duplicate rule set functionality
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  useCustomRuleSets,
  useCustomRuleSet,
  useBuiltInRuleSet,
  useCreateRuleSet,
  useUpdateRuleSet,
  useDeleteRuleSet,
  useAddRuleToSet,
} from '@/hooks/useStyleValidation';
import { styleService } from '@/services/style.service';
import type {
  HouseStyleRule,
  HouseRuleSet,
  CreateRuleSetInput,
  CreateHouseRuleInput,
  StyleCategory,
  HouseRuleType,
  StyleSeverity,
  StyleGuideType,
} from '@/types/style';

interface RuleSetManagerProps {
  className?: string;
  onEditRule?: (rule: HouseStyleRule) => void;
}

const RULES_PER_PAGE = 10;

const styleGuideOptions: { value: StyleGuideType | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'CHICAGO', label: 'Chicago Manual of Style' },
  { value: 'APA', label: 'APA Style' },
  { value: 'MLA', label: 'MLA Style' },
  { value: 'AP', label: 'AP Style' },
  { value: 'VANCOUVER', label: 'Vancouver' },
  { value: 'IEEE', label: 'IEEE' },
  { value: 'NATURE', label: 'Nature' },
  { value: 'ELSEVIER', label: 'Elsevier' },
];

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

interface RuleFormData {
  name: string;
  description: string;
  category: StyleCategory;
  ruleType: HouseRuleType;
  pattern: string;
  preferredTerm: string;
  avoidTerms: string;
  severity: StyleSeverity;
}

const defaultRuleFormData: RuleFormData = {
  name: '',
  description: '',
  category: 'TERMINOLOGY',
  ruleType: 'TERMINOLOGY',
  pattern: '',
  preferredTerm: '',
  avoidTerms: '',
  severity: 'WARNING',
};

export function RuleSetManager({ className, onEditRule }: RuleSetManagerProps) {
  // View state
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string | null>(null);
  const [selectedIsBuiltIn, setSelectedIsBuiltIn] = useState<boolean>(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState<Record<string, number>>({});

  // Form state
  const [showRuleSetForm, setShowRuleSetForm] = useState(false);
  const [editingRuleSet, setEditingRuleSet] = useState<HouseRuleSet | null>(null);
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

  // Add rule to set form
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>(defaultRuleFormData);

  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyingRuleSet, setCopyingRuleSet] = useState<HouseRuleSet | null>(null);
  const [copyName, setCopyName] = useState('');
  const [selectedRulesToCopy, setSelectedRulesToCopy] = useState<Set<string>>(new Set());
  const [isCopying, setIsCopying] = useState(false);

  // Queries
  const { data: ruleSetsData, isLoading: isLoadingRuleSets } = useCustomRuleSets({ includeRules: false });

  // Use appropriate hook based on whether selected rule set is built-in or custom
  const customRuleSetQuery = useCustomRuleSet(!selectedIsBuiltIn && selectedRuleSetId ? selectedRuleSetId : '');
  const builtInRuleSetQuery = useBuiltInRuleSet(selectedIsBuiltIn && selectedRuleSetId ? selectedRuleSetId : '');

  const selectedRuleSet = selectedIsBuiltIn ? builtInRuleSetQuery.data : customRuleSetQuery.data;
  const isLoadingSelectedRuleSet = selectedIsBuiltIn ? builtInRuleSetQuery.isLoading : customRuleSetQuery.isLoading;

  // Mutations
  const createRuleSet = useCreateRuleSet();
  const updateRuleSet = useUpdateRuleSet();
  const deleteRuleSet = useDeleteRuleSet();
  const addRuleToSet = useAddRuleToSet();

  const ruleSets = ruleSetsData?.ruleSets || [];

  // Pagination helpers
  const getRulesPage = useCallback((ruleSetId: string, rules: HouseStyleRule[]) => {
    const page = currentPage[ruleSetId] || 1;
    const start = (page - 1) * RULES_PER_PAGE;
    const end = start + RULES_PER_PAGE;
    return {
      rules: rules.slice(start, end),
      totalPages: Math.ceil(rules.length / RULES_PER_PAGE),
      currentPage: page,
      totalRules: rules.length,
      start: start + 1,
      end: Math.min(end, rules.length),
    };
  }, [currentPage]);

  const handlePageChange = (ruleSetId: string, newPage: number) => {
    setCurrentPage((prev) => ({ ...prev, [ruleSetId]: newPage }));
  };

  // Expand/collapse handlers
  const toggleRulesExpanded = (ruleSetId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleSetId)) {
        next.delete(ruleSetId);
      } else {
        next.add(ruleSetId);
      }
      return next;
    });
  };

  const handleSelectRuleSet = (ruleSetId: string, isBuiltIn?: boolean) => {
    setSelectedRuleSetId(ruleSetId);
    setSelectedIsBuiltIn(isBuiltIn ?? false);
    setShowAddRuleForm(false);
    // Reset page when selecting a new rule set
    setCurrentPage((prev) => ({ ...prev, [ruleSetId]: 1 }));
  };

  const handleBackToList = () => {
    setSelectedRuleSetId(null);
    setSelectedIsBuiltIn(false);
    setShowAddRuleForm(false);
  };

  // Rule Set form handlers
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
      isDefault: ruleSet.isDefault ?? false,
    });
    setEditingRuleSet(ruleSet);
    setShowRuleSetForm(true);
  };

  const handleCloseRuleSetForm = () => {
    setShowRuleSetForm(false);
    setEditingRuleSet(null);
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
      toast.success('Rule set deleted');
      if (selectedRuleSetId === ruleSetId) {
        setSelectedRuleSetId(null);
      }
    } catch (error) {
      console.error('Failed to delete rule set:', error);
      toast.error('Failed to delete rule set');
    }
  };

  // Copy/Duplicate handlers
  const handleOpenCopyDialog = async (ruleSet: HouseRuleSet) => {
    setCopyingRuleSet(ruleSet);
    setCopyName(`${ruleSet.name} (Copy)`);

    // Fetch full rule set with rules if not already loaded
    try {
      const fullRuleSet = await styleService.getRuleSetWithRules(ruleSet.id);
      setCopyingRuleSet(fullRuleSet);
      // Select all rules by default
      setSelectedRulesToCopy(new Set(fullRuleSet.rules?.map((r) => r.id) || []));
    } catch (error) {
      console.error('Failed to fetch rule set:', error);
      toast.error('Failed to load rule set for copying');
      return;
    }

    setShowCopyDialog(true);
  };

  const handleCloseCopyDialog = () => {
    setShowCopyDialog(false);
    setCopyingRuleSet(null);
    setCopyName('');
    setSelectedRulesToCopy(new Set());
  };

  const handleCopyRuleSet = async () => {
    if (!copyingRuleSet || !copyName.trim()) return;

    setIsCopying(true);
    try {
      // 1. Create new rule set
      const newRuleSet = await createRuleSet.mutateAsync({
        name: copyName.trim(),
        description: copyingRuleSet.description ? `Copied from: ${copyingRuleSet.name}` : undefined,
        baseStyleGuide: copyingRuleSet.baseStyleGuide,
        isDefault: false,
      });

      // 2. Copy selected rules to the new set
      const rulesToCopy = copyingRuleSet.rules?.filter((r) => selectedRulesToCopy.has(r.id)) || [];

      if (rulesToCopy.length > 0) {
        // Import rules in batch
        const rulesExport = {
          version: '1.0',
          exportedAt: new Date().toISOString(),
          rules: rulesToCopy.map((r) => ({
            name: r.name,
            description: r.description,
            category: r.category,
            ruleType: r.ruleType,
            pattern: r.pattern,
            preferredTerm: r.preferredTerm,
            avoidTerms: r.avoidTerms,
            severity: r.severity,
            isActive: r.isActive,
            baseStyleGuide: r.baseStyleGuide,
          })),
        };

        await styleService.importRulesToSet(newRuleSet.id, rulesExport);
      }

      toast.success(`Rule set "${copyName}" created with ${rulesToCopy.length} rules`);
      handleCloseCopyDialog();
    } catch (error) {
      console.error('Failed to copy rule set:', error);
      toast.error('Failed to copy rule set');
    } finally {
      setIsCopying(false);
    }
  };

  const toggleRuleToCopy = (ruleId: string) => {
    setSelectedRulesToCopy((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  const toggleAllRulesToCopy = () => {
    if (!copyingRuleSet?.rules) return;
    if (selectedRulesToCopy.size === copyingRuleSet.rules.length) {
      setSelectedRulesToCopy(new Set());
    } else {
      setSelectedRulesToCopy(new Set(copyingRuleSet.rules.map((r) => r.id)));
    }
  };

  // Add rule handlers
  const handleOpenAddRule = () => {
    setRuleFormData(defaultRuleFormData);
    setShowAddRuleForm(true);
  };

  const handleCloseAddRule = () => {
    setShowAddRuleForm(false);
    setRuleFormData(defaultRuleFormData);
  };

  const handleAddRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleSetId) return;

    const input: CreateHouseRuleInput = {
      name: ruleFormData.name,
      description: ruleFormData.description || undefined,
      category: ruleFormData.category,
      ruleType: ruleFormData.ruleType,
      pattern: ruleFormData.pattern || undefined,
      preferredTerm: ruleFormData.preferredTerm || undefined,
      avoidTerms: ruleFormData.avoidTerms ? ruleFormData.avoidTerms.split(',').map((t) => t.trim()) : [],
      severity: ruleFormData.severity,
      isActive: true,
    };

    try {
      await addRuleToSet.mutateAsync({ ruleSetId: selectedRuleSetId, input });
      toast.success('Rule added to set');
      handleCloseAddRule();
    } catch (error) {
      console.error('Failed to add rule:', error);
      toast.error('Failed to add rule');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;

    try {
      await styleService.deleteHouseRule(ruleId);
      toast.success('Rule deleted');
    } catch (error) {
      console.error('Failed to delete rule:', error);
      toast.error('Failed to delete rule');
    }
  };

  // Memoized pagination data for selected rule set
  const paginatedRules = useMemo(() => {
    if (!selectedRuleSet?.rules) return null;
    return getRulesPage(selectedRuleSet.id, selectedRuleSet.rules);
  }, [selectedRuleSet, getRulesPage]);

  return (
    <div className={cn('', className)}>
      {/* Rule Set Form Modal */}
      {showRuleSetForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingRuleSet ? 'Edit Rule Set' : 'Create Rule Set'}
            </h3>
            <form onSubmit={handleSubmitRuleSet} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={ruleSetFormData.name}
                  onChange={(e) => setRuleSetFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={ruleSetFormData.description}
                  onChange={(e) => setRuleSetFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Style Guide</label>
                <select
                  value={ruleSetFormData.baseStyleGuide}
                  onChange={(e) =>
                    setRuleSetFormData((prev) => ({
                      ...prev,
                      baseStyleGuide: e.target.value as StyleGuideType | '',
                    }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  onChange={(e) => setRuleSetFormData((prev) => ({ ...prev, isDefault: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="isDefault" className="text-sm text-gray-700">
                  Set as default rule set
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={handleCloseRuleSetForm}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={createRuleSet.isPending || updateRuleSet.isPending}
                >
                  {editingRuleSet ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy Rule Set Dialog */}
      {showCopyDialog && copyingRuleSet && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Duplicate Rule Set</h3>
              <p className="text-sm text-gray-500 mt-1">
                Create a copy of "{copyingRuleSet.name}" with selected rules.
              </p>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Name *</label>
                <input
                  type="text"
                  value={copyName}
                  onChange={(e) => setCopyName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Select Rules to Copy ({selectedRulesToCopy.size}/{copyingRuleSet.rules?.length || 0})
                  </label>
                  <Button type="button" size="sm" variant="ghost" onClick={toggleAllRulesToCopy}>
                    {selectedRulesToCopy.size === (copyingRuleSet.rules?.length || 0) ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  {copyingRuleSet.rules?.map((rule) => (
                    <label
                      key={rule.id}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRulesToCopy.has(rule.id)}
                        onChange={() => toggleRuleToCopy(rule.id)}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                        <p className="text-xs text-gray-500">
                          {rule.category} • {rule.severity}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={handleCloseCopyDialog}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleCopyRuleSet}
                isLoading={isCopying}
                disabled={!copyName.trim() || selectedRulesToCopy.size === 0}
              >
                <Copy className="h-4 w-4 mr-2" />
                Duplicate ({selectedRulesToCopy.size} rules)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      {selectedRuleSetId && selectedRuleSet ? (
        /* Selected Rule Set Detail View */
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Button size="sm" variant="ghost" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">{selectedRuleSet.name}</h3>
                  {selectedRuleSet.isDefault && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Default</span>
                  )}
                  {selectedRuleSet.baseStyleGuide && (
                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                      {selectedRuleSet.baseStyleGuide}
                    </span>
                  )}
                </div>
                {selectedRuleSet.description && (
                  <p className="text-sm text-gray-500 mt-0.5">{selectedRuleSet.description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => handleOpenCopyDialog(selectedRuleSet)}>
                <Copy className="h-4 w-4 mr-1" />
                Duplicate
              </Button>
              <Button size="sm" variant="primary" onClick={handleOpenAddRule}>
                <Plus className="h-4 w-4 mr-1" />
                Add Rule
              </Button>
            </div>
          </div>

          {/* Add Rule Form */}
          {showAddRuleForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-3">Add New Rule</h4>
              <form onSubmit={handleAddRuleSubmit} className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={ruleFormData.name}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={ruleFormData.description}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={ruleFormData.category}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, category: e.target.value as StyleCategory }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {categoryOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={ruleFormData.ruleType}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, ruleType: e.target.value as HouseRuleType }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {ruleTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select
                    value={ruleFormData.severity}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, severity: e.target.value as StyleSeverity }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    {severityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pattern (Regex)</label>
                  <input
                    type="text"
                    value={ruleFormData.pattern}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, pattern: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                    placeholder="e.g., \bcolor\b"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Term</label>
                  <input
                    type="text"
                    value={ruleFormData.preferredTerm}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, preferredTerm: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g., colour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avoid Terms (comma-separated)</label>
                  <input
                    type="text"
                    value={ruleFormData.avoidTerms}
                    onChange={(e) => setRuleFormData((prev) => ({ ...prev, avoidTerms: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    placeholder="e.g., color, colr"
                  />
                </div>
                <div className="col-span-2 flex justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleCloseAddRule}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" variant="primary" isLoading={addRuleToSet.isPending}>
                    Add Rule
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Rules List with Pagination */}
          {isLoadingSelectedRuleSet ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
            </div>
          ) : paginatedRules && paginatedRules.totalRules > 0 ? (
            <div>
              {/* Pagination Header */}
              <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
                <span>
                  Showing {paginatedRules.start}-{paginatedRules.end} of {paginatedRules.totalRules} rules
                </span>
                {paginatedRules.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePageChange(selectedRuleSet.id, paginatedRules.currentPage - 1)}
                      disabled={paginatedRules.currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span>
                      Page {paginatedRules.currentPage} of {paginatedRules.totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePageChange(selectedRuleSet.id, paginatedRules.currentPage + 1)}
                      disabled={paginatedRules.currentPage === paginatedRules.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Rules */}
              <div className="space-y-2">
                {paginatedRules.rules.map((rule) => (
                  <div key={rule.id} className="p-3 border rounded-lg bg-white hover:bg-gray-50">
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
                          onClick={() => onEditRule?.(rule)}
                          aria-label="Edit rule"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRule(rule.id)}
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

              {/* Pagination Footer */}
              {paginatedRules.totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange(selectedRuleSet.id, paginatedRules.currentPage - 1)}
                    disabled={paginatedRules.currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, paginatedRules.totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (paginatedRules.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (paginatedRules.currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (paginatedRules.currentPage >= paginatedRules.totalPages - 2) {
                        pageNum = paginatedRules.totalPages - 4 + i;
                      } else {
                        pageNum = paginatedRules.currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          size="sm"
                          variant={paginatedRules.currentPage === pageNum ? 'primary' : 'ghost'}
                          onClick={() => handlePageChange(selectedRuleSet.id, pageNum)}
                          className="w-8"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePageChange(selectedRuleSet.id, paginatedRules.currentPage + 1)}
                    disabled={paginatedRules.currentPage === paginatedRules.totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
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
            <Button size="sm" variant="primary" onClick={handleOpenCreateRuleSet} leftIcon={<Plus className="h-4 w-4" />}>
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
                <div key={ruleSet.id} className="border rounded-lg bg-white overflow-hidden">
                  {/* Rule Set Header */}
                  <div
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => handleSelectRuleSet(ruleSet.id, ruleSet.isBuiltIn)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-5 w-5 text-primary-500" />
                          <h4 className="font-medium text-gray-900">{ruleSet.name}</h4>
                          {ruleSet.isDefault && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Default</span>
                          )}
                          {ruleSet.baseStyleGuide && (
                            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                              {ruleSet.baseStyleGuide}
                            </span>
                          )}
                          {!ruleSet.isActive && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded text-xs">Inactive</span>
                          )}
                        </div>
                        {ruleSet.description && (
                          <p className="text-sm text-gray-500 mt-1 ml-7">{ruleSet.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1 ml-7">
                          {ruleSet.ruleCount ?? ruleSet._count?.rules ?? 0} rules • {ruleSet.source || 'custom'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCopyDialog(ruleSet);
                          }}
                          aria-label="Duplicate rule set"
                          title="Duplicate rule set"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
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
                        {/* Expand/Collapse Toggle */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRulesExpanded(ruleSet.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                          aria-label={expandedRules.has(ruleSet.id) ? 'Collapse rules' : 'Expand rules'}
                        >
                          {expandedRules.has(ruleSet.id) ? (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Rules Preview */}
                  {expandedRules.has(ruleSet.id) && (
                    <RuleSetRulesPreview
                      ruleSetId={ruleSet.id}
                      isBuiltIn={ruleSet.isBuiltIn}
                      onViewAll={() => handleSelectRuleSet(ruleSet.id, ruleSet.isBuiltIn)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Sub-component for rules preview when expanded
function RuleSetRulesPreview({
  ruleSetId,
  isBuiltIn,
  onViewAll
}: {
  ruleSetId: string;
  isBuiltIn?: boolean;
  onViewAll: () => void;
}) {
  // Use the appropriate hook based on whether this is a built-in or custom rule set
  const customQuery = useCustomRuleSet(isBuiltIn ? '' : ruleSetId);
  const builtInQuery = useBuiltInRuleSet(isBuiltIn ? ruleSetId : '');

  const { data: ruleSet, isLoading } = isBuiltIn ? builtInQuery : customQuery;

  if (isLoading) {
    return (
      <div className="px-4 pb-4 border-t bg-gray-50">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const rules = ruleSet?.rules || [];
  const previewRules = rules.slice(0, 3);
  const hasMore = rules.length > 3;

  if (rules.length === 0) {
    return (
      <div className="px-4 pb-4 border-t bg-gray-50">
        <p className="text-sm text-gray-500 py-3">No rules in this set</p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4 border-t bg-gray-50">
      <div className="space-y-2 pt-3">
        {previewRules.map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-gray-700 truncate flex-1">{rule.name}</span>
            <span
              className={cn(
                'px-1.5 py-0.5 rounded text-xs',
                rule.severity === 'ERROR' && 'bg-red-100 text-red-600',
                rule.severity === 'WARNING' && 'bg-amber-100 text-amber-600',
                rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-600'
              )}
            >
              {rule.severity}
            </span>
          </div>
        ))}
        {hasMore && (
          <button
            onClick={onViewAll}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2"
          >
            View all {rules.length} rules →
          </button>
        )}
      </div>
    </div>
  );
}
