import { useState } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';

interface RawDataToggleProps {
  data: unknown;
}

export function RawDataToggle({ data }: RawDataToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <Code className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">
          {isExpanded ? 'Hide Raw Data' : 'Show Raw Data'}
        </span>
      </button>

      {isExpanded && (
        <div className="bg-gray-900 p-4 overflow-x-auto">
          <pre className="text-green-400 font-mono text-sm whitespace-pre">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
