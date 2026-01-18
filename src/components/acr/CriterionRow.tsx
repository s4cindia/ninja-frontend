import { AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { RemarksEditor } from './RemarksEditor';
import type { AcrCriterion, ConformanceLevel, AttributionTag } from '@/types/acr.types';

interface CriterionRowProps {
  criterion: AcrCriterion;
  onUpdateConformance: (level: ConformanceLevel) => void;
  onUpdateRemarks: (remarks: string) => void;
  onGenerateRemarks: () => void;
  isGeneratingRemarks: boolean;
  disabled?: boolean;
}

const CONFORMANCE_CONFIG: Record<ConformanceLevel, { label: string; className: string }> = {
  supports: { label: 'Supports', className: 'bg-green-100 text-green-800 border-green-200' },
  partially_supports: { label: 'Partially Supports', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  does_not_support: { label: 'Does Not Support', className: 'bg-red-100 text-red-800 border-red-200' },
  not_applicable: { label: 'Not Applicable', className: 'bg-gray-100 text-gray-600 border-gray-200' },
};

const ATTRIBUTION_CONFIG: Record<AttributionTag, { label: string; className: string }> = {
  'AUTOMATED': { label: '[AUTOMATED]', className: 'text-blue-600' },
  'AI-SUGGESTED': { label: '[AI-SUGGESTED]', className: 'text-purple-600' },
  'HUMAN-VERIFIED': { label: '[HUMAN-VERIFIED]', className: 'text-green-600' },
};

const CONFORMANCE_OPTIONS: ConformanceLevel[] = [
  'supports',
  'partially_supports',
  'does_not_support',
  'not_applicable',
];

const DEFAULT_CONFORMANCE_CONFIG = { label: 'Unknown', className: 'bg-gray-100 text-gray-600 border-gray-200' };
const DEFAULT_ATTRIBUTION_CONFIG = { label: '', className: 'text-gray-600' };

export function CriterionRow({
  criterion,
  onUpdateConformance,
  onUpdateRemarks,
  onGenerateRemarks,
  isGeneratingRemarks,
  disabled = false,
}: CriterionRowProps) {
  const conformanceConfig = CONFORMANCE_CONFIG[criterion.conformanceLevel] || DEFAULT_CONFORMANCE_CONFIG;
  const attributionConfig = ATTRIBUTION_CONFIG[criterion.attribution] || DEFAULT_ATTRIBUTION_CONFIG;

  return (
    <tr className={cn(
      'border-b last:border-b-0',
      criterion.isSuspicious && 'bg-amber-50'
    )}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {criterion.isSuspicious && (
            <span title="Suspicious entry">
              <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0" />
            </span>
          )}
          <div>
            <div className="font-medium text-gray-900">{criterion.criterionId}</div>
            <div className="text-sm text-gray-500">{criterion.criterionName}</div>
          </div>
        </div>
      </td>
      
      <td className="px-4 py-3">
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded font-medium',
          criterion.wcagLevel === 'A' && 'bg-blue-100 text-blue-700',
          criterion.wcagLevel === 'AA' && 'bg-purple-100 text-purple-700',
          criterion.wcagLevel === 'AAA' && 'bg-indigo-100 text-indigo-700'
        )}>
          {criterion.wcagLevel}
        </span>
      </td>
      
      <td className="px-4 py-3">
        <select
          value={criterion.conformanceLevel}
          onChange={(e) => onUpdateConformance(e.target.value as ConformanceLevel)}
          disabled={disabled}
          className={cn(
            'text-sm rounded-md border px-2 py-1 font-medium',
            conformanceConfig.className
          )}
        >
          {CONFORMANCE_OPTIONS.map((level) => (
            <option key={level} value={level}>
              {CONFORMANCE_CONFIG[level].label}
            </option>
          ))}
        </select>
      </td>
      
      <td className="px-4 py-3 min-w-[300px]">
        <RemarksEditor
          remarks={criterion.remarks}
          conformanceLevel={criterion.conformanceLevel}
          onSave={onUpdateRemarks}
          onGenerateAI={onGenerateRemarks}
          isGenerating={isGeneratingRemarks}
          disabled={disabled}
        />
      </td>
      
      <td className="px-4 py-3">
        <span className={cn('text-xs font-medium', attributionConfig.className)}>
          {attributionConfig.label}
        </span>
      </td>
    </tr>
  );
}
