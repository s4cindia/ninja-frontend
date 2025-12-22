import React from 'react';
import { CheckCircle, AlertCircle, Clock, Download, Eye, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { clsx } from 'clsx';

interface RemediationSummaryProps {
  contentType: 'pdf' | 'epub';
  originalIssueCount: number;
  fixedIssueCount: number;
  remainingIssues: number;
  timeTaken?: string;
  jobId: string;
  onViewDetails?: () => void;
  onDownload?: () => void;
  onStartNew?: () => void;
  className?: string;
}

export const RemediationSummary: React.FC<RemediationSummaryProps> = ({
  contentType,
  originalIssueCount,
  fixedIssueCount,
  remainingIssues,
  timeTaken,
  onViewDetails,
  onDownload,
  onStartNew,
  className,
}) => {
  const fixRate = originalIssueCount > 0 
    ? Math.round((fixedIssueCount / originalIssueCount) * 100) 
    : 0;

  const getFixRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (rate: number) => {
    if (rate >= 80) return 'stroke-green-500';
    if (rate >= 50) return 'stroke-amber-500';
    return 'stroke-red-500';
  };

  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (fixRate / 100) * circumference;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Remediation Summary
          </CardTitle>
          <Badge variant={contentType === 'epub' ? 'info' : 'default'}>
            {contentType.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-shrink-0 flex justify-center">
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="8"
                  className="text-gray-200"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className={clsx('transition-all duration-500', getProgressColor(fixRate))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={clsx('text-3xl font-bold', getFixRateColor(fixRate))}>
                  {fixRate}%
                </span>
                <span className="text-xs text-gray-500">Fix Rate</span>
              </div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Original Issues</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{originalIssueCount}</p>
            </div>

            <div className="p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-2 text-green-600 mb-1">
                <CheckCircle className="h-4 w-4" />
                <span className="text-xs">Fixed</span>
              </div>
              <p className="text-2xl font-bold text-green-700">{fixedIssueCount}</p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs">Remaining</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{remainingIssues}</p>
            </div>

            {timeTaken && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Clock className="h-4 w-4" />
                  <span className="text-xs">Time Taken</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{timeTaken}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t">
          {onViewDetails && (
            <Button variant="outline" onClick={onViewDetails}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          )}
          {onDownload && (
            <Button variant="primary" onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
          )}
          {onStartNew && (
            <Button variant="ghost" onClick={onStartNew}>
              <Plus className="h-4 w-4 mr-2" />
              Start New
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
