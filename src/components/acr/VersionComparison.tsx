import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useCompareVersions } from '@/hooks/useAcrVersions';
import type { VersionDifference } from '@/types/version.types';

interface ComparisonData {
  differences: VersionDifference[];
}

interface VersionComparisonProps {
  acrId: string;
  version1: number;
  version2: number;
  onBack: () => void;
}

function formatValue(field: string, value: string): string {
  if (field === 'conformanceLevel') {
    const levels: Record<string, string> = {
      supports: 'Supports',
      partially_supports: 'Partially Supports',
      does_not_support: 'Does Not Support',
      not_applicable: 'Not Applicable',
    };
    return levels[value] || value;
  }
  if (field === 'attribution') {
    return value.replace(/-/g, ' ');
  }
  return value || '(empty)';
}

function getConformanceBadgeVariant(level: string): 'success' | 'warning' | 'error' | 'default' {
  switch (level) {
    case 'supports': return 'success';
    case 'partially_supports': return 'warning';
    case 'does_not_support': return 'error';
    default: return 'default';
  }
}

function DifferenceRow({ diff, isRemarks }: { diff: VersionDifference; isRemarks?: boolean }) {
  const isConformance = diff.field === 'conformanceLevel';

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-4 py-2 border-b">
        <span className="font-medium text-gray-900">
          {diff.criterionId} - {diff.criterionName}
        </span>
        <Badge variant="info" size="sm" className="ml-2">
          {diff.field === 'conformanceLevel' ? 'Conformance Level' : 
           diff.field === 'remarks' ? 'Remarks' : 
           diff.field === 'attribution' ? 'Attribution' : diff.field}
        </Badge>
      </div>
      <div className="grid grid-cols-2 divide-x">
        <div className={cn(
          'p-4',
          isRemarks ? 'bg-white' : 'bg-red-50'
        )}>
          {isConformance ? (
            <Badge variant={getConformanceBadgeVariant(diff.v1Value)}>
              {formatValue(diff.field, diff.v1Value)}
            </Badge>
          ) : (
            <p className={cn(
              'text-sm',
              isRemarks ? 'text-gray-700' : 'text-red-800'
            )}>
              {formatValue(diff.field, diff.v1Value)}
            </p>
          )}
        </div>
        <div className={cn(
          'p-4',
          isRemarks ? 'bg-white' : 'bg-green-50'
        )}>
          {isConformance ? (
            <Badge variant={getConformanceBadgeVariant(diff.v2Value)}>
              {formatValue(diff.field, diff.v2Value)}
            </Badge>
          ) : (
            <p className={cn(
              'text-sm',
              isRemarks ? 'text-gray-700' : 'text-green-800'
            )}>
              {formatValue(diff.field, diff.v2Value)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function VersionComparison({ acrId, version1, version2, onBack }: VersionComparisonProps) {
  const { data: comparisonRaw, isLoading } = useCompareVersions(acrId, version1, version2, { enabled: true });
  const comparison = comparisonRaw as ComparisonData | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-center py-12 text-gray-500">
        Failed to load comparison data.
      </div>
    );
  }

  const conformanceChanges = (comparison.differences || []).filter((d: VersionDifference) => d.field === 'conformanceLevel');
  const remarksChanges = (comparison.differences || []).filter((d: VersionDifference) => d.field === 'remarks');
  const otherChanges = (comparison.differences || []).filter((d: VersionDifference) =>
    d.field !== 'conformanceLevel' && d.field !== 'remarks'
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to History
        </Button>
      </div>

      <div className="bg-gray-100 rounded-lg p-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Version {version1}</div>
            <div className="text-sm text-gray-500">Older</div>
          </div>
          <ArrowRight className="h-6 w-6 text-gray-400" />
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">Version {version2}</div>
            <div className="text-sm text-gray-500">Newer</div>
          </div>
        </div>
        <div className="text-center mt-3">
          <Badge variant="info">
            {(comparison.differences || []).length} difference{(comparison.differences || []).length !== 1 ? 's' : ''} found
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center text-sm font-medium text-gray-600 pb-2 border-b">
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded bg-red-200" />
          Version {version1}
        </div>
        <div className="flex items-center justify-center gap-2">
          <div className="w-3 h-3 rounded bg-green-200" />
          Version {version2}
        </div>
      </div>

      {(comparison.differences || []).length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No differences found between these versions.
        </div>
      ) : (
        <div className="space-y-6">
          {conformanceChanges.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Conformance Level Changes ({conformanceChanges.length})
              </h4>
              <div className="space-y-3">
                {conformanceChanges.map((diff, idx) => (
                  <DifferenceRow key={idx} diff={diff} />
                ))}
              </div>
            </div>
          )}

          {remarksChanges.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Remarks Changes ({remarksChanges.length})
              </h4>
              <div className="space-y-3">
                {remarksChanges.map((diff, idx) => (
                  <DifferenceRow key={idx} diff={diff} isRemarks />
                ))}
              </div>
            </div>
          )}

          {otherChanges.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                Other Changes ({otherChanges.length})
              </h4>
              <div className="space-y-3">
                {otherChanges.map((diff, idx) => (
                  <DifferenceRow key={idx} diff={diff} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
