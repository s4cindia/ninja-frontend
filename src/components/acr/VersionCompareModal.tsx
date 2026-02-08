import React, { useState } from 'react';
import {
  X,
  ArrowLeftRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAcrVersion } from '@/hooks/useAcrVersions';

interface VersionCompareModalProps {
  isOpen: boolean;
  onClose: () => void;
  version1Id: string;
  version2Id: string;
}

export const VersionCompareModal: React.FC<VersionCompareModalProps> = ({
  isOpen,
  onClose,
  version1Id,
  version2Id
}) => {
  const [compareMode, setCompareMode] = useState<'overview' | 'criteria' | 'changes'>('overview');

  // Fetch versions using authenticated hooks
  const { data: version1, isLoading: loading1 } = useAcrVersion(version1Id, { enabled: isOpen });
  const { data: version2, isLoading: loading2 } = useAcrVersion(version2Id, { enabled: isOpen });

  const isLoading = loading1 || loading2;

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

  const renderStatComparison = (label: string, val1: number, val2: number) => {
    const diff = val2 - val1;
    const diffSign = diff > 0 ? '+' : '';
    const hasChange = diff !== 0;

    return (
      <div className="flex items-center justify-between py-2 border-b">
        <span className="text-sm text-gray-600">{label}:</span>
        <div className="flex items-center gap-4">
          <span className="font-medium">{val1}</span>
          <ArrowLeftRight className="h-4 w-4 text-gray-400" />
          <span className="font-medium">{val2}</span>
          {hasChange && (
            <Badge
              variant={diff > 0 ? 'default' : 'secondary'}
              className={cn(
                'text-xs',
                diff > 0 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
              )}
            >
              {diffSign}{diff}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  const findChangedCriteria = () => {
    if (!version1 || !version2) return { added: [], removed: [], modified: [] };

    const v1Criteria = new Map(version1.criteria.map(c => [c.criterionId, c]));
    const v2Criteria = new Map(version2.criteria.map(c => [c.criterionId, c]));

    const added = version2.criteria.filter(c => !v1Criteria.has(c.criterionId));
    const removed = version1.criteria.filter(c => !v2Criteria.has(c.criterionId));
    const modified = version2.criteria.filter(c => {
      const v1c = v1Criteria.get(c.criterionId);
      if (!v1c) return false;
      return (
        v1c.verificationStatus !== c.verificationStatus ||
        v1c.confidence !== c.confidence ||
        v1c.verificationNotes !== c.verificationNotes
      );
    });

    return { added, removed, modified };
  };

  const changes = findChangedCriteria();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5" />
              Compare Versions
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {!isLoading && version1 && version2 && (
            <div className="flex items-center gap-4 mt-4 text-sm">
              <div className="flex-1 p-3 bg-blue-50 rounded border border-blue-200">
                <div className="font-semibold text-blue-900">Version 1 (Older)</div>
                <div className="text-xs text-blue-700 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(version1.createdAt)}
                </div>
              </div>
              <ArrowLeftRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
              <div className="flex-1 p-3 bg-green-50 rounded border border-green-200">
                <div className="font-semibold text-green-900">Version 2 (Newer)</div>
                <div className="text-xs text-green-700 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(version2.createdAt)}
                </div>
              </div>
            </div>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            Loading versions for comparison...
          </div>
        ) : !version1 || !version2 ? (
          <div className="p-12 text-center text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            Failed to load versions
          </div>
        ) : (
          <Tabs value={compareMode} onValueChange={(v) => setCompareMode(v as 'overview' | 'criteria' | 'changes')} className="flex-1">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="criteria">
                  Criteria Changes
                  {changes.modified.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {changes.modified.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="changes">
                  Summary
                  {(changes.added.length + changes.removed.length) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {changes.added.length + changes.removed.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 h-[60vh]">
              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 m-0">
                <div className="space-y-6">
                  {/* Statistics Comparison */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Statistics Comparison
                    </h3>
                    <div className="space-y-1">
                      {renderStatComparison('Total Criteria', version1.summary.totalCriteria, version2.summary.totalCriteria)}
                      {renderStatComparison('Applicable', version1.summary.applicableCriteria, version2.summary.applicableCriteria)}
                      {renderStatComparison('Passed', version1.summary.passedCriteria, version2.summary.passedCriteria)}
                      {renderStatComparison('Failed', version1.summary.failedCriteria, version2.summary.failedCriteria)}
                      {renderStatComparison('Not Applicable', version1.summary.naCriteria, version2.summary.naCriteria)}
                    </div>
                  </Card>

                  {/* Status Comparison */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-3">Report Status</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Version 1</div>
                        <Badge>{version1.status}</Badge>
                      </div>
                      <div>
                        <div className="text-xs text-gray-600 mb-1">Version 2</div>
                        <Badge>{version2.status}</Badge>
                      </div>
                    </div>
                  </Card>

                  {/* Document Type */}
                  {(version1.documentType || version2.documentType) && (
                    <Card className="p-4">
                      <h3 className="font-semibold mb-3">Document Type</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Version 1</div>
                          <span className="capitalize">{version1.documentType || 'Not specified'}</span>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Version 2</div>
                          <span className="capitalize">{version2.documentType || 'Not specified'}</span>
                        </div>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Criteria Changes Tab */}
              <TabsContent value="criteria" className="p-6 m-0">
                <div className="space-y-4">
                  {changes.modified.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No criteria changes between versions
                    </div>
                  ) : (
                    changes.modified.map(criterion => {
                      const v1Criterion = version1.criteria.find(c => c.criterionId === criterion.criterionId);
                      return (
                        <Card key={criterion.criterionId} className="p-4">
                          <div className="font-semibold mb-2">
                            {criterion.criterionNumber} - {criterion.criterionName}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Version 1</div>
                              <div className="space-y-1">
                                <div>Status: <Badge variant="outline">{v1Criterion?.verificationStatus || 'Unknown'}</Badge></div>
                                <div>Confidence: {v1Criterion?.confidence || 0}%</div>
                                {v1Criterion?.verificationNotes && (
                                  <div className="text-xs text-gray-600 mt-2">
                                    Notes: {v1Criterion.verificationNotes}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-600 mb-1">Version 2</div>
                              <div className="space-y-1">
                                <div>Status: <Badge variant="outline">{criterion.verificationStatus || 'Unknown'}</Badge></div>
                                <div>Confidence: {criterion.confidence || 0}%</div>
                                {criterion.verificationNotes && (
                                  <div className="text-xs text-gray-600 mt-2">
                                    Notes: {criterion.verificationNotes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  )}
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="changes" className="p-6 m-0">
                <div className="space-y-4">
                  {/* Added Criteria */}
                  {changes.added.length > 0 && (
                    <Card className="p-4 bg-green-50 border-green-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-green-900">
                        <CheckCircle className="h-4 w-4" />
                        Added Criteria ({changes.added.length})
                      </h3>
                      <ul className="space-y-1">
                        {changes.added.map(c => (
                          <li key={c.criterionId} className="text-sm text-green-800">
                            • {c.criterionNumber} - {c.criterionName}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Removed Criteria */}
                  {changes.removed.length > 0 && (
                    <Card className="p-4 bg-red-50 border-red-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-900">
                        <XCircle className="h-4 w-4" />
                        Removed Criteria ({changes.removed.length})
                      </h3>
                      <ul className="space-y-1">
                        {changes.removed.map(c => (
                          <li key={c.criterionId} className="text-sm text-red-800">
                            • {c.criterionNumber} - {c.criterionName}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {/* Modified Criteria */}
                  {changes.modified.length > 0 && (
                    <Card className="p-4 bg-blue-50 border-blue-200">
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-blue-900">
                        <AlertCircle className="h-4 w-4" />
                        Modified Criteria ({changes.modified.length})
                      </h3>
                      <ul className="space-y-1">
                        {changes.modified.map(c => (
                          <li key={c.criterionId} className="text-sm text-blue-800">
                            • {c.criterionNumber} - {c.criterionName}
                          </li>
                        ))}
                      </ul>
                    </Card>
                  )}

                  {changes.added.length === 0 && changes.removed.length === 0 && changes.modified.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No changes detected between versions
                    </div>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};
