import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface PerEpubDetail {
  fileName: string;
  status: string;
  issueCount: number;
}

interface AggregateCriterion {
  criterionId: string;
  criterionName: string;
  level: 'A' | 'AA' | 'AAA';
  conformanceLevel: string;
  remarks: string;
  perEpubDetails: PerEpubDetail[];
}

interface AggregateCriteriaTableProps {
  criteria: AggregateCriterion[];
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

function getConformanceVariant(level: string): BadgeVariant {
  switch (level) {
    case 'Supports':
      return 'success';
    case 'Partially Supports':
      return 'warning';
    case 'Does Not Support':
      return 'error';
    case 'Not Applicable':
      return 'default';
    default:
      return 'default';
  }
}

export function AggregateCriteriaTable({ criteria }: AggregateCriteriaTableProps) {
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  const toggleExpanded = (criterionId: string) => {
    setExpandedCriteria((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(criterionId)) {
        newExpanded.delete(criterionId);
      } else {
        newExpanded.add(criterionId);
      }
      return newExpanded;
    });
  };

  if (criteria.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No criteria found.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {criteria.map((criterion) => {
        const isExpanded = expandedCriteria.has(criterion.criterionId);

        return (
          <Card key={criterion.criterionId} className="p-0">
            <CardContent className="p-4">
              <div className="flex items-start">
                <button
                  onClick={() => toggleExpanded(criterion.criterionId)}
                  className="text-gray-400 hover:text-gray-600 p-1 -ml-1 mr-2 flex-shrink-0"
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5" />
                  ) : (
                    <ChevronRight className="h-5 w-5" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">
                        {criterion.criterionId} {criterion.criterionName}
                      </h4>
                      <p className="text-sm text-gray-500">Level {criterion.level}</p>
                    </div>
                    <Badge variant={getConformanceVariant(criterion.conformanceLevel)}>
                      {criterion.conformanceLevel}
                    </Badge>
                  </div>

                  <div className="mt-3">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                      {criterion.remarks || 'No remarks provided.'}
                    </div>

                    {isExpanded && criterion.perEpubDetails.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h5 className="text-sm font-semibold text-gray-900 mb-2">
                          Per-EPUB Breakdown:
                        </h5>
                        <div className="space-y-2">
                          {criterion.perEpubDetails.map((epub) => (
                            <div
                              key={epub.fileName}
                              className="flex items-center justify-between p-2 bg-white border rounded"
                            >
                              <span className="text-sm text-gray-900 truncate" title={epub.fileName}>
                                {epub.fileName}
                              </span>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm text-gray-600">
                                  {epub.issueCount} issue{epub.issueCount !== 1 ? 's' : ''}
                                </span>
                                <Badge variant={getConformanceVariant(epub.status)} size="sm">
                                  {epub.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {isExpanded && criterion.perEpubDetails.length === 0 && (
                      <div className="mt-4 border-t pt-4 text-sm text-gray-500 italic">
                        No per-EPUB details available.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
