import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface BatchCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ValidationViolation[];
  onApplyByType: (violationType: string) => Promise<void>;
}

export function BatchCorrectionModal({
  isOpen,
  onClose,
  violations,
  onApplyByType
}: BatchCorrectionModalProps) {
  const [applyingType, setApplyingType] = useState<string | null>(null);
  const [appliedTypes, setAppliedTypes] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const groupedByType = violations.reduce((acc, v) => {
    if (!acc[v.violationType]) {
      acc[v.violationType] = [];
    }
    acc[v.violationType].push(v);
    return acc;
  }, {} as Record<string, ValidationViolation[]>);

  const handleApplyType = async (type: string) => {
    setApplyingType(type);
    try {
      await onApplyByType(type);
      setAppliedTypes(prev => new Set([...prev, type]));
    } finally {
      setApplyingType(null);
    }
  };

  const formatTypeName = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const pendingTypes = Object.keys(groupedByType).filter(t => !appliedTypes.has(t));
  const allApplied = pendingTypes.length === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-modal-title"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 id="batch-modal-title" className="text-lg font-semibold">Batch Correction</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-sm text-gray-600 mb-4">
            Apply all corrections by type. This will fix all {violations.length} pending issues.
          </p>

          {allApplied && (
            <div className="text-center py-8 text-green-600">
              <Check className="h-12 w-12 mx-auto mb-2" />
              <p className="font-medium">All corrections applied!</p>
            </div>
          )}

          {Object.entries(groupedByType).map(([type, typeViolations]) => {
            const isApplied = appliedTypes.has(type);
            const isApplying = applyingType === type;

            return (
              <div 
                key={type} 
                className={`mb-4 p-4 rounded-lg border ${
                  isApplied ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {formatTypeName(type)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {typeViolations.length} issue{typeViolations.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  {isApplied ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm">
                      <Check className="h-4 w-4" />
                      Applied
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleApplyType(type)}
                      disabled={isApplying || applyingType !== null}
                    >
                      {isApplying ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                          Applying...
                        </>
                      ) : (
                        'Apply All'
                      )}
                    </Button>
                  )}
                </div>

                <div className="space-y-1 mt-3">
                  {typeViolations.slice(0, 3).map(violation => (
                    <div 
                      key={violation.id} 
                      className={`text-sm p-2 rounded ${isApplied ? 'bg-green-100' : 'bg-white'}`}
                    >
                      <span className={isApplied ? 'text-gray-500' : 'text-red-600 line-through'}>
                        {violation.originalText}
                      </span>
                      <span className="mx-2 text-gray-400">→</span>
                      <span className="text-green-600">{violation.suggestedFix}</span>
                    </div>
                  ))}
                  {typeViolations.length > 3 && (
                    <p className="text-xs text-gray-500 pl-2">
                      +{typeViolations.length - 3} more...
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {allApplied ? 'Done' : 'Close'}
          </Button>
        </div>
      </div>
    </div>
  );
}
