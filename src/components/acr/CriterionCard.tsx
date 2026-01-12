import { AlertCircle, Info, FileText, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface Evidence {
  source: string;
  description: string;
  affectedFiles?: string[];
  issueCount?: number;
}

type CriterionStatus = 'fail' | 'needs_verification' | 'likely_na' | 'pass';

interface CriterionCardProps {
  number: string;
  name: string;
  level: 'A' | 'AA' | 'AAA';
  confidence: number;
  status: CriterionStatus;
  evidence?: Evidence;
  onViewDetails?: () => void;
  onViewFiles?: () => void;
  onMarkReviewed?: () => void;
}

const getLevelBadgeColor = (level: string): string => {
  switch (level) {
    case 'A': return 'bg-blue-100 text-blue-800';
    case 'AA': return 'bg-green-100 text-green-800';
    case 'AAA': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getStatusIcon = (status: CriterionStatus) => {
  switch (status) {
    case 'fail': return <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />;
    case 'needs_verification': return <Info className="h-5 w-5 text-orange-600" aria-hidden="true" />;
    case 'likely_na': return <MinusCircle className="h-5 w-5 text-gray-500" aria-hidden="true" />;
    default: return null;
  }
};

const statusColors: Record<CriterionStatus, string> = {
  fail: 'bg-red-50 border-red-200',
  needs_verification: 'bg-orange-50 border-orange-200',
  likely_na: 'bg-gray-50 border-gray-200',
  pass: 'bg-green-50 border-green-200',
};

export function CriterionCard({
  number,
  name,
  level,
  confidence,
  status,
  evidence,
  onViewDetails,
  onViewFiles,
  onMarkReviewed,
}: CriterionCardProps) {
  return (
    <div className={`border rounded-lg p-4 ${statusColors[status]}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon(status)}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-gray-900">
                {number}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {name}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded font-semibold ${getLevelBadgeColor(level)}`}>
                {level}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Confidence: {confidence}%
            </div>
          </div>
        </div>
      </div>

      {evidence && (
        <div className="mb-3 pl-8">
          <div className="flex items-start gap-2 text-sm">
            <FileText className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-gray-700 font-medium mb-1">
                {evidence.description}
              </p>
              {evidence.affectedFiles && evidence.affectedFiles.length > 0 && (
                <p className="text-xs text-gray-600">
                  Affected: {evidence.affectedFiles.slice(0, 2).join(', ')}
                  {evidence.affectedFiles.length > 2 && ` +${evidence.affectedFiles.length - 2} more`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'needs_verification' && !evidence && (
        <div className="mb-3 pl-8">
          <p className="text-sm text-gray-600">
            No automated evidence. Manual testing required.
          </p>
        </div>
      )}

      {status === 'likely_na' && (
        <div className="mb-3 pl-8">
          <p className="text-sm text-gray-600">
            Content type suggests this criterion may not apply.
          </p>
        </div>
      )}

      <div className="flex gap-2 pl-8">
        {onViewDetails && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewDetails}
            className="text-xs"
          >
            View Details
          </Button>
        )}
        {onViewFiles && evidence?.affectedFiles && evidence.affectedFiles.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={onViewFiles}
            className="text-xs"
          >
            View Affected Files
          </Button>
        )}
        {onMarkReviewed && status === 'needs_verification' && (
          <Button
            size="sm"
            variant="outline"
            onClick={onMarkReviewed}
            className="text-xs"
          >
            Mark as Reviewed
          </Button>
        )}
      </div>
    </div>
  );
}
