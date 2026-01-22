import { Lightbulb } from 'lucide-react';
import { ACCESS_MODE_SUFFICIENT_OPTIONS } from '@/constants/epubMetadata';

interface AccessModeSufficientSelectorProps {
  value: string;
  onChange: (value: string) => void;
  accessModes: string[];
}

export function AccessModeSufficientSelector({
  value,
  onChange,
  accessModes,
}: AccessModeSufficientSelectorProps) {
  const availableOptions = ACCESS_MODE_SUFFICIENT_OPTIONS.filter((option) => {
    const requiredModes = option.value.split(',').map(m => m.trim());
    return requiredModes.every(mode => accessModes.includes(mode));
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          Access Mode Sufficient
        </label>
        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
          METADATA-ACCESSMODESUFFICIENT
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Which access mode(s) are sufficient to understand all content?
      </p>

      <div className="space-y-2">
        {availableOptions.map((option) => (
          <label
            key={option.value}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="radio"
              name="accessModeSufficient"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{option.label}</div>
              <div className="text-xs text-gray-600">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      {accessModes.length === 0 && (
        <div className="text-sm text-orange-600 flex items-center gap-1">
          <span>⚠</span>
          <span>Select access modes first</span>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-blue-800">
          <strong>Tip:</strong> Choose <strong>"Textual only"</strong> if all images
          are decorative or have complete alternative text descriptions.
        </span>
      </div>
    </div>
  );
}
