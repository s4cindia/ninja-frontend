import { ChevronDown } from 'lucide-react';
import type { CitationStyle } from '@/types/citation-validation.types';

interface StyleSelectorProps {
  styles: CitationStyle[];
  selected: string;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export function StyleSelector({ styles, selected, onChange, disabled }: StyleSelectorProps) {
  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
        aria-label="Select citation style"
      >
        {styles.map((style) => (
          <option key={style.code} value={style.code}>
            {style.name}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
    </div>
  );
}
