/**
 * PlagiarismFilterBar - filter chips for match type and classification
 */

import type {
  PlagiarismMatchType,
  PlagiarismClassification,
  PlagiarismMatchFilters,
} from '@/types/plagiarism';
import { MATCH_TYPE_LABELS, CLASSIFICATION_LABELS } from '@/types/plagiarism';

interface Props {
  filters: PlagiarismMatchFilters;
  onFilterChange: (filters: PlagiarismMatchFilters) => void;
}

const MATCH_TYPES: PlagiarismMatchType[] = ['INTERNAL', 'SELF_PLAGIARISM', 'EXTERNAL_WEB', 'EXTERNAL_ACADEMIC', 'EXTERNAL_PUBLISHER'];
const CLASSIFICATIONS: PlagiarismClassification[] = ['VERBATIM_COPY', 'PARAPHRASED', 'COMMON_PHRASE', 'PROPERLY_CITED', 'COINCIDENTAL', 'NEEDS_REVIEW'];

export function PlagiarismFilterBar({ filters, onFilterChange }: Props) {
  return (
    <div className="space-y-2">
      {/* Match type filter */}
      <div className="flex flex-wrap gap-1">
        <button type="button"
          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
            !filters.matchType ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => onFilterChange({ ...filters, matchType: undefined, page: 1 })}
        >
          All Types
        </button>
        {MATCH_TYPES.map((type) => (
          <button type="button"
            key={type}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              filters.matchType === type ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => onFilterChange({ ...filters, matchType: type, page: 1 })}
          >
            {MATCH_TYPE_LABELS[type].label}
          </button>
        ))}
      </div>

      {/* Classification filter */}
      <div className="flex flex-wrap gap-1">
        <button type="button"
          className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
            !filters.classification ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          onClick={() => onFilterChange({ ...filters, classification: undefined, page: 1 })}
        >
          All
        </button>
        {CLASSIFICATIONS.map((cls) => (
          <button type="button"
            key={cls}
            className={`px-2 py-0.5 text-xs rounded-full transition-colors ${
              filters.classification === cls ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => onFilterChange({ ...filters, classification: cls, page: 1 })}
          >
            {CLASSIFICATION_LABELS[cls].label}
          </button>
        ))}
      </div>
    </div>
  );
}
