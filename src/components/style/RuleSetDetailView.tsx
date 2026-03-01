/**
 * RuleSetDetailView - Detail view for a selected rule set with paginated rules.
 * RuleSetRulesPreview - Inline preview shown when a card is expanded in list view.
 */
import { useState, useMemo, useCallback } from 'react';
import { Plus, Copy, FolderOpen, ChevronRight, ChevronLeft, Loader2, ArrowLeft } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { useCustomRuleSet, useBuiltInRuleSet } from '@/hooks/useStyleValidation';
import type { HouseStyleRule, HouseRuleSet } from '@/types/style';
import { RuleInSetCard } from './RuleInSetCard';

const RULES_PER_PAGE = 10;

interface RuleSetDetailViewProps {
  ruleSet: HouseRuleSet;
  isLoading: boolean;
  onBack: () => void;
  onCopy: (ruleSet: HouseRuleSet) => void;
  onOpenAddRule: () => void;
  onEditRule?: (rule: HouseStyleRule) => void;
  onDeleteRule: (ruleId: string) => void;
  addRuleFormSlot?: React.ReactNode;
}

export function RuleSetDetailView({
  ruleSet, isLoading, onBack, onCopy, onOpenAddRule, onEditRule, onDeleteRule, addRuleFormSlot,
}: RuleSetDetailViewProps) {
  const [page, setPage] = useState(1);
  const paginated = useMemo(() => {
    if (!ruleSet?.rules) return null;
    const s = (page - 1) * RULES_PER_PAGE;
    const e = s + RULES_PER_PAGE;
    return {
      rules: ruleSet.rules.slice(s, e), totalPages: Math.ceil(ruleSet.rules.length / RULES_PER_PAGE),
      page, total: ruleSet.rules.length, start: s + 1, end: Math.min(e, ruleSet.rules.length),
    };
  }, [ruleSet, page]);
  const go = useCallback((p: number) => setPage(p), []);

  const getPageNum = (i: number, cur: number, last: number) => {
    if (last <= 5) return i + 1;
    if (cur <= 3) return i + 1;
    if (cur >= last - 2) return last - 4 + i;
    return cur - 2 + i;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-medium text-gray-900">{ruleSet.name}</h3>
              {ruleSet.isDefault && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Default</span>}
              {ruleSet.baseStyleGuide && <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">{ruleSet.baseStyleGuide}</span>}
            </div>
            {ruleSet.description && <p className="text-sm text-gray-500 mt-0.5">{ruleSet.description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => onCopy(ruleSet)}><Copy className="h-4 w-4 mr-1" />Duplicate</Button>
          <Button size="sm" variant="primary" onClick={onOpenAddRule}><Plus className="h-4 w-4 mr-1" />Add Rule</Button>
        </div>
      </div>
      {addRuleFormSlot}
      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary-600" /></div>
      ) : paginated && paginated.total > 0 ? (
        <div>
          <div className="flex items-center justify-between mb-4 text-sm text-gray-500">
            <span>Showing {paginated.start}-{paginated.end} of {paginated.total} rules</span>
            {paginated.totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => go(paginated.page - 1)} disabled={paginated.page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                <span>Page {paginated.page} of {paginated.totalPages}</span>
                <Button size="sm" variant="ghost" onClick={() => go(paginated.page + 1)} disabled={paginated.page === paginated.totalPages}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            {paginated.rules.map((rule) => (
              <RuleInSetCard key={rule.id} rule={rule} onEdit={onEditRule} onDelete={onDeleteRule} />
            ))}
          </div>
          {paginated.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => go(paginated.page - 1)} disabled={paginated.page === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, paginated.totalPages) }, (_, i) => {
                  const pn = getPageNum(i, paginated.page, paginated.totalPages);
                  return (
                    <Button key={pn} size="sm" variant={paginated.page === pn ? 'primary' : 'ghost'} onClick={() => go(pn)} className="w-8">{pn}</Button>
                  );
                })}
              </div>
              <Button size="sm" variant="outline" onClick={() => go(paginated.page + 1)} disabled={paginated.page === paginated.totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <FolderOpen className="mx-auto h-10 w-10 text-gray-300 mb-2" />
          <p className="text-sm">No rules in this set yet.</p>
          <p className="text-xs mt-1">Click &quot;Add Rule&quot; to add your first rule.</p>
        </div>
      )}
    </div>
  );
}

/** Inline rules preview shown when a rule set card is expanded in the list view. */
export function RuleSetRulesPreview({ ruleSetId, isBuiltIn, onViewAll }: {
  ruleSetId: string; isBuiltIn?: boolean; onViewAll: () => void;
}) {
  const customQ = useCustomRuleSet(isBuiltIn ? '' : ruleSetId);
  const builtInQ = useBuiltInRuleSet(isBuiltIn ? ruleSetId : '');
  const { data: rsData, isLoading } = isBuiltIn ? builtInQ : customQ;

  if (isLoading) {
    return (<div className="px-4 pb-4 border-t bg-gray-50"><div className="flex items-center justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div></div>);
  }
  const rules = rsData?.rules || [];
  if (rules.length === 0) {
    return (<div className="px-4 pb-4 border-t bg-gray-50"><p className="text-sm text-gray-500 py-3">No rules in this set</p></div>);
  }
  return (
    <div className="px-4 pb-4 border-t bg-gray-50">
      <div className="space-y-2 pt-3">
        {rules.slice(0, 3).map((rule) => (
          <div key={rule.id} className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-gray-700 truncate flex-1">{rule.name}</span>
            <span className={cn('px-1.5 py-0.5 rounded text-xs',
              rule.severity === 'ERROR' && 'bg-red-100 text-red-600',
              rule.severity === 'WARNING' && 'bg-amber-100 text-amber-600',
              rule.severity === 'SUGGESTION' && 'bg-blue-100 text-blue-600'
            )}>{rule.severity}</span>
          </div>
        ))}
        {rules.length > 3 && (
          <button onClick={onViewAll} className="text-sm text-primary-600 hover:text-primary-700 font-medium mt-2">
            View all {rules.length} rules &rarr;
          </button>
        )}
      </div>
    </div>
  );
}
