/**
 * CopyRuleSetDialog Component
 *
 * Modal dialog for duplicating a rule set. Allows the user to
 * choose a new name and select which rules to copy from the source set.
 */
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { useCreateRuleSet } from '@/hooks/useStyleValidation';
import { styleService } from '@/services/style.service';
import type { HouseRuleSet } from '@/types/style';

interface CopyRuleSetDialogProps {
  ruleSet: HouseRuleSet;
  onClose: () => void;
}

export function CopyRuleSetDialog({ ruleSet, onClose }: CopyRuleSetDialogProps) {
  const [copyName, setCopyName] = useState(`${ruleSet.name} (Copy)`);
  const [selected, setSelected] = useState<Set<string>>(new Set(ruleSet.rules?.map((r) => r.id) || []));
  const [isCopying, setIsCopying] = useState(false);
  const createRuleSet = useCreateRuleSet();

  const rules = ruleSet.rules || [];

  const toggleRule = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleAll = () => {
    setSelected(selected.size === rules.length ? new Set() : new Set(rules.map((r) => r.id)));
  };

  const handleCopy = async () => {
    if (!copyName.trim()) return;
    setIsCopying(true);
    try {
      const newSet = await createRuleSet.mutateAsync({
        name: copyName.trim(),
        description: ruleSet.description ? `Copied from: ${ruleSet.name}` : undefined,
        baseStyleGuide: ruleSet.baseStyleGuide,
        isDefault: false,
      });
      const toCopy = rules.filter((r) => selected.has(r.id));
      if (toCopy.length > 0) {
        await styleService.importRulesToSet(newSet.id, {
          version: '1.0',
          rules: toCopy.map((r) => ({
            name: r.name, description: r.description, category: r.category,
            ruleType: r.ruleType, pattern: r.pattern, preferredTerm: r.preferredTerm,
            avoidTerms: r.avoidTerms, severity: r.severity, isActive: r.isActive,
            baseStyleGuide: r.baseStyleGuide,
          })),
        });
      }
      toast.success(`Rule set "${copyName}" created with ${toCopy.length} rules`);
      onClose();
    } catch {
      toast.error('Failed to copy rule set');
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold">Duplicate Rule Set</h3>
          <p className="text-sm text-gray-500 mt-1">
            Create a copy of &quot;{ruleSet.name}&quot; with selected rules.
          </p>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Name *</label>
            <input
              type="text" value={copyName} onChange={(e) => setCopyName(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500" required
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Select Rules to Copy ({selected.size}/{rules.length})
              </label>
              <Button type="button" size="sm" variant="ghost" onClick={toggleAll}>
                {selected.size === rules.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>
            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {rules.map((rule) => (
                <label key={rule.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                  <input type="checkbox" checked={selected.has(rule.id)} onChange={() => toggleRule(rule.id)} className="rounded border-gray-300" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{rule.name}</p>
                    <p className="text-xs text-gray-500">{rule.category} &bull; {rule.severity}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 border-t flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" onClick={handleCopy} isLoading={isCopying} disabled={!copyName.trim() || selected.size === 0}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate ({selected.size} rules)
          </Button>
        </div>
      </div>
    </div>
  );
}
