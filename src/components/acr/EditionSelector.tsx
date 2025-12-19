import { useState } from 'react';
import { Check, Info, Star } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Spinner } from '@/components/ui/Spinner';
import type { AcrEdition, AcrEditionCode } from '@/types/acr.types';
import { useEditions } from '@/hooks/useAcr';

interface EditionSelectorProps {
  selectedEdition: AcrEdition | null;
  onSelect: (edition: AcrEdition) => void;
  disabled?: boolean;
}

const EDITION_TOOLTIPS: Record<AcrEditionCode, string> = {
  'VPAT2.5-508': 'For U.S. Federal procurement only',
  'VPAT2.5-WCAG': 'General accessibility reporting',
  'VPAT2.5-EU': 'For European Accessibility Act compliance',
  'VPAT2.5-INT': 'Satisfies US, EU, and WCAG requirements in one document',
};

const EDITION_LABELS: Record<AcrEditionCode, { title: string; subtitle: string }> = {
  'VPAT2.5-508': { title: 'Section 508', subtitle: 'U.S. Federal' },
  'VPAT2.5-WCAG': { title: 'WCAG 2.1', subtitle: 'General Accessibility' },
  'VPAT2.5-EU': { title: 'EN 301 549', subtitle: 'European Standard' },
  'VPAT2.5-INT': { title: 'International', subtitle: 'Comprehensive' },
};

export function EditionSelector({ selectedEdition, onSelect, disabled = false }: EditionSelectorProps) {
  const { data: editions, isLoading, error } = useEditions();
  const [hoveredEdition, setHoveredEdition] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Failed to load editions. Please try again.</p>
      </div>
    );
  }

  const editionsList = Array.isArray(editions) ? editions : [];

  if (editionsList.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No editions available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {editionsList.map((edition) => {
          const isSelected = selectedEdition?.code === edition.code;
          const isHovered = hoveredEdition === edition.code;
          const labels = EDITION_LABELS[edition.code as AcrEditionCode];
          const tooltip = EDITION_TOOLTIPS[edition.code as AcrEditionCode];
          const isRecommended = edition.isRecommended;
          const criteriaCount = edition.criteriaCount ?? (Array.isArray(edition.criteria) ? edition.criteria.length : 0);

          return (
            <div
              key={edition.id}
              className="relative"
              onMouseEnter={() => setHoveredEdition(edition.code)}
              onMouseLeave={() => setHoveredEdition(null)}
            >
              <button
                type="button"
                onClick={() => !disabled && onSelect(edition)}
                disabled={disabled}
                aria-pressed={isSelected}
                aria-label={`Select ${edition.name} edition`}
                className={cn(
                  'w-full p-4 rounded-lg border-2 text-left transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
                  isSelected
                    ? 'border-primary-500 bg-primary-50 shadow-md'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm',
                  disabled && 'opacity-50 cursor-not-allowed',
                  isRecommended && !isSelected && 'border-green-200 bg-green-50'
                )}
              >
                {isRecommended && (
                  <div className="absolute -top-3 -right-2 z-10">
                    <span className="inline-flex items-center gap-1 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">
                      <Star className="h-3 w-3" />
                      Recommended
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-3 mt-1">
                  <div>
                    <h3 className={cn(
                      'font-semibold text-base',
                      isSelected ? 'text-primary-700' : 'text-gray-900'
                    )}>
                      {labels?.title || edition.name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {labels?.subtitle || edition.code}
                    </p>
                  </div>
                  
                  <div className={cn(
                    'flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                    isSelected
                      ? 'border-primary-500 bg-primary-500'
                      : 'border-gray-300 bg-white'
                  )}>
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {criteriaCount} criteria
                  </span>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
              </button>

              {isHovered && tooltip && (
                <div
                  role="tooltip"
                  className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg whitespace-nowrap"
                >
                  {tooltip}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEdition && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">Selected:</span>{' '}
            {selectedEdition.name} - {selectedEdition.description}
          </p>
        </div>
      )}
    </div>
  );
}
