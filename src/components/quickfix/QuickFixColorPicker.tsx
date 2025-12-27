import { useMemo } from 'react';
import { cn } from '@/utils/cn';
import { Check, X } from 'lucide-react';

interface QuickFixColorPickerProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showContrastRatio?: boolean;
  compareWith?: string;
  disabled?: boolean;
  helpText?: string;
  error?: string;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;
  
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;
  return { r, g, b };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const sRGB = c / 255;
    return sRGB <= 0.03928
      ? sRGB / 12.92
      : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function calculateContrastRatio(color1: string, color2: string): number | null {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return null;
  
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

function getWcagLevel(ratio: number): { aa: boolean; aaLarge: boolean; aaa: boolean; aaaLarge: boolean } {
  return {
    aa: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaa: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  };
}

export function QuickFixColorPicker({
  id,
  label,
  value,
  onChange,
  showContrastRatio = false,
  compareWith,
  disabled = false,
  helpText,
  error,
}: QuickFixColorPickerProps) {
  const contrastInfo = useMemo(() => {
    if (!showContrastRatio || !compareWith) return null;
    
    const ratio = calculateContrastRatio(value, compareWith);
    if (ratio === null) return null;
    
    return {
      ratio,
      levels: getWcagLevel(ratio),
    };
  }, [value, compareWith, showContrastRatio]);

  const handleHexInput = (hexValue: string) => {
    let cleaned = hexValue.replace(/[^0-9a-fA-F#]/g, '');
    if (!cleaned.startsWith('#')) {
      cleaned = '#' + cleaned;
    }
    if (cleaned.length <= 7) {
      onChange(cleaned);
    }
  };

  return (
    <div className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium text-gray-900">
        {label}
      </label>
      
      {helpText && (
        <p id={`${id}-help`} className="text-sm text-gray-500">
          {helpText}
        </p>
      )}
      
      <div className="flex items-center gap-3">
        <input
          type="color"
          id={id}
          value={value.length === 7 ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={cn(
            'h-10 w-14 rounded-lg border border-gray-300 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-primary-500',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        />
        
        <input
          type="text"
          value={value}
          onChange={(e) => handleHexInput(e.target.value)}
          placeholder="#000000"
          disabled={disabled}
          aria-label={`${label} hex value`}
          className={cn(
            'w-28 rounded-lg border px-3 py-2 text-sm font-mono uppercase',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            error
              ? 'border-red-300 bg-red-50'
              : 'border-gray-300 bg-white',
            disabled && 'opacity-50 cursor-not-allowed bg-gray-50'
          )}
        />
        
        {showContrastRatio && compareWith && (
          <div
            className="h-10 w-10 rounded-lg border border-gray-300 flex-shrink-0"
            style={{ backgroundColor: compareWith }}
            title={`Compare with: ${compareWith}`}
          />
        )}
      </div>
      
      {contrastInfo && (
        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Contrast Ratio</span>
            <span className={cn(
              'text-lg font-bold',
              contrastInfo.levels.aa ? 'text-green-600' : 'text-red-600'
            )}>
              {contrastInfo.ratio.toFixed(2)}:1
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              {contrastInfo.levels.aa ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className={contrastInfo.levels.aa ? 'text-green-700' : 'text-red-600'}>
                AA Normal (4.5:1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {contrastInfo.levels.aaLarge ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className={contrastInfo.levels.aaLarge ? 'text-green-700' : 'text-red-600'}>
                AA Large (3:1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {contrastInfo.levels.aaa ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className={contrastInfo.levels.aaa ? 'text-green-700' : 'text-red-600'}>
                AAA Normal (7:1)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {contrastInfo.levels.aaaLarge ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <X className="h-4 w-4 text-red-500" />
              )}
              <span className={contrastInfo.levels.aaaLarge ? 'text-green-700' : 'text-red-600'}>
                AAA Large (4.5:1)
              </span>
            </div>
          </div>
          
          <div
            className="mt-3 p-2 rounded text-center font-medium"
            style={{
              backgroundColor: value,
              color: compareWith,
            }}
          >
            Sample Text Preview
          </div>
        </div>
      )}
      
      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export default QuickFixColorPicker;
