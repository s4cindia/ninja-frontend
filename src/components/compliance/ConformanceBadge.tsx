import { CheckCircle, AlertTriangle, XCircle, MinusCircle } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { ConformanceLevel } from '@/services/compliance.service';

interface ConformanceBadgeProps {
  level: ConformanceLevel;
  size?: 'sm' | 'md';
}

const config: Record<ConformanceLevel, { icon: React.ElementType; color: string; bg: string }> = {
  'Supports': { icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-50 border-green-200' },
  'Partially Supports': { icon: AlertTriangle, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  'Does Not Support': { icon: XCircle, color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
  'Not Applicable': { icon: MinusCircle, color: 'text-gray-500', bg: 'bg-gray-50 border-gray-200' },
};

export function ConformanceBadge({ level, size = 'md' }: ConformanceBadgeProps) {
  const { icon: Icon, color, bg } = config[level];

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 border rounded-full font-medium',
      bg, color,
      size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
    )}>
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden="true" />
      {level}
    </span>
  );
}
