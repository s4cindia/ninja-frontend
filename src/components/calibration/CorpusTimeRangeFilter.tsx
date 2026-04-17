import { useMemo } from 'react';
import type { DateRange } from '@/types/corpus-summary.types';
import {
  clampDateRange,
  rangeLastNDays,
  rangeThisQuarter,
  defaultRange,
  toIsoDate,
} from './corpusDateRange';

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function CorpusTimeRangeFilter({ value, onChange }: Props) {
  const today = useMemo(() => toIsoDate(new Date()), []);

  const applyChange = (next: DateRange) => {
    onChange(clampDateRange(next, today));
  };

  const onFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyChange({ from: e.target.value, to: value.to });
  };
  const onToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyChange({ from: value.from, to: e.target.value });
  };

  return (
    <div
      className="flex flex-wrap items-end gap-3 border-b border-gray-200 bg-white px-4 py-3"
      data-testid="corpus-time-range-filter"
    >
      <div className="flex flex-col">
        <label htmlFor="corpus-range-from" className="text-xs font-medium text-gray-600">
          From
        </label>
        <input
          id="corpus-range-from"
          type="date"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          value={value.from}
          max={today}
          onChange={onFromChange}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="corpus-range-to" className="text-xs font-medium text-gray-600">
          To
        </label>
        <input
          id="corpus-range-to"
          type="date"
          className="rounded-md border border-gray-300 px-2 py-1 text-sm"
          value={value.to}
          max={today}
          onChange={onToChange}
        />
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => onChange(rangeLastNDays(30))}
        >
          Last 30 days
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => onChange(rangeLastNDays(90))}
        >
          Last 90 days
        </button>
        <button
          type="button"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
          onClick={() => onChange(rangeThisQuarter())}
        >
          This quarter
        </button>
      </div>

      <button
        type="button"
        className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-800"
        onClick={() => onChange(defaultRange())}
      >
        Reset to default
      </button>
    </div>
  );
}
