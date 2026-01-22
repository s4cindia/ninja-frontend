import { Lightbulb } from 'lucide-react';
import { ACCESS_MODES } from '@/constants/epubMetadata';

interface AccessModeSelectorProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export function AccessModeSelector({ value, onChange }: AccessModeSelectorProps) {
  const handleToggle = (mode: string) => {
    if (value.includes(mode)) {
      onChange(value.filter(m => m !== mode));
    } else {
      onChange([...value, mode]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">Access Mode</label>
        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
          METADATA-ACCESSMODE
        </span>
      </div>

      <p className="text-sm text-gray-600">
        How can users access the content of this publication?
      </p>

      <div className="space-y-2">
        {ACCESS_MODES.map((mode) => (
          <label
            key={mode.value}
            className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={value.includes(mode.value)}
              onChange={() => handleToggle(mode.value)}
              className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-900">{mode.label}</div>
              <div className="text-xs text-gray-600">{mode.description}</div>
            </div>
          </label>
        ))}
      </div>

      {value.length === 0 && (
        <div className="text-sm text-orange-600 flex items-center gap-1">
          <span>⚠</span>
          <span>Select at least one access mode</span>
        </div>
      )}

      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-blue-800">
          <strong>Tip:</strong> Select all that apply. Most illustrated books are{' '}
          <strong>textual + visual</strong>.
        </span>
      </div>
    </div>
  );
}
