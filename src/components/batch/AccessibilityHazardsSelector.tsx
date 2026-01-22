import { Lightbulb } from 'lucide-react';
import { ACCESSIBILITY_HAZARDS } from '@/constants/epubMetadata';

interface AccessibilityHazardsSelectorProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
}

export function AccessibilityHazardsSelector({
  value,
  onChange,
}: AccessibilityHazardsSelectorProps) {
  const isMultiple = Array.isArray(value);
  const selectedHazard = isMultiple ? 'multiple' : value;
  const selectedHazards = isMultiple ? value : [];

  const handleRadioChange = (hazard: string) => {
    if (hazard === 'multiple') {
      onChange([]);
    } else {
      onChange(hazard);
    }
  };

  const handleCheckboxToggle = (hazard: string) => {
    if (!Array.isArray(value)) return;

    if (value.includes(hazard)) {
      const newValue = value.filter(h => h !== hazard);
      onChange(newValue.length > 0 ? newValue : 'none');
    } else {
      onChange([...value, hazard]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          Accessibility Hazards
        </label>
        <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
          METADATA-ACCESSIBILITYHAZARD
        </span>
      </div>

      <p className="text-sm text-gray-600">
        Does this content include any accessibility hazards?
      </p>

      <div className="space-y-2">
        {ACCESSIBILITY_HAZARDS.map((hazard) => (
          <div key={hazard.value}>
            <label className="flex items-start gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
              <input
                type="radio"
                name="accessibilityHazard"
                value={hazard.value}
                checked={selectedHazard === hazard.value}
                onChange={() => handleRadioChange(hazard.value)}
                className="mt-0.5 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {hazard.label}
                  {hazard.value === 'none' && (
                    <span className="ml-1 text-green-600">✓</span>
                  )}
                </div>
                <div className="text-xs text-gray-600">{hazard.description}</div>
              </div>
            </label>

            {hazard.value === 'multiple' && selectedHazard === 'multiple' && (
              <div className="ml-10 mt-2 space-y-1 border-l-2 border-gray-300 pl-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedHazards.includes('flashing')}
                    onChange={() => handleCheckboxToggle('flashing')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Flashing</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedHazards.includes('motionSimulation')}
                    onChange={() => handleCheckboxToggle('motionSimulation')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Motion Simulation</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedHazards.includes('sound')}
                    onChange={() => handleCheckboxToggle('sound')}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Sound</span>
                </label>

                {selectedHazards.length === 0 && (
                  <div className="text-xs text-orange-600 mt-2">
                    ⚠ Select at least one hazard or choose "None"
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
        <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <span className="text-xs text-blue-800">
          <strong>Tip:</strong> Most text-based books have <strong>no hazards</strong>.
          Select hazards only if your publication contains flashing images, animations,
          or auto-play audio.
        </span>
      </div>
    </div>
  );
}
