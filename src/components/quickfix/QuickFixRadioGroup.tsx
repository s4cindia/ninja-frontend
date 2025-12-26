import { cn } from '@/utils/cn';

interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface QuickFixRadioGroupProps {
  id: string;
  label: string;
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  helpText?: string;
  error?: string;
}

export function QuickFixRadioGroup({
  id,
  label,
  options,
  value,
  onChange,
  disabled = false,
  helpText,
  error,
}: QuickFixRadioGroupProps) {
  return (
    <fieldset className="space-y-3" aria-describedby={helpText ? `${id}-help` : undefined}>
      <legend className="text-sm font-medium text-gray-900">{label}</legend>
      
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      <div className="space-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
              value === option.value
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-gray-300',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
              className={cn(
                'mt-0.5 h-4 w-4 border-gray-300 text-primary-600',
                'focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
              )}
            />
            <div className="flex-1 min-w-0">
              <span className="block text-sm font-medium text-gray-900">
                {option.label}
              </span>
              {option.description && (
                <span className="block text-sm text-gray-500 mt-0.5">
                  {option.description}
                </span>
              )}
            </div>
          </label>
        ))}
      </div>
      
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}

export default QuickFixRadioGroup;
