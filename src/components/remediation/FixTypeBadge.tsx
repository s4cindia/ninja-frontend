import React from 'react';
import { Zap, Wrench, FileEdit } from 'lucide-react';
import type { FixType } from '@/types/remediation.types';

interface FixTypeBadgeProps {
  fixType: FixType;
  size?: 'sm' | 'md';
}

const CONFIG = {
  auto: {
    icon: Zap,
    label: 'Auto',
    bgColor: 'bg-green-100',
    textColor: 'text-green-700',
    borderColor: 'border-green-300',
  },
  quickfix: {
    icon: Wrench,
    label: 'Quick Fix',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-300',
  },
  manual: {
    icon: FileEdit,
    label: 'Manual',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-300',
  },
};

export const FixTypeBadge: React.FC<FixTypeBadgeProps> = ({ fixType, size = 'sm' }) => {
  const config = CONFIG[fixType];
  const Icon = config.icon;

  const sizeClasses = size === 'sm'
    ? 'text-xs px-2 py-0.5'
    : 'text-sm px-3 py-1';

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses}
      `}
    >
      <Icon className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      {config.label}
    </span>
  );
};
