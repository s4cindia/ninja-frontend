import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  GitBranch
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useAcrVersions, type ReportVersion } from '@/hooks/useAcrVersions';

interface VersionTimelineSidebarProps {
  jobId: string;
  currentVersionId?: string;
  onVersionSelect: (versionId: string) => void;
  onCompare?: (v1: string, v2: string) => void;
  onRestore?: (versionId: string) => void;
  className?: string;
}

export const VersionTimelineSidebar: React.FC<VersionTimelineSidebarProps> = ({
  jobId,
  currentVersionId,
  onVersionSelect,
  onCompare,
  onRestore,
  className
}) => {
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Fetch versions using the authenticated hook
  const { data: versions, isLoading, error } = useAcrVersions(jobId, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleVersionClick = (versionId: string) => {
    if (expandedVersion === versionId) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(versionId);
    }
  };

  const handleViewVersion = (versionId: string) => {
    onVersionSelect(versionId);
  };

  const handleSelectForCompare = (versionId: string) => {
    if (selectedForCompare.includes(versionId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== versionId));
    } else if (selectedForCompare.length < 2) {
      setSelectedForCompare([...selectedForCompare, versionId]);
    } else {
      // Replace oldest selection
      setSelectedForCompare([selectedForCompare[1], versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedForCompare.length === 2 && onCompare) {
      onCompare(selectedForCompare[0], selectedForCompare[1]);
    }
  };

  const handleRestore = (versionId: string) => {
    if (onRestore) {
      onRestore(versionId);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500';
      case 'reviewed':
        return 'bg-blue-500';
      case 'ready_for_review':
        return 'bg-yellow-500';
      case 'in_progress':
        return 'bg-gray-400';
      default:
        return 'bg-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'reviewed':
        return 'Reviewed';
      case 'ready_for_review':
        return 'Ready for Review';
      case 'in_progress':
        return 'In Progress';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const calculateConformance = (version: ReportVersion) => {
    if (version.applicableCriteria === 0) return 0;
    return Math.round((version.passedCriteria / version.applicableCriteria) * 100);
  };

  if (isLoading) {
    return (
      <div className={cn('w-80 border-r bg-gray-50 p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Version History</h3>
        </div>
        <div className="text-sm text-gray-500">Loading versions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('w-80 border-r bg-gray-50 p-4', className)}>
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Version History</h3>
        </div>
        <div className="text-sm text-red-600">
          <AlertCircle className="h-4 w-4 inline mr-1" />
          Failed to load versions
        </div>
      </div>
    );
  }

  return (
    <div className={cn('w-80 border-r bg-gray-50 flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b bg-white">
        <div className="flex items-center gap-2 mb-2">
          <GitBranch className="h-5 w-5 text-gray-600" />
          <h3 className="font-semibold">Version History</h3>
        </div>
        <p className="text-xs text-gray-500">
          {versions?.length || 0} draft version{versions?.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Compare Actions */}
      {selectedForCompare.length > 0 && (
        <div className="p-3 bg-blue-50 border-b">
          <div className="text-xs text-blue-900 mb-2">
            {selectedForCompare.length} version{selectedForCompare.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            {selectedForCompare.length === 2 && onCompare && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 text-xs"
                onClick={handleCompare}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                Compare
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setSelectedForCompare([])}
            >
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Timeline */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {versions?.map((version, index) => {
            const isExpanded = expandedVersion === version.id;
            const isCurrent = version.id === currentVersionId;
            const isSelected = selectedForCompare.includes(version.id);
            const conformance = calculateConformance(version);

            return (
              <div key={version.id} className="relative">
                {/* Timeline line */}
                {index < versions.length - 1 && (
                  <div className="absolute left-[19px] top-10 bottom-[-8px] w-0.5 bg-gray-300" />
                )}

                <Card
                  className={cn(
                    'p-3 cursor-pointer transition-all hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
                    isCurrent && 'ring-2 ring-blue-500 bg-blue-50',
                    isSelected && 'ring-2 ring-purple-500',
                    version.isLatest && 'border-green-500 border-2'
                  )}
                  onClick={() => handleVersionClick(version.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleVersionClick(version.id);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={`Version ${version.versionNumber}${version.isLatest ? ' (Latest)' : ''}${isCurrent ? ' (Current)' : ''}`}
                  aria-pressed={expandedVersion === version.id}
                >
                  {/* Version Header */}
                  <div className="flex items-start gap-3">
                    {/* Timeline dot */}
                    <div className={cn(
                      'mt-1 h-5 w-5 rounded-full flex items-center justify-center flex-shrink-0',
                      getStatusColor(version.status)
                    )}>
                      {version.isLatest ? (
                        <CheckCircle className="h-3 w-3 text-white" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Version number and badges */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm">
                          v{version.versionNumber}
                        </span>
                        {version.isLatest && (
                          <Badge variant="default" className="text-xs">Latest</Badge>
                        )}
                        {isCurrent && (
                          <Badge variant="default" className="text-xs">Current</Badge>
                        )}
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                        <Clock className="h-3 w-3" />
                        {formatDate(version.createdAt)}
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-2 text-xs">
                        <span className={cn(
                          'px-2 py-1 rounded',
                          conformance >= 80 ? 'bg-green-100 text-green-800' :
                          conformance >= 50 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        )}>
                          {conformance}% pass
                        </span>
                        <span className="text-gray-500">
                          {version.applicableCriteria} applicable
                        </span>
                      </div>

                      {/* Expand/Collapse indicator */}
                      <div className="mt-2 flex items-center justify-center text-gray-400">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <>
                      <Separator className="my-3" />

                      {/* Detailed stats */}
                      <div className="space-y-2 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Total Criteria:</span>
                          <span className="font-medium">{version.totalCriteria}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Applicable:</span>
                          <span className="font-medium">{version.applicableCriteria}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-green-600">Passed:</span>
                          <span className="font-medium text-green-600">{version.passedCriteria}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-red-600">Failed:</span>
                          <span className="font-medium text-red-600">{version.failedCriteria}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-blue-600">Not Applicable:</span>
                          <span className="font-medium text-blue-600">{version.naCriteria}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium">{getStatusLabel(version.status)}</span>
                        </div>
                        {version.documentType && (
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Type:</span>
                            <span className="font-medium capitalize">{version.documentType}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        {!isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewVersion(version.id);
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View This Version
                          </Button>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? 'primary' : 'outline'}
                            className="flex-1 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectForCompare(version.id);
                            }}
                          >
                            <GitBranch className="h-3 w-3 mr-1" />
                            {isSelected ? 'Selected' : 'Compare'}
                          </Button>

                          {!version.isLatest && onRestore && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Restore this version as the latest draft? This will create a new version.')) {
                                  handleRestore(version.id);
                                }
                              }}
                            >
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </Card>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
