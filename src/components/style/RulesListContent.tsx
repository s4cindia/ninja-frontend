/**
 * RulesListContent Component
 *
 * The scrollable rules list rendered in the content area.
 * Shows loading state, empty state, or the list of rules with edit/delete actions.
 */

import {
  Plus,
  Edit2,
  Trash2,
  Filter,
  Loader2,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { HouseStyleRule, StyleCategory } from '@/types/style';

interface RulesListContentProps {
  rules: HouseStyleRule[];
  isLoading: boolean;
  searchQuery: string;
  categoryFilter: StyleCategory | '';
  onOpenCreate: () => void;
  onOpenEdit: (rule: HouseStyleRule) => void;
  onDelete: (ruleId: string) => void;
}

export function RulesListContent({
  rules,
  isLoading,
  searchQuery,
  categoryFilter,
  onOpenCreate,
  onOpenEdit,
  onDelete,
}: RulesListContentProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (rules.length === 0) {
    return (
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
          onClick={onOpenCreate}
          className="mt-4"
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Create Rule
        </Button>
      </div>
    );
  }

  return (
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
                onClick={() => onOpenEdit(rule)}
                aria-label="Edit rule"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(rule.id)}
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
  );
}
