/**
 * IntegrityCheckTypeFilter - chip-based filter by check type
 */

import type { IntegrityCheckType, IntegritySummaryMap } from '@/types/integrity';
import { INTEGRITY_CHECK_LABELS, getCheckTypeLabel } from '@/types/integrity';

interface Props {
  selected: IntegrityCheckType | undefined;
  onSelect: (type: IntegrityCheckType | undefined) => void;
  summary?: IntegritySummaryMap;
}

export function IntegrityCheckTypeFilter({ selected, onSelect, summary }: Props) {
  // Use types from the summary (API response) so newly added backend check types appear automatically
  const types = summary
    ? (Object.keys(summary) as IntegrityCheckType[]).filter((t) => summary[t]?.total > 0)
    : (Object.keys(INTEGRITY_CHECK_LABELS) as IntegrityCheckType[]);

  return (
    <div className="flex flex-wrap gap-1.5">
      <button type="button"
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
          !selected
            ? 'bg-blue-100 text-blue-800 border border-blue-300'
            : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
        }`}
        onClick={() => onSelect(undefined)}
      >
        All
      </button>
      {types.map((type) => {
        const count = summary?.[type]?.total ?? 0;
        const label = getCheckTypeLabel(type);
        const description = INTEGRITY_CHECK_LABELS[type]?.description ?? '';
        const isActive = selected === type;
        return (
          <button type="button"
            key={type}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-blue-100 text-blue-800 border border-blue-300'
                : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
            }`}
            onClick={() => onSelect(isActive ? undefined : type)}
            title={description}
          >
            {label}
            {summary && <span className="ml-1 opacity-70">({count})</span>}
          </button>
        );
      })}
    </div>
  );
}
