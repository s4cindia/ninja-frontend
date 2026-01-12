import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  defaultExpanded?: boolean;
  children: React.ReactNode;
  headerColor?: string;
}

export function ExpandableSection({
  title,
  count,
  icon,
  defaultExpanded = false,
  children,
  headerColor = 'bg-gray-100',
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 ${headerColor} hover:opacity-90 transition-opacity`}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          {icon}
          <span className="font-semibold text-gray-900">
            {title}
          </span>
          <span className="text-sm text-gray-600">
            ({count})
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-600" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <div className="p-4 bg-white space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
