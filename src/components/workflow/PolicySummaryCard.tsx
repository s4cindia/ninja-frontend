import { Bot, User, AlertTriangle, CheckCircle2, XCircle, Sliders } from 'lucide-react';
import type {
  BatchAutoApprovalPolicy,
  BatchGatePolicy,
  BatchErrorStrategy,
  ConditionalGatePolicy,
} from '@/services/workflowService';

interface PolicySummaryCardProps {
  policy: BatchAutoApprovalPolicy;
}

const GATE_LABELS: Record<string, string> = {
  AI_REVIEW:           'AI Review',
  REMEDIATION_REVIEW:  'Remediation Review',
  CONFORMANCE_REVIEW:  'Conformance Review',
  ACR_SIGNOFF:         'ACR Sign-off',
};

const ERROR_STRATEGY_LABELS: Record<BatchErrorStrategy, { label: string; color: string }> = {
  'pause-batch':     { label: 'Pause batch on error',          color: 'text-amber-700 bg-amber-50 border-amber-200' },
  'continue-others': { label: 'Continue other files on error', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  'fail-batch':      { label: 'Fail entire batch on error',    color: 'text-red-700 bg-red-50 border-red-200' },
};

function resolveMode(policy: BatchGatePolicy | undefined): 'auto-accept' | 'conditional' | 'require-manual' {
  if (!policy) return 'require-manual';
  if (typeof policy === 'string') return policy as 'auto-accept' | 'require-manual';
  return (policy as ConditionalGatePolicy).mode;
}

function GatePolicyBadge({ policy }: { policy: BatchGatePolicy | undefined }) {
  const mode = resolveMode(policy);

  if (mode === 'auto-accept') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <Bot className="h-3 w-3" />
        Auto-accept
      </span>
    );
  }

  if (mode === 'conditional') {
    const conditional = policy as ConditionalGatePolicy;
    const confidence = conditional.conditions?.minConfidence;
    const hasTypeRules = Object.keys(conditional.conditions?.issueTypeRules ?? {}).length > 0;
    const detail = [
      confidence !== undefined ? `≥${Math.round(confidence * 100)}% confidence` : null,
      hasTypeRules ? 'issue-type rules' : null,
    ].filter(Boolean).join(', ');

    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
          <Sliders className="h-3 w-3" />
          Conditional
        </span>
        {detail && (
          <span className="text-xs text-gray-400">{detail}</span>
        )}
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
      <User className="h-3 w-3" />
      Require manual
    </span>
  );
}

export function PolicySummaryCard({ policy }: PolicySummaryCardProps) {
  const gates = policy.gates;

  const modeCounts = Object.values(gates).reduce(
    (acc, p) => {
      const mode = resolveMode(p);
      acc[mode] = (acc[mode] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const autoCount        = modeCounts['auto-accept']   ?? 0;
  const conditionalCount = modeCounts['conditional']   ?? 0;
  const manualCount      = modeCounts['require-manual'] ?? 0;
  const isFullyHeadless  = manualCount === 0 && conditionalCount === 0;

  const errorStrategyInfo = ERROR_STRATEGY_LABELS[policy.onError];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-5 w-5 text-primary-600" />
        <h3 className="text-base font-semibold text-gray-900">Auto-Approval Policy</h3>

        {isFullyHeadless ? (
          <span className="ml-auto inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            <CheckCircle2 className="h-3 w-3" />
            Fully Headless
          </span>
        ) : (
          <span className="ml-auto text-xs text-gray-500">
            {[
              autoCount > 0        ? `${autoCount} auto`        : null,
              conditionalCount > 0 ? `${conditionalCount} conditional` : null,
              manualCount > 0      ? `${manualCount} manual`    : null,
            ].filter(Boolean).join(' · ')}
          </span>
        )}
      </div>

      {/* Gate policy grid */}
      <div className="space-y-2 mb-4">
        {(Object.entries(GATE_LABELS) as [string, string][]).map(([gate, label]) => (
          <div key={gate} className="flex items-center justify-between min-h-[2rem]">
            <span className="text-sm text-gray-600">{label}</span>
            <GatePolicyBadge policy={gates[gate as keyof typeof gates]} />
          </div>
        ))}
      </div>

      {/* Error strategy */}
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md border text-sm ${errorStrategyInfo.color}`}>
        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
        <span>{errorStrategyInfo.label}</span>
      </div>

      {/* Fully headless warning */}
      {isFullyHeadless && (
        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          <XCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            All HITL gates are set to auto-accept. No human review will occur for this batch.
            Ensure AI analysis results meet your quality requirements before enabling fully headless mode.
          </span>
        </div>
      )}
    </div>
  );
}
