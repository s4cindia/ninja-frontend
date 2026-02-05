import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface BatchCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ValidationViolation[];
  onApplyBatch: (validationIds: string[]) => Promise<void>;
}

export function BatchCorrectionModal({
  isOpen,
  onClose,
  violations,
  onApplyBatch
}: BatchCorrectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(violations.map(v => v.id))
  );
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const groupedByType = violations.reduce((acc, v) => {
    if (!acc[v.violationType]) {
      acc[v.violationType] = [];
    }
    acc[v.violationType].push(v);
    return acc;
  }, {} as Record<string, ValidationViolation[]>);

  const handleToggle = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleSelectAll = (type: string) => {
    const newSelected = new Set(selectedIds);
    groupedByType[type].forEach(v => newSelected.add(v.id));
    setSelectedIds(newSelected);
  };

  const handleDeselectAll = (type: string) => {
    const newSelected = new Set(selectedIds);
    groupedByType[type].forEach(v => newSelected.delete(v.id));
    setSelectedIds(newSelected);
  };

  const handleApply = async () => {
    setIsApplying(true);
    try {
      await onApplyBatch(Array.from(selectedIds));
      onClose();
    } finally {
      setIsApplying(false);
    }
  };

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
            Select the corrections you want to apply. {selectedIds.size} of {violations.length} selected.
          </p>

          {Object.entries(groupedByType).map(([type, typeViolations]) => (
            <div key={type} className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 capitalize">
                  {type.replace(/_/g, ' ')} ({typeViolations.length})
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSelectAll(type)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Select all
                  </button>
                  <button
                    onClick={() => handleDeselectAll(type)}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {typeViolations.map(violation => (
                  <label
                    key={violation.id}
                    className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(violation.id)}
                      onChange={() => handleToggle(violation.id)}
                      className="mt-1 rounded border-gray-300"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm">
                        <span className="text-red-600 line-through">{violation.originalText}</span>
                        <span className="mx-2">→</span>
                        <span className="text-green-600">{violation.suggestedFix}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        {violation.citationText}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={isApplying}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={selectedIds.size === 0 || isApplying}
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                Applying...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" aria-hidden="true" />
                Apply {selectedIds.size} Corrections
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
