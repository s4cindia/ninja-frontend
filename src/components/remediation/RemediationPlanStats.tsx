import React from 'react';
import { Zap, Wrench, FileEdit, CheckCircle } from 'lucide-react';
import type { RemediationPlanStats } from '@/types/remediation.types';

interface RemediationPlanStatsProps {
  stats: RemediationPlanStats;
  completedCount?: number;
}

export const RemediationPlanStatsDisplay: React.FC<RemediationPlanStatsProps> = ({
  stats,
  completedCount = 0,
}) => {
  const progressPercent = stats.total > 0
    ? Math.round((completedCount / stats.total) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-gray-700">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Tasks</div>
        </div>

        <div className="bg-green-50 rounded-lg p-4 text-center border border-green-200">
          <div className="text-2xl font-bold text-green-600">{stats.autoFixable}</div>
          <div className="text-sm text-green-700 flex items-center justify-center gap-1">
            <Zap className="h-3 w-3" />
            Auto-Fixable
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-200">
          <div className="text-2xl font-bold text-blue-600">{stats.quickFixable}</div>
          <div className="text-sm text-blue-700 flex items-center justify-center gap-1">
            <Wrench className="h-3 w-3" />
            Quick Fix
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-600">{stats.manual}</div>
          <div className="text-sm text-yellow-700 flex items-center justify-center gap-1">
            <FileEdit className="h-3 w-3" />
            Manual
          </div>
        </div>

        <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-200">
          <div className="text-2xl font-bold text-purple-600">{progressPercent}%</div>
          <div className="text-sm text-purple-700 flex items-center justify-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Complete
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Overall Progress</span>
          <span>{completedCount} / {stats.total}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-green-500 rounded"></span>
          <span>Auto-Fixable: Fixed automatically</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-blue-500 rounded"></span>
          <span>Quick Fix: Guided form (your input needed)</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 bg-yellow-500 rounded"></span>
          <span>Manual: Requires code editing</span>
        </div>
      </div>
    </div>
  );
};
