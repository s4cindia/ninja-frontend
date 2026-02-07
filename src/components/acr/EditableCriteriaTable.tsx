import { useState } from 'react';
import { Edit2, Check, X, History } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpdateCriterion } from '@/hooks/useAcrReport';
import type { AcrCriterionReview } from '@/types/acr-report.types';
import { cn } from '@/utils/cn';

interface EditableCriteriaTableProps {
  criteria: AcrCriterionReview[];
  acrJobId: string;
  edition: string;
}

const STATUS_OPTIONS = [
  { value: 'verified_pass', label: 'Pass', className: 'text-green-700 bg-green-50' },
  { value: 'verified_fail', label: 'Fail', className: 'text-red-700 bg-red-50' },
  { value: 'verified_partial', label: 'Partial', className: 'text-yellow-700 bg-yellow-50' },
  { value: 'deferred', label: 'Deferred', className: 'text-gray-700 bg-gray-50' },
];

const METHOD_OPTIONS = [
  'NVDA 2024.1',
  'JAWS 2024',
  'VoiceOver',
  'Manual Review',
  'Keyboard Only',
  'Axe DevTools',
  'WAVE',
];

export function EditableCriteriaTable({ criteria, acrJobId, edition: _edition }: EditableCriteriaTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState<Partial<AcrCriterionReview>>({});

  const { mutate: updateCriterion, isPending } = useUpdateCriterion(acrJobId);

  const handleEdit = (criterion: AcrCriterionReview) => {
    setEditingId(criterion.id);
    setEditingData({
      verificationStatus: criterion.verificationStatus,
      verificationMethod: criterion.verificationMethod,
      verificationNotes: criterion.verificationNotes,
      reviewerNotes: criterion.reviewerNotes,
    });
  };

  const handleSave = (criterionId: string) => {
    updateCriterion(
      {
        criterionId,
        updates: {
          verificationStatus: editingData.verificationStatus,
          verificationMethod: editingData.verificationMethod,
          verificationNotes: editingData.verificationNotes,
          reviewerNotes: editingData.reviewerNotes,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingData({});
        },
        onError: (error) => {
          console.error('Failed to update criterion:', error);
          alert('Failed to save changes. Please try again.');
        },
      }
    );
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingData({});
  };

  const getStatusBadge = (status?: string) => {
    const config = STATUS_OPTIONS.find(opt => opt.value === status);
    if (!config) return <span className="text-gray-500">-</span>;

    return (
      <span className={cn('px-2 py-1 rounded-full text-xs font-medium', config.className)}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Criterion
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Method
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
              Notes
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {criteria.map((criterion) => {
            const isEditing = editingId === criterion.id;

            return (
              <tr key={criterion.id} className="hover:bg-gray-50">
                <td className="px-4 py-4">
                  <div>
                    <div className="font-medium text-gray-900">
                      {criterion.criterionNumber}
                    </div>
                    <div className="text-sm text-gray-600">{criterion.criterionName}</div>
                    {criterion.level && (
                      <span className="inline-block mt-1 text-xs text-gray-500">
                        Level {criterion.level}
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-4">
                  {isEditing ? (
                    <select
                      value={editingData.verificationStatus || ''}
                      onChange={(e) =>
                        setEditingData({ ...editingData, verificationStatus: e.target.value })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                    >
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    getStatusBadge(criterion.verificationStatus)
                  )}
                </td>

                <td className="px-4 py-4">
                  {isEditing ? (
                    <select
                      value={editingData.verificationMethod || ''}
                      onChange={(e) =>
                        setEditingData({ ...editingData, verificationMethod: e.target.value })
                      }
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                    >
                      <option value="">Select method...</option>
                      {METHOD_OPTIONS.map((method) => (
                        <option key={method} value={method}>
                          {method}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-gray-700">
                      {criterion.verificationMethod || '-'}
                    </span>
                  )}
                </td>

                <td className="px-4 py-4 max-w-md">
                  {isEditing ? (
                    <textarea
                      value={editingData.verificationNotes || ''}
                      onChange={(e) =>
                        setEditingData({ ...editingData, verificationNotes: e.target.value })
                      }
                      rows={2}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                      placeholder="Verification notes..."
                    />
                  ) : (
                    <div className="text-sm text-gray-700">
                      {criterion.verificationNotes ? (
                        <p className="line-clamp-2">{criterion.verificationNotes}</p>
                      ) : (
                        <span className="text-gray-400">No notes</span>
                      )}
                    </div>
                  )}
                </td>

                <td className="px-4 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {isEditing ? (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleSave(criterion.criterionId)}
                          disabled={isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(criterion)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View history"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {criteria.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No applicable criteria found.
        </div>
      )}
    </div>
  );
}
