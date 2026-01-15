import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useEditionDetails } from '@/hooks/useAcr';
import { cn } from '@/lib/utils';
import type { AcrEditionCode } from '@/types/acr.types';

interface CriteriaListModalProps {
  edition: AcrEditionCode;
  editionName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CriteriaListModal({ edition, editionName, isOpen, onClose }: CriteriaListModalProps) {
  const { data: editionDetails, isLoading, error } = useEditionDetails(edition, { enabled: isOpen });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['level-a', 'level-aa']));

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const getLevelBadgeClass = (level: 'A' | 'AA' | 'AAA') => {
    switch (level) {
      case 'A':
        return 'bg-blue-100 text-blue-700';
      case 'AA':
        return 'bg-purple-100 text-purple-700';
      case 'AAA':
        return 'bg-indigo-100 text-indigo-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl font-semibold">
                {editionName} - Criteria List
              </DialogTitle>
              {editionDetails && (
                <p className="text-sm text-gray-500 mt-1">
                  {editionDetails.criteriaCount} criteria to evaluate
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4 px-6">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              Failed to load criteria. Please try again.
            </div>
          )}

          {editionDetails && (
            <div className="space-y-4">
              {editionDetails.applicableStandards && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-sm font-medium text-blue-900 mb-1">Applicable Standards:</p>
                  <div className="flex flex-wrap gap-2">
                    {editionDetails.applicableStandards.map((standard) => (
                      <span
                        key={standard}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                      >
                        {standard}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {editionDetails.sections?.map((section) => {
                const isExpanded = expandedSections.has(section.id);
                const sectionCriteria = editionDetails.criteria?.filter(
                  c => c.wcagLevel === section.name.replace('Level ', '')
                ) || [];

                return (
                  <div key={section.id} className="border rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                    >
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-1 rounded font-medium text-sm',
                          section.name === 'Level A' && 'bg-blue-100 text-blue-700',
                          section.name === 'Level AA' && 'bg-purple-100 text-purple-700',
                          section.name === 'Level AAA' && 'bg-indigo-100 text-indigo-700'
                        )}>
                          {section.name}
                        </span>
                        <span className="font-semibold text-gray-900">{section.name} Criteria</span>
                        <span className="text-sm text-gray-500">
                          ({section.criteriaCount} {section.criteriaCount === 1 ? 'criterion' : 'criteria'})
                        </span>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="divide-y">
                        {sectionCriteria.length === 0 && (
                          <p className="px-4 py-3 text-sm text-gray-500">
                            No criteria available for this level.
                          </p>
                        )}
                        {sectionCriteria.map((criterion) => (
                          <div
                            key={criterion.id}
                            className="px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0',
                                getLevelBadgeClass(criterion.wcagLevel)
                              )}>
                                {criterion.wcagLevel}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                  <span className="font-medium text-gray-900">
                                    {criterion.criterionId}
                                  </span>
                                  <span className="text-sm text-gray-700">
                                    {criterion.criterionName}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 px-6 pb-6 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
