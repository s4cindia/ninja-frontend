import React, { useState } from 'react';
import { CheckCircle, X, Minus, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Progress } from '../ui/Progress';
import { cn } from '@/utils/cn';
import type { MatterhornSummary, MatterhornCategory, MatterhornCheckpoint, MatterhornCheckpointStatus } from '@/types/pdf.types';

export interface MatterhornSummaryProps {
  summary: MatterhornSummary;
  onCheckpointClick?: (checkpointId: string) => void;
  collapsed?: boolean;
}

const STATUS_CONFIG: Record<MatterhornCheckpointStatus, {
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  label: string;
}> = {
  passed: {
    icon: <CheckCircle className="h-4 w-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Passed',
  },
  failed: {
    icon: <X className="h-4 w-4" />,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Failed',
  },
  'not-applicable': {
    icon: <Minus className="h-4 w-4" />,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    label: 'Not Applicable',
  },
};

const CheckpointStatusIcon: React.FC<{ status: MatterhornCheckpointStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <div className={cn('flex items-center justify-center w-6 h-6 rounded-full', config.bgColor)}>
      <span className={config.color}>{config.icon}</span>
    </div>
  );
};

const CheckpointItem: React.FC<{
  checkpoint: MatterhornCheckpoint;
  onClick?: (checkpointId: string) => void;
}> = ({ checkpoint, onClick }) => {
  const config = STATUS_CONFIG[checkpoint.status];
  const isClickable = onClick && checkpoint.issueCount > 0;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border border-gray-200',
        config.bgColor,
        isClickable && 'cursor-pointer hover:border-gray-300 transition-colors'
      )}
      onClick={() => isClickable && onClick(checkpoint.id)}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick(checkpoint.id);
        }
      }}
    >
      <CheckpointStatusIcon status={checkpoint.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">{checkpoint.id}</span>
          {checkpoint.issueCount > 0 && (
            <Badge variant="error" size="sm">
              {checkpoint.issueCount} {checkpoint.issueCount === 1 ? 'issue' : 'issues'}
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-700">{checkpoint.description}</p>
      </div>
    </div>
  );
};

const CategorySection: React.FC<{
  category: MatterhornCategory;
  onCheckpointClick?: (checkpointId: string) => void;
  defaultCollapsed?: boolean;
}> = ({ category, onCheckpointClick, defaultCollapsed = false }) => {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const categoryCounts = {
    passed: category.checkpoints.filter(c => c.status === 'passed').length,
    failed: category.checkpoints.filter(c => c.status === 'failed').length,
    notApplicable: category.checkpoints.filter(c => c.status === 'not-applicable').length,
  };

  const totalIssues = category.checkpoints.reduce((sum, c) => sum + c.issueCount, 0);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
        aria-expanded={!isCollapsed}
      >
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </span>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-900">
              {category.id}: {category.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-600">
                {categoryCounts.passed} passed, {categoryCounts.failed} failed, {categoryCounts.notApplicable} N/A
              </span>
              {totalIssues > 0 && (
                <Badge variant="error" size="sm">
                  {totalIssues} {totalIssues === 1 ? 'issue' : 'issues'}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </button>

      {!isCollapsed && (
        <div className="p-4 space-y-2 bg-white">
          {category.checkpoints.map((checkpoint) => (
            <CheckpointItem
              key={checkpoint.id}
              checkpoint={checkpoint}
              onClick={onCheckpointClick}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const MatterhornSummary: React.FC<MatterhornSummaryProps> = ({
  summary,
  onCheckpointClick,
  collapsed = false,
}) => {
  const passedPercentage = summary.totalCheckpoints > 0
    ? Math.round((summary.passed / summary.totalCheckpoints) * 100)
    : 0;

  const totalIssues = summary.categories.reduce(
    (sum, category) => sum + category.checkpoints.reduce((s, c) => s + c.issueCount, 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Matterhorn Protocol Compliance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Summary */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Overall Compliance</p>
              <p className="text-2xl font-bold text-gray-900">{passedPercentage}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Total Checkpoints</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalCheckpoints}</p>
            </div>
          </div>

          <Progress value={passedPercentage} showLabel className="h-3" />

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-green-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium text-green-900">Passed</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{summary.passed}</p>
            </div>

            <div className="text-center p-3 rounded-lg bg-red-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <X className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-900">Failed</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
              {totalIssues > 0 && (
                <p className="text-xs text-red-600 mt-1">{totalIssues} issues</p>
              )}
            </div>

            <div className="text-center p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Minus className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Not Applicable</span>
              </div>
              <p className="text-2xl font-bold text-gray-600">{summary.notApplicable}</p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Categories</h4>
          {summary.categories.map((category) => (
            <CategorySection
              key={category.id}
              category={category}
              onCheckpointClick={onCheckpointClick}
              defaultCollapsed={collapsed}
            />
          ))}
        </div>

        {/* Legend */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2">Status Legend:</p>
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_CONFIG).map(([status, config]) => (
              <div key={status} className="flex items-center gap-1.5">
                {config.icon}
                <span className="text-xs text-gray-600">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
