import React from 'react';
import { AlertTriangle, Info, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfidenceBadgeProps {
  confidence: number;
  requiresManualVerification?: boolean;
  isNotApplicable?: boolean;
  automationCapability?: number;
  size?: 'sm' | 'md';
}

export const ConfidenceBadge: React.FC<ConfidenceBadgeProps> = ({
  confidence,
  requiresManualVerification = false,
  isNotApplicable = false,
  automationCapability = 100,
  size = 'md',
}) => {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-3 py-1 text-sm';

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  // N/A status (from feature branch)
  if (isNotApplicable) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'font-medium rounded-full border',
          'bg-blue-100 text-blue-800 border-blue-300',
          sizeClasses
        )}>
          <Info className={cn(iconSize, 'inline mr-1')} aria-hidden="true" />
          N/A
        </span>
      </div>
    );
  }

  // Manual review required
  if (requiresManualVerification || confidence === 0) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'font-medium rounded-full border',
          'bg-amber-100 text-amber-800 border-amber-300',
          sizeClasses
        )}>
          Manual Review Required
        </span>
        <div
          className="relative group"
          title="This criterion cannot be fully verified by automated tools and requires human evaluation"
        >
          <Info className={cn(iconSize, 'text-gray-400 cursor-help')} aria-hidden="true" />
        </div>
      </div>
    );
  }

  const getConfidenceColor = () => {
    if (confidence >= 90) return 'bg-green-100 text-green-800 border-green-300';
    if (confidence >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-orange-100 text-orange-800 border-orange-300';
  };

  const getConfidenceLabel = () => {
    if (confidence >= 90) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const showWarning = automationCapability < 90 && confidence > 0;

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        'font-medium rounded-full border',
        getConfidenceColor(),
        sizeClasses
      )}>
        {confidence}% {getConfidenceLabel()}
      </span>
      {showWarning && (
        <div
          className="relative group"
          title={`Automated confidence: ${confidence}%. This criterion has ${automationCapability}% automation capability - consider manual spot-checking for complete assurance.`}
        >
          <AlertTriangle className={cn(iconSize, 'text-yellow-500 cursor-help')} aria-hidden="true" />
        </div>
      )}
    </div>
  );
};

export default ConfidenceBadge;
