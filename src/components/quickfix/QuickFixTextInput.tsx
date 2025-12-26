import { cn } from '@/utils/cn';

interface QuickFixTextInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  disabled?: boolean;
  required?: boolean;
  helpText?: string;
  error?: string;
  maxLength?: number;
}

export function QuickFixTextInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  rows = 4,
  disabled = false,
  required = false,
  helpText,
  error,
  maxLength,
}: QuickFixTextInputProps) {
  const inputClassName = cn(
    'block w-full rounded-lg border px-3 py-2 text-sm transition-colors',
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
    error
      ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300'
      : 'border-gray-300 bg-white text-gray-900 placeholder-gray-400',
    disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
  );

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      {multiline ? (
        <textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          aria-describedby={helpText ? `${id}-help` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={cn(inputClassName, 'resize-y min-h-[80px]')}
        />
      ) : (
        <input
          type="text"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          maxLength={maxLength}
          aria-describedby={helpText ? `${id}-help` : undefined}
          aria-invalid={error ? 'true' : undefined}
          className={inputClassName}
        />
      )}
      
      <div className="flex items-center justify-between">
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        {maxLength && (
          <p className="text-xs text-gray-400 ml-auto">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    </div>
  );
}

export default QuickFixTextInput;
