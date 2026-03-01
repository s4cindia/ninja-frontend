/**
 * RuleInSetCard Component
 *
 * Displays an individual rule within a rule set detail view.
 * Shows rule name, severity badge, description, category/type tags,
 * and edit/delete action buttons.
 */

import { Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import type { HouseStyleRule } from '@/types/style';

interface RuleInSetCardProps {
  rule: HouseStyleRule;
  onEdit?: (rule: HouseStyleRule) => void;
  onDelete: (ruleId: string) => void;
}

export function RuleInSetCard({ rule, onEdit, onDelete }: RuleInSetCardProps) {
  return (
    <div className="p-3 border rounded-lg bg-white hover:bg-gray-50">
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
            onClick={() => onEdit?.(rule)}
            aria-label="Edit rule"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(rule.id)}
            aria-label="Delete rule"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
