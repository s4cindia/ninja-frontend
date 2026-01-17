import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Code } from 'lucide-react';

interface RawDataToggleProps {
  data: unknown;
}

function safeStringify(data: unknown): string {
  try {
    const seen = new WeakSet<object>();

    return JSON.stringify(
      data,
      (_key: string, value: unknown): unknown => {
        if (typeof value === 'bigint') {
          return value.toString();
        }

        if (value !== null && typeof value === 'object') {
          if (seen.has(value)) {
            return '[Circular Reference]';
          }
          seen.add(value);
        }

        if (value === undefined) {
          return '[undefined]';
        }

        if (typeof value === 'function') {
          return '[Function]';
        }

        if (typeof value === 'symbol') {
          return value.toString();
        }

        return value;
      },
      2
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return `Unable to serialize data: ${message}`;
  }
}

export function RawDataToggle({ data }: RawDataToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const stringifiedData = useMemo(() => {
    if (!isExpanded) return null;
    return safeStringify(data);
  }, [data, isExpanded]);

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

      {isExpanded && stringifiedData && (
        <div className="bg-gray-900 p-4 overflow-x-auto">
          <pre className="text-green-400 font-mono text-sm whitespace-pre">
            {stringifiedData}
          </pre>
        </div>
      )}
    </div>
  );
}
