import { Circle, Info } from 'lucide-react';

interface ConfidenceBadgeProps {
  confidence: number;
  requiresManualVerification?: boolean;
  isNotApplicable?: boolean;
  className?: string;
}

export function ConfidenceBadge({
  confidence,
  requiresManualVerification,
  isNotApplicable,
  className = '',
}: ConfidenceBadgeProps) {
  // N/A status
  if (isNotApplicable) {
    return (
      <span
        className={`
          px-2 py-1 rounded-full text-xs font-medium
          bg-blue-100 text-blue-800 flex items-center gap-1
          ${className}
        `}
      >
        <Info className="h-3 w-3" />
        N/A
      </span>
    );
  }

  // Manual review required
  if (requiresManualVerification || confidence === 0) {
    return (
      <span
        className={`
          px-2 py-1 rounded-full text-xs font-medium
          bg-gray-100 text-gray-800 flex items-center gap-1
          ${className}
        `}
      >
        <Circle className="h-3 w-3" />
        Manual Review Required
      </span>
    );
  }

  const percentage = Math.round(confidence * 100);

  // High confidence (90%+)
  if (confidence >= 0.9) {
    return (
      <span
        className={`
          px-2 py-1 rounded-full text-xs font-medium
          bg-green-100 text-green-800 flex items-center gap-1
          ${className}
        `}
      >
        <div className="w-2 h-2 rounded-full bg-green-500" />
        {percentage}% High Confidence
      </span>
    );
  }

  // Medium confidence (70-89%)
  if (confidence >= 0.7) {
    return (
      <span
        className={`
          px-2 py-1 rounded-full text-xs font-medium
          bg-yellow-100 text-yellow-800 flex items-center gap-1
          ${className}
        `}
      >
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        {percentage}% Medium Confidence
      </span>
    );
  }

  // Low confidence (50-69%)
  return (
    <span
      className={`
        px-2 py-1 rounded-full text-xs font-medium
        bg-orange-100 text-orange-800 flex items-center gap-1
        ${className}
      `}
    >
      <div className="w-2 h-2 rounded-full bg-orange-500" />
      {percentage}% Low Confidence
    </span>
  );
}
