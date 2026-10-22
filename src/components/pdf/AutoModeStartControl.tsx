/**
 * AutoModeStartControl
 *
 * "Start Auto Remediation" button for a job with no linked Comparison
 * Study trial. Trial-linked jobs keep their existing plain start button
 * (PdfAuditResultsPage calls onStart() with no overrides for those) —
 * this component's inline popover is only for the regular-job path, where
 * the operator can override the per-run max rounds / cost limit /
 * color-contrast handling before starting. See ComparisonTrialWorkspacePage
 * for the trial's own separate (persisted) config UI, which this does not
 * replace.
 */

import { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { StartAutoModeOverrides } from '@/services/pdfAutoMode.service';
import type { BudgetEstimate } from '@/types/pdfAutoMode.types';

const DEFAULT_MAX_ROUNDS = 10;
const DEFAULT_COST_LIMIT_USD = 2;
const DEFAULT_COLOR_CONTRAST_MODE: NonNullable<StartAutoModeOverrides['autoColorContrastMode']> = 'apply-to-pdf';

interface AutoModeStartControlProps {
  /** Called with the chosen overrides when showConfig, or with no args otherwise. */
  onStart: (overrides?: StartAutoModeOverrides) => void;
  isPending: boolean;
  disabled: boolean;
  disabledTitle?: string;
  /**
   * Only a job with no linked Comparison Study trial honors a per-run
   * override — showing the config form for a trial-linked job would offer
   * controls the backend silently ignores.
   */
  showConfig: boolean;
  /**
   * Idle-state button text — defaults to this component's original
   * single-file label. PDF batch processing reuses this exact component
   * (same fields, same defaults, same popover) for its own "Start
   * Processing" trigger, where every item always honors overrides (no
   * trial-linked complexity for batches), passing this to match.
   */
  triggerLabel?: string;
  /**
   * Suggested cost limit from useBudgetEstimate/useBatchBudgetEstimate —
   * seeds the Cost Limit field instead of the flat $2 default when present
   * and not low-confidence. Falls back to the flat default exactly as
   * before whenever this is missing, still loading, or low-confidence (no
   * regression path while historical data is still thin).
   */
  budgetEstimate?: BudgetEstimate;
}

export function AutoModeStartControl({ onStart, isPending, disabled, disabledTitle, showConfig, triggerLabel = 'Start Auto Remediation', budgetEstimate }: AutoModeStartControlProps) {
  const [open, setOpen] = useState(false);
  const [maxRoundsInput, setMaxRoundsInput] = useState(String(DEFAULT_MAX_ROUNDS));
  const [costLimitInput, setCostLimitInput] = useState(String(DEFAULT_COST_LIMIT_USD));
  const [colorContrastMode, setColorContrastMode] = useState<NonNullable<StartAutoModeOverrides['autoColorContrastMode']>>(
    DEFAULT_COLOR_CONTRAST_MODE
  );

  const hasConfidentEstimate = !!budgetEstimate && budgetEstimate.confidence !== 'low';

  // Re-seeds the Cost Limit field whenever the estimate changes after this
  // component already mounted (the query resolving async, or -- since this
  // component can be reused across job/batch navigations without
  // unmounting -- the estimate changing under it entirely) -- only while
  // the popover is closed, so it never clobbers an operator's own
  // in-progress edit. Falls back to the flat default on any non-confident
  // result (missing, still loading, or low-confidence), not just on mount,
  // so a confident estimate that's later replaced by a non-confident one
  // doesn't leave the field showing a stale value.
  useEffect(() => {
    if (open) return;
    setCostLimitInput(String(hasConfidentEstimate ? budgetEstimate!.estimatedCostUsd : DEFAULT_COST_LIMIT_USD));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasConfidentEstimate, budgetEstimate?.estimatedCostUsd]);

  const handleButtonClick = () => {
    if (!showConfig) {
      onStart();
      return;
    }
    setOpen((v) => !v);
  };

  const handleConfirm = () => {
    const maxRounds = Number(maxRoundsInput);
    const costLimit = Number(costLimitInput);
    onStart({
      autoMaxRounds: Number.isFinite(maxRounds) && maxRounds > 0 ? Math.trunc(maxRounds) : DEFAULT_MAX_ROUNDS,
      autoCostLimitUsd: Number.isFinite(costLimit) && costLimit > 0 ? costLimit : DEFAULT_COST_LIMIT_USD,
      autoColorContrastMode: colorContrastMode,
    });
    setOpen(false);
  };

  return (
    <div className="relative">
      <Button
        variant="primary"
        size="sm"
        onClick={handleButtonClick}
        disabled={disabled || isPending}
        title={disabled ? disabledTitle : undefined}
      >
        {isPending
          ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Starting…</>
          : <><Sparkles className="h-4 w-4 mr-1" />{triggerLabel}</>
        }
      </Button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-800 mb-3">Auto remediation settings</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="auto-start-max-rounds" className="block text-xs font-medium text-gray-600 mb-1">
                Max rounds
              </label>
              <input
                id="auto-start-max-rounds"
                type="number"
                min={1}
                value={maxRoundsInput}
                onChange={(e) => setMaxRoundsInput(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label htmlFor="auto-start-cost-limit" className="block text-xs font-medium text-gray-600 mb-1">
                Cost limit (USD)
              </label>
              <input
                id="auto-start-cost-limit"
                type="number"
                min={0}
                step="0.01"
                value={costLimitInput}
                onChange={(e) => setCostLimitInput(e.target.value)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              {hasConfidentEstimate && (
                <p className="text-xs text-gray-500 mt-1">
                  {budgetEstimate!.basedOnIssueCount != null
                    ? `Estimated from this document's ${budgetEstimate!.basedOnIssueCount.toLocaleString()} issues`
                    : 'Estimated from your team’s recent documents'}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="auto-start-color-contrast-mode" className="block text-xs font-medium text-gray-600 mb-1">
                Color-contrast handling
              </label>
              <select
                id="auto-start-color-contrast-mode"
                value={colorContrastMode}
                onChange={(e) => setColorContrastMode(e.target.value as NonNullable<StartAutoModeOverrides['autoColorContrastMode']>)}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="guidance-only">Guidance only — flag but never auto-apply</option>
                <option value="disabled">Disabled — skip contrast entirely</option>
                <option value="apply-to-pdf">Auto-apply — fix contrast automatically</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleConfirm}>Start</Button>
          </div>
        </div>
      )}
    </div>
  );
}
