/**
 * RuleSetManager Component
 *
 * Parent component that manages house style rule sets.
 * Orchestrates list view, detail view, create/edit modal,
 * add-rule form, copy/duplicate dialog, and deletion.
 */
import { useState } from 'react';
import { Plus, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  useCustomRuleSets, useCustomRuleSet, useBuiltInRuleSet,
  useCreateRuleSet, useUpdateRuleSet, useDeleteRuleSet, useAddRuleToSet,
} from '@/hooks/useStyleValidation';
import { styleService } from '@/services/style.service';
import type { HouseStyleRule, HouseRuleSet, CreateRuleSetInput, CreateHouseRuleInput } from '@/types/style';
import { RuleSetCard } from './RuleSetCard';
import { RuleSetDetailView } from './RuleSetDetailView';
import { RuleSetFormModal } from './RuleSetFormModal';
import { AddRuleToSetForm } from './AddRuleToSetForm';
import { defaultRuleSetFormData, defaultRuleFormData } from './constants';
import type { RuleSetFormData, RuleFormData } from './constants';
import { CopyRuleSetDialog } from './CopyRuleSetDialog';

interface RuleSetManagerProps {
  className?: string;
  onEditRule?: (rule: HouseStyleRule) => void;
}

export function RuleSetManager({ className, onEditRule }: RuleSetManagerProps) {
  // Selection state
  const [selectedRuleSetId, setSelectedRuleSetId] = useState<string | null>(null);
  const [selectedIsBuiltIn, setSelectedIsBuiltIn] = useState(false);
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  // Form states
  const [showRuleSetForm, setShowRuleSetForm] = useState(false);
  const [editingRuleSet, setEditingRuleSet] = useState<HouseRuleSet | null>(null);
  const [ruleSetFormData, setRuleSetFormData] = useState<RuleSetFormData>(defaultRuleSetFormData);
  const [showAddRuleForm, setShowAddRuleForm] = useState(false);
  const [ruleFormData, setRuleFormData] = useState<RuleFormData>(defaultRuleFormData);

  // Copy dialog state
  const [showCopyDialog, setShowCopyDialog] = useState(false);
  const [copyingRuleSet, setCopyingRuleSet] = useState<HouseRuleSet | null>(null);

  // Queries
  const { data: ruleSetsData, isLoading: isLoadingRuleSets } = useCustomRuleSets({ includeRules: false });
  const customRuleSetQuery = useCustomRuleSet(!selectedIsBuiltIn && selectedRuleSetId ? selectedRuleSetId : '');
  const builtInRuleSetQuery = useBuiltInRuleSet(selectedIsBuiltIn && selectedRuleSetId ? selectedRuleSetId : '');
  const selectedRuleSet = selectedIsBuiltIn ? builtInRuleSetQuery.data : customRuleSetQuery.data;
  const isLoadingSelected = selectedIsBuiltIn ? builtInRuleSetQuery.isLoading : customRuleSetQuery.isLoading;

  // Mutations
  const createRuleSet = useCreateRuleSet();
  const updateRuleSet = useUpdateRuleSet();
  const deleteRuleSet = useDeleteRuleSet();
  const addRuleToSet = useAddRuleToSet();

  const ruleSets = ruleSetsData?.ruleSets || [];

  // -- Handlers --
  const handleSelectRuleSet = (id: string, isBuiltIn?: boolean) => {
    setSelectedRuleSetId(id);
    setSelectedIsBuiltIn(isBuiltIn ?? false);
    setShowAddRuleForm(false);
  };
  const handleBackToList = () => { setSelectedRuleSetId(null); setSelectedIsBuiltIn(false); setShowAddRuleForm(false); };
  const toggleExpand = (id: string) => {
    setExpandedRules((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Rule set form handlers
  const handleOpenCreate = () => { setRuleSetFormData(defaultRuleSetFormData); setEditingRuleSet(null); setShowRuleSetForm(true); };
  const handleOpenEdit = (rs: HouseRuleSet) => {
    setRuleSetFormData({ name: rs.name, description: rs.description || '', baseStyleGuide: rs.baseStyleGuide || '', isDefault: rs.isDefault ?? false });
    setEditingRuleSet(rs); setShowRuleSetForm(true);
  };
  const handleSubmitRuleSet = async (input: CreateRuleSetInput, isEditing: boolean) => {
    try {
      if (isEditing && editingRuleSet) {
        await updateRuleSet.mutateAsync({ ruleSetId: editingRuleSet.id, input });
        toast.success('Rule set updated successfully');
      } else {
        await createRuleSet.mutateAsync(input);
        toast.success('Rule set created successfully');
      }
      setShowRuleSetForm(false); setEditingRuleSet(null);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to save rule set';
      toast.error(msg);
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule set? All rules in this set will also be deleted.')) return;
    try { await deleteRuleSet.mutateAsync(id); toast.success('Rule set deleted'); if (selectedRuleSetId === id) setSelectedRuleSetId(null); }
    catch { toast.error('Failed to delete rule set'); }
  };

  // Copy handlers
  const handleOpenCopy = async (rs: HouseRuleSet) => {
    try {
      const full = await styleService.getRuleSetWithRules(rs.id);
      setCopyingRuleSet(full); setShowCopyDialog(true);
    } catch { toast.error('Failed to load rule set for copying'); }
  };

  // Add rule handlers
  const handleAddRuleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRuleSetId) return;
    const input: CreateHouseRuleInput = {
      name: ruleFormData.name, description: ruleFormData.description || undefined,
      category: ruleFormData.category, ruleType: ruleFormData.ruleType,
      pattern: ruleFormData.pattern || undefined, preferredTerm: ruleFormData.preferredTerm || undefined,
      avoidTerms: ruleFormData.avoidTerms ? ruleFormData.avoidTerms.split(',').map((t) => t.trim()) : [],
      severity: ruleFormData.severity, isActive: true,
    };
    try { await addRuleToSet.mutateAsync({ ruleSetId: selectedRuleSetId, input }); toast.success('Rule added to set'); setShowAddRuleForm(false); setRuleFormData(defaultRuleFormData); }
    catch { toast.error('Failed to add rule'); }
  };
  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try { await styleService.deleteHouseRule(ruleId); toast.success('Rule deleted'); }
    catch { toast.error('Failed to delete rule'); }
  };

  return (
    <div className={cn('', className)}>
      {showRuleSetForm && (
        <RuleSetFormModal editingRuleSet={editingRuleSet} formData={ruleSetFormData} onFormDataChange={setRuleSetFormData}
          onSubmit={handleSubmitRuleSet} onClose={() => { setShowRuleSetForm(false); setEditingRuleSet(null); }}
          isSubmitting={createRuleSet.isPending || updateRuleSet.isPending} />
      )}
      {showCopyDialog && copyingRuleSet && (
        <CopyRuleSetDialog ruleSet={copyingRuleSet} onClose={() => { setShowCopyDialog(false); setCopyingRuleSet(null); }} />
      )}

      {selectedRuleSetId && selectedRuleSet ? (
        <RuleSetDetailView ruleSet={selectedRuleSet} isLoading={isLoadingSelected} onBack={handleBackToList}
          onCopy={handleOpenCopy} onOpenAddRule={() => { setRuleFormData(defaultRuleFormData); setShowAddRuleForm(true); }}
          onEditRule={onEditRule} onDeleteRule={handleDeleteRule}
          addRuleFormSlot={showAddRuleForm ? (
            <AddRuleToSetForm formData={ruleFormData} onFormDataChange={setRuleFormData}
              onSubmit={handleAddRuleSubmit} onCancel={() => { setShowAddRuleForm(false); setRuleFormData(defaultRuleFormData); }}
              isSubmitting={addRuleToSet.isPending} />
          ) : undefined} />
      ) : (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Rule Sets</h3>
              <p className="text-sm text-gray-500 mt-1">Organize rules into named collections. Select rule sets during validation.</p>
            </div>
            <Button size="sm" variant="primary" onClick={handleOpenCreate} leftIcon={<Plus className="h-4 w-4" />}>New Rule Set</Button>
          </div>
          {isLoadingRuleSets ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary-600" /></div>
          ) : ruleSets.length === 0 ? (
            <div className="text-center py-12">
              <FolderOpen className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-4 text-lg font-medium text-gray-900">No Rule Sets</h3>
              <p className="mt-2 text-sm text-gray-500">Create a rule set to organize your style rules into collections.</p>
              <Button variant="primary" size="sm" onClick={handleOpenCreate} className="mt-4" leftIcon={<Plus className="h-4 w-4" />}>Create Rule Set</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {ruleSets.map((rs) => (
                <RuleSetCard key={rs.id} ruleSet={rs} isExpanded={expandedRules.has(rs.id)}
                  onSelect={handleSelectRuleSet} onToggleExpand={toggleExpand}
                  onCopy={handleOpenCopy} onEdit={handleOpenEdit} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
