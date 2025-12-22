import React from 'react';
import { FileText, CheckCircle, ArrowRight, Files, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface ChangesByType {
  metadata: number;
  content: number;
  structure: number;
  accessibility: number;
}

interface ComparisonSummaryCardProps {
  totalFiles: number;
  modifiedFiles: number;
  totalChanges: number;
  changesByType: ChangesByType;
  onViewFullComparison?: () => void;
  className?: string;
}

export const ComparisonSummaryCard: React.FC<ComparisonSummaryCardProps> = ({
  totalFiles,
  modifiedFiles,
  totalChanges,
  changesByType,
  onViewFullComparison,
  className = '',
}) => {
  const categoryItems = [
    { key: 'metadata', label: 'Metadata', count: changesByType.metadata, color: 'bg-purple-100 text-purple-800' },
    { key: 'content', label: 'Content', count: changesByType.content, color: 'bg-blue-100 text-blue-800' },
    { key: 'structure', label: 'Structure', count: changesByType.structure, color: 'bg-amber-100 text-amber-800' },
    { key: 'accessibility', label: 'Accessibility', count: changesByType.accessibility, color: 'bg-green-100 text-green-800' },
  ];

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-5 w-5 text-primary-600" aria-hidden="true" />
          Changes Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <Files className="h-5 w-5 text-gray-600 mx-auto mb-1" aria-hidden="true" />
            <p className="text-2xl font-bold text-gray-900">{totalFiles}</p>
            <p className="text-xs text-gray-500">Total Files</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600 mx-auto mb-1" aria-hidden="true" />
            <p className="text-2xl font-bold text-blue-600">{modifiedFiles}</p>
            <p className="text-xs text-gray-500">Modified</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" aria-hidden="true" />
            <p className="text-2xl font-bold text-green-600">{totalChanges}</p>
            <p className="text-xs text-gray-500">Changes</p>
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Changes by Category</p>
          <div className="flex flex-wrap gap-2">
            {categoryItems.map(item => (
              item.count > 0 && (
                <Badge key={item.key} className={item.color} size="sm">
                  {item.label}: {item.count}
                </Badge>
              )
            ))}
            {categoryItems.every(item => item.count === 0) && (
              <span className="text-sm text-gray-500">No changes recorded</span>
            )}
          </div>
        </div>

        {onViewFullComparison && (
          <Button
            variant="outline"
            size="sm"
            onClick={onViewFullComparison}
            className="w-full"
          >
            View Full Comparison
            <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
