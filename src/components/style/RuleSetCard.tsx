/**
 * RuleSetCard Component
 *
 * Displays a single rule set in the list view.
 * Shows name, badges (default, style guide, inactive), description,
 * rule count, and action buttons (duplicate, edit, delete, expand/collapse).
 */

import {
  Edit2,
  Trash2,
  Copy,
  FolderOpen,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { HouseRuleSet } from '@/types/style';
import { RuleSetRulesPreview } from './RuleSetDetailView';

interface RuleSetCardProps {
  ruleSet: HouseRuleSet;
  isExpanded: boolean;
  onSelect: (ruleSetId: string, isBuiltIn?: boolean) => void;
  onToggleExpand: (ruleSetId: string) => void;
  onCopy: (ruleSet: HouseRuleSet) => void;
  onEdit: (ruleSet: HouseRuleSet) => void;
  onDelete: (ruleSetId: string) => void;
}

export function RuleSetCard({
  ruleSet,
  isExpanded,
  onSelect,
  onToggleExpand,
  onCopy,
  onEdit,
  onDelete,
}: RuleSetCardProps) {
  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <div
        className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
        onClick={() => onSelect(ruleSet.id, ruleSet.isBuiltIn)}
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
              onClick={(e) => { e.stopPropagation(); onCopy(ruleSet); }}
              aria-label="Duplicate rule set"
              title="Duplicate rule set"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onEdit(ruleSet); }}
              aria-label="Edit rule set"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onDelete(ruleSet.id); }}
              aria-label="Delete rule set"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(ruleSet.id); }}
              className="p-1 hover:bg-gray-100 rounded"
              aria-label={isExpanded ? 'Collapse rules' : 'Expand rules'}
            >
              {isExpanded ? (
                <ChevronDown className="h-5 w-5 text-gray-400" />
              ) : (
                <ChevronRight className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <RuleSetRulesPreview
          ruleSetId={ruleSet.id}
          isBuiltIn={ruleSet.isBuiltIn}
          onViewAll={() => onSelect(ruleSet.id, ruleSet.isBuiltIn)}
        />
      )}
    </div>
  );
}
