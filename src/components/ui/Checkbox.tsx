import { Check, Minus } from 'lucide-react';
import { cn } from '@/utils/cn';

interface CheckboxProps {
  checked?: boolean;
  indeterminate?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Checkbox({
  checked = false,
  indeterminate = false,
  onChange,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: CheckboxProps) {
  const handleClick = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'h-4 w-4 rounded border-2 flex items-center justify-center transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        checked || indeterminate
          ? 'bg-primary-600 border-primary-600 text-white'
          : 'bg-white border-gray-300 hover:border-gray-400',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" />
      ) : checked ? (
        <Check className="h-3 w-3" />
      ) : null}
    </button>
  );
}
