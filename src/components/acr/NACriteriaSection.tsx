import { useState } from 'react';
import { Info, ChevronDown, ChevronRight, Edit2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useUpdateCriterion } from '@/hooks/useAcrReport';
import type { AcrCriterionReview } from '@/types/acr-report.types';
import { cn } from '@/utils/cn';

interface NACriteriaSectionProps {
  naCriteria: AcrCriterionReview[];
  acrJobId: string;
  edition: string;
}

// Group N/A criteria by category for better organization
const CATEGORY_LABELS: Record<string, string> = {
  multimedia: 'Multimedia Content (Audio, Video, Animation)',
  forms: 'Forms and Input',
  interactive: 'Interactive Elements',
  timing: 'Timing and Auto-Playing Content',
  motion: 'Pointer Gestures and Motion',
  javascript: 'JavaScript-Dependent Features',
  other: 'Other',
};

export function NACriteriaSection({ naCriteria, acrJobId, edition: _edition }: NACriteriaSectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingReason, setEditingReason] = useState<string>('');

  const { mutate: updateCriterion, isPending } = useUpdateCriterion(acrJobId);

  // Categorize N/A criteria based on criterion number
  const categorizedNACriteria = naCriteria.reduce((acc, criterion) => {
    let category = 'other';

    // Categorize based on criterion ID
    if (criterion.criterionId.startsWith('1.2')) {
      category = 'multimedia';
    } else if (criterion.criterionId.startsWith('3.3') || criterion.criterionId.startsWith('3.2')) {
      category = 'forms';
    } else if (criterion.criterionId === '2.1.2') {
      category = 'javascript';
    } else if (criterion.criterionId.startsWith('2.2')) {
      category = 'timing';
    } else if (criterion.criterionId.startsWith('2.5')) {
      category = 'motion';
    } else if (criterion.criterionId === '4.1.3') {
      category = 'javascript';
    }

    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(criterion);
    return acc;
  }, {} as Record<string, AcrCriterionReview[]>);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const handleEdit = (criterion: AcrCriterionReview) => {
    setEditingId(criterion.id);
    setEditingReason(criterion.naReason || '');
  };

  const handleSave = (criterionId: string) => {
    updateCriterion(
      {
        criterionId,
        updates: {
          naReason: editingReason,
        },
      },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingReason('');
        },
        onError: (error) => {
          console.error('Failed to update N/A reason:', error);
          alert('Failed to save changes. Please try again.');
        },
      }
    );
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditingReason('');
  };

  const handleMarkAsApplicable = (criterionId: string) => {
    if (
      confirm(
        'Are you sure you want to mark this criterion as applicable? It will be moved to the applicable criteria list and will need verification.'
      )
    ) {
      updateCriterion(
        {
          criterionId,
          updates: {
            isNotApplicable: false,
            naReason: undefined,
          },
        },
        {
          onSuccess: () => {
            alert('Criterion marked as applicable. Please verify it in the applicable criteria section.');
          },
          onError: (error) => {
            console.error('Failed to update criterion:', error);
            alert('Failed to update criterion. Please try again.');
          },
        }
      );
    }
  };

  // Parse N/A suggestion data to display detection details
  const getDetectionDetails = (criterion: AcrCriterionReview) => {
    if (!criterion.naSuggestionData) return null;

    try {
      const suggestionData =
        typeof criterion.naSuggestionData === 'string'
          ? JSON.parse(criterion.naSuggestionData)
          : criterion.naSuggestionData;

      return {
        confidence: suggestionData.confidence || 0,
        detectionChecks: suggestionData.detectionChecks || [],
        edgeCases: suggestionData.edgeCases || [],
      };
    } catch (error) {
      console.error('Failed to parse N/A suggestion data:', error);
      return null;
    }
  };

  if (naCriteria.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <Info className="h-8 w-8 mx-auto mb-2 text-gray-400" />
        <p>No criteria marked as Not Applicable.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">About Not Applicable Criteria</p>
          <p>
            These criteria have been determined not applicable to your content based on AI
            analysis. They are excluded from conformance calculations. You can edit the rationale
            or change the status if needed.
          </p>
        </div>
      </div>

      {/* Categorized N/A Criteria */}
      {Object.entries(categorizedNACriteria).map(([category, criteria]) => {
        const isExpanded = expandedCategories.has(category);

        return (
          <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Category Header */}
            <button
              onClick={() => toggleCategory(category)}
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
                <span className="font-medium text-gray-900">
                  {CATEGORY_LABELS[category] || category}
                </span>
                <span className="text-sm text-gray-600">({criteria.length} criteria)</span>
              </div>
            </button>

            {/* Category Criteria */}
            {isExpanded && (
              <div className="divide-y divide-gray-200">
                {criteria.map((criterion) => {
                  const isEditing = editingId === criterion.id;
                  const detectionDetails = getDetectionDetails(criterion);

                  return (
                    <div key={criterion.id} className="p-4 bg-white hover:bg-gray-50">
                      {/* Criterion Header */}
                      <div className="flex items-start justify-between mb-3">
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

                        <div className="flex items-center gap-2">
                          {!isEditing && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEdit(criterion)}
                                title="Edit N/A reason"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkAsApplicable(criterion.criterionId)}
                                title="Mark as applicable"
                              >
                                Make Applicable
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* N/A Reason */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-gray-700 mb-1 block">
                          Rationale for N/A Status:
                        </label>
                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              value={editingReason}
                              onChange={(e) => setEditingReason(e.target.value)}
                              rows={3}
                              className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm"
                              placeholder="Enter rationale for N/A status..."
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleCancel}
                                disabled={isPending}
                              >
                                <X className="h-4 w-4 mr-2" />
                                Cancel
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleSave(criterion.criterionId)}
                                disabled={isPending}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                Save
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-700 bg-gray-50 rounded p-3">
                            {criterion.naReason || 'No rationale provided'}
                          </div>
                        )}
                      </div>

                      {/* Detection Details */}
                      {detectionDetails && !isEditing && (
                        <div className="space-y-3">
                          {/* Confidence */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-600">AI Confidence:</span>
                            <span
                              className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                detectionDetails.confidence >= 0.9
                                  ? 'bg-green-100 text-green-800'
                                  : detectionDetails.confidence >= 0.7
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-orange-100 text-orange-800'
                              )}
                            >
                              {Math.round(detectionDetails.confidence * 100)}%
                            </span>
                          </div>

                          {/* Detection Checks */}
                          {detectionDetails.detectionChecks.length > 0 && (
                            <div>
                              <span className="text-xs font-medium text-gray-700 block mb-1">
                                Detection Checks:
                              </span>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {detectionDetails.detectionChecks.map(
                                  (check: DetectionCheck, idx: number) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span
                                        className={cn(
                                          'inline-block w-4 h-4 rounded-full flex-shrink-0 mt-0.5',
                                          check.result === 'pass'
                                            ? 'bg-green-100 text-green-600'
                                            : 'bg-gray-100 text-gray-600'
                                        )}
                                      >
                                        {check.result === 'pass' ? '✓' : '○'}
                                      </span>
                                      <span>{check.description}</span>
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>
                          )}

                          {/* Edge Cases */}
                          {detectionDetails.edgeCases.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                              <span className="text-xs font-medium text-yellow-800 block mb-1">
                                ⚠️ Edge Cases to Consider:
                              </span>
                              <ul className="text-xs text-yellow-700 space-y-1 list-disc pl-4">
                                {detectionDetails.edgeCases.map((edgeCase: string, idx: number) => (
                                  <li key={idx}>{edgeCase}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Verification Data (if any) */}
                      {criterion.verificationNotes && !isEditing && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <span className="text-xs font-medium text-gray-700 block mb-1">
                            Verification Notes:
                          </span>
                          <p className="text-sm text-gray-600">{criterion.verificationNotes}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
