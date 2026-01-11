import React from 'react';
import { Badge } from '../ui/Badge';
import type { ComparisonSummary } from '@/types/comparison';

interface ComparisonHeaderProps {
  summary: ComparisonSummary;
  fileName: string;
}

export const ComparisonHeader: React.FC<ComparisonHeaderProps> = ({ summary, fileName }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">{fileName}</h2>
      
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Total Changes:</span>
          <Badge variant="default">{summary.totalChanges}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Applied:</span>
          <Badge variant="success">{summary.applied}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Rejected:</span>
          <Badge variant="error">{summary.rejected}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Skipped:</span>
          <Badge variant="default">{summary.skipped}</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Failed:</span>
          <Badge variant="error">{summary.failed}</Badge>
        </div>
        
        {summary.resolutionRate !== undefined && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-gray-600">Resolution Rate:</span>
            <Badge variant="info">{Math.round(summary.resolutionRate)}%</Badge>
          </div>
        )}
      </div>
    </div>
  );
};
