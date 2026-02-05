import { useState } from 'react';
import { X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ValidationViolation } from '@/types/citation-validation.types';

interface BatchCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  violations: ValidationViolation[];
  onApplyBatch: (ids: string[]) => Promise<void>;
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

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleAll = () => {
    if (selectedIds.size === violations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(violations.map(v => v.id)));
    }
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
          <h2 id="batch-modal-title" className="text-lg font-semibold">
            Batch Correction
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 border-b">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === violations.length}
              onChange={toggleAll}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium">
              Select all ({violations.length})
            </span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {violations.map((violation) => (
            <label
              key={violation.id}
              className={cn(
                'flex items-start gap-3 p-3 rounded border cursor-pointer transition-colors',
                selectedIds.has(violation.id)
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              <input
                type="checkbox"
                checked={selectedIds.has(violation.id)}
                onChange={() => toggleSelection(violation.id)}
                className="mt-1 rounded border-gray-300"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded text-xs font-medium',
                      violation.severity === 'error'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    )}
                  >
                    {violation.severity}
                  </span>
                  <span className="text-sm font-medium truncate">
                    {violation.ruleName}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate">
                  {violation.originalText} → {violation.suggestedFix}
                </p>
              </div>
            </label>
          ))}
        </div>

        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <span className="text-sm text-gray-600">
            {selectedIds.size} of {violations.length} selected
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isApplying}>
              Cancel
            </Button>
            <Button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || isApplying}
            >
              {isApplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Apply {selectedIds.size} Corrections
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
