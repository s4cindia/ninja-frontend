import { useState } from 'react';
import { ChevronDown, ChevronRight, AlertCircle, Info, CheckCircle } from 'lucide-react';

interface ExpandableSectionProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  badge?: string; // Badge text like "90-98%", "100%", "N/A"
  defaultExpanded?: boolean;
  nested?: boolean; // For nested sections with indent
  headerColor?: string;
  children: React.ReactNode;
  alert?: {
    type: 'info' | 'warning' | 'success';
    message: string;
  };
}

export function ExpandableSection({
  title,
  count,
  icon,
  badge,
  defaultExpanded = false,
  nested = false,
  headerColor = 'bg-gray-50 border-gray-200',
  children,
  alert,
}: ExpandableSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsExpanded(!isExpanded);
    }
  };

  const alertStyles = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-orange-50 border-orange-200 text-orange-800',
    success: 'bg-green-50 border-green-200 text-green-800',
  };

  const alertIcons = {
    info: <Info className="h-4 w-4 flex-shrink-0" />,
    warning: <AlertCircle className="h-4 w-4 flex-shrink-0" />,
    success: <CheckCircle className="h-4 w-4 flex-shrink-0" />,
  };

  return (
    <div className={nested ? 'ml-6 mb-3' : 'mb-4'}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        onKeyDown={handleKeyDown}
        className={`
          w-full flex items-center justify-between p-4
          border rounded-lg transition-colors
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${nested ? 'border-l-4' : ''}
          ${headerColor}
        `}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {icon}
          <span className="font-semibold text-gray-900">
            {title}
          </span>
          <span className="text-sm text-gray-600">
            ({count})
          </span>
          {badge && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              {badge}
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronDown className="h-5 w-5 text-gray-600 transition-transform" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-600 transition-transform" aria-hidden="true" />
        )}
      </button>

      {isExpanded && (
        <div className="mt-2">
          {alert && (
            <div
              className={`
                flex items-start gap-2 p-3 mb-4
                border rounded-lg
                ${alertStyles[alert.type]}
              `}
              role="alert"
            >
              {alertIcons[alert.type]}
              <p className="text-sm">{alert.message}</p>
            </div>
          )}
          <div className="space-y-3">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
