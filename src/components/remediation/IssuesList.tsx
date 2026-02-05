import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { IssueWithNewFlag } from '@/types/remediation.types';

interface IssuesListProps {
  issues: IssueWithNewFlag[];
  className?: string;
}

interface GroupedIssues {
  [filePath: string]: IssueWithNewFlag[];
}

export const IssuesList: React.FC<IssuesListProps> = React.memo(({ issues, className }) => {
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Group issues by file
  const groupedIssues = issues.reduce<GroupedIssues>((acc, issue) => {
    const filePath = issue.filePath || 'Unknown File';
    if (!acc[filePath]) {
      acc[filePath] = [];
    }
    acc[filePath].push(issue);
    return acc;
  }, {});

  const toggleFile = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) {
        next.delete(filePath);
      } else {
        next.add(filePath);
      }
      return next;
    });
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'serious':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'moderate':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'minor':
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'serious':
        return 'error';
      case 'moderate':
        return 'warning';
      case 'minor':
      default:
        return 'info';
    }
  };

  if (issues.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Remaining Issues ({issues.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Object.entries(groupedIssues).map(([filePath, fileIssues]) => {
            const isExpanded = expandedFiles.has(filePath);
            const newIssuesCount = fileIssues.filter((i) => i.isNew).length;

            return (
              <div key={filePath} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleFile(filePath)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  aria-expanded={isExpanded}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{filePath}</div>
                      <div className="text-sm text-gray-500">
                        {fileIssues.length} issue{fileIssues.length !== 1 ? 's' : ''}
                        {newIssuesCount > 0 && (
                          <span className="ml-2 text-orange-600 font-medium">
                            ({newIssuesCount} new)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="default" size="sm">
                    {fileIssues.length}
                  </Badge>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-200 bg-white">
                    <div className="divide-y divide-gray-100">
                      {fileIssues.map((issue) => (
                        <div key={issue.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {getSeverityIcon(issue.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-medium text-gray-900">{issue.code}</span>
                                <Badge
                                  variant={getSeverityColor(issue.severity)}
                                  size="sm"
                                >
                                  {issue.severity}
                                </Badge>
                                {issue.isNew && (
                                  <Badge
                                    variant="warning"
                                    size="sm"
                                    className="border border-orange-300"
                                  >
                                    NEW
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 mb-2">{issue.message}</p>
                              {issue.location && (
                                <p className="text-xs text-gray-500 font-mono">
                                  Location: {issue.location}
                                </p>
                              )}
                              {issue.wcagCriteria && issue.wcagCriteria.length > 0 && (
                                <div className="mt-2 flex items-center gap-1 flex-wrap">
                                  <span className="text-xs text-gray-500">WCAG:</span>
                                  {issue.wcagCriteria.map((criterion, idx) => (
                                    <Badge key={idx} variant="default" size="sm">
                                      {criterion}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
});

IssuesList.displayName = 'IssuesList';
