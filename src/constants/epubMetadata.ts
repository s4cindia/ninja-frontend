export const ACCESS_MODES = [
  { value: 'textual', label: 'Textual', description: 'Readable text content' },
  { value: 'visual', label: 'Visual', description: 'Images, diagrams, charts' },
  { value: 'auditory', label: 'Auditory', description: 'Audio content' },
  { value: 'tactile', label: 'Tactile', description: 'Braille, raised elements' },
] as const;

export const ACCESS_MODE_SUFFICIENT_OPTIONS = [
  {
    value: 'textual',
    label: 'Textual only',
    description: 'Text alone is sufficient (images are decorative or fully described)',
  },
  {
    value: 'visual',
    label: 'Visual only',
    description: 'Images alone are sufficient (rare)',
  },
  {
    value: 'auditory',
    label: 'Auditory only',
    description: 'Audio alone is sufficient',
  },
  {
    value: 'textual,visual',
    label: 'Textual + Visual (both needed)',
    description: 'Images contain essential information not described in text',
  },
  {
    value: 'textual,auditory',
    label: 'Textual + Auditory (both needed)',
    description: 'Both text and audio are essential',
  },
] as const;

export const ACCESSIBILITY_HAZARDS = [
  {
    value: 'none',
    label: 'None',
    description: 'No known hazards (safe for all users)',
  },
  {
    value: 'flashing',
    label: 'Flashing',
    description: 'Contains flashing or strobe effects (photosensitive epilepsy risk)',
  },
  {
    value: 'motionSimulation',
    label: 'Motion Simulation',
    description: 'Contains motion graphics or animations (motion sickness risk)',
  },
  {
    value: 'sound',
    label: 'Sound',
    description: 'Contains sudden or loud sounds (auditory sensitivity risk)',
  },
  {
    value: 'multiple',
    label: 'Multiple hazards',
    description: 'Select individual hazards below',
  },
] as const;

export const DEFAULT_METADATA_VALUES = {
  accessMode: ['textual', 'visual'] as string[],
  accessModeSufficient: 'textual' as string,
  accessibilityFeature: 'structuralNavigation, tableOfContents, readingOrder',
  accessibilityHazard: 'none' as string,
  accessibilitySummary: 'This publication has been designed with accessibility in mind.',
} as const;

export function formatAccessMode(modes: string[]): string {
  return modes.join(', ');
}

export function parseAccessMode(value: string): string[] {
  return value.split(',').map(v => v.trim()).filter(Boolean);
}

export function validateAccessModeSufficient(
  sufficient: string,
  modes: string[]
): boolean {
  const sufficientParts = sufficient.split(',').map(s => s.trim());
  return sufficientParts.every(part => modes.includes(part));
}
