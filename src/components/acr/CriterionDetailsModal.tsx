import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { X, ExternalLink, CheckCircle, AlertCircle, Book, Wrench, FileText, BookOpen, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';
import { wcagDocumentationService } from '@/services/wcag-documentation.service';
import { verificationService } from '@/services/verification.service';
import { NaSuggestionBanner } from './NaSuggestionBanner';
import type { CriterionConfidence, CriterionCheck } from '@/services/api';
import type { IssueMapping, RemediatedIssue, NaSuggestion, CriterionConfidenceWithIssues } from '@/types/confidence.types';

function isFixedStatus(issue: RemediatedIssue): boolean {
  const status = issue.remediationInfo?.status ?? issue.status;
  return status === 'REMEDIATED' || status === 'completed' || status === 'remediated';
}

function isFailedStatus(issue: RemediatedIssue): boolean {
  return issue.remediationInfo?.status === 'FAILED';
}

function isSkippedStatus(issue: RemediatedIssue): boolean {
  return issue.remediationInfo?.status === 'SKIPPED';
}

interface CriterionDetailsModalProps {
  criterion: CriterionConfidence | CriterionConfidenceWithIssues;
  relatedIssues?: IssueMapping[];
  remediatedIssues?: RemediatedIssue[];
  jobId?: string;
  isOpen: boolean;
  onClose: () => void;
  onVerifyClick?: (criterionId: string) => void;
  onStatusChange?: (criterionId: string, newStatus: string) => void;
  mode?: 'preview' | 'interactive';
}

export function CriterionDetailsModal({
  criterion,
  relatedIssues,
  remediatedIssues,
  jobId,
  isOpen,
  onClose,
  onVerifyClick,
  onStatusChange,
  mode = 'interactive'
}: CriterionDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'issues' | 'testing' | 'remediation' | 'wcag'>('overview');
  const [epubTitle, setEpubTitle] = useState<string>('');
  const [hasRemediationData, setHasRemediationData] = useState<boolean>(false);
  const [naAccepted, setNaAccepted] = useState<boolean>(false);

  const handleQuickAcceptNa = async (data: {
    criterionId: string;
    jobId: string;
    status: 'not_applicable';
    method: 'quick_accept';
    notes: string;
  }) => {
    await verificationService.submitNaVerification(data);
  };

  const handleNaAcceptSuccess = () => {
    setNaAccepted(true);
    onStatusChange?.(criterion.criterionId, 'not_applicable');
  };
  const navigate = useNavigate();
  const wcagDocs = wcagDocumentationService.getDocumentation(criterion.criterionId);

  useEffect(() => {
    const fetchJobData = async () => {
      if (!jobId) return;
      try {
        const response = await api.get(`/jobs/${jobId}`);
        const job = response.data.data || response.data;
        const fileName = job.originalFile?.name || job.file?.name || '';
        setEpubTitle(fileName);

        // Check if the job has remediation data (remediated file exists)
        const hasRemediated = Boolean(job.remediatedFile);
        setHasRemediationData(hasRemediated);
      } catch (error) {
        console.error('Failed to fetch job data:', error);
      }
    };

    fetchJobData();
  }, [jobId]);

  const getLevelBadgeClass = (level: string) => {
    switch (level) {
      case 'A':
        return 'bg-blue-100 text-blue-700';
      case 'AA':
        return 'bg-purple-100 text-purple-700';
      case 'AAA':
        return 'bg-indigo-100 text-indigo-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  getLevelBadgeClass(criterion.level)
                )}>
                  {criterion.level}
                </span>
                <DialogTitle className="text-xl font-semibold">
                  {criterion.criterionId} - {criterion.name}
                </DialogTitle>
              </div>
              {wcagDocs && (
                <p className="text-sm text-gray-600 mt-1">
                  {wcagDocs.shortDescription}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-10 w-10 p-0 flex-shrink-0 rounded-full hover:bg-gray-100"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>

        {epubTitle && (
          <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">EPUB:</span>
              <span className="text-sm font-medium text-gray-900">{epubTitle}</span>
            </div>
          </div>
        )}

        <Tabs defaultValue="overview" value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'issues' | 'testing' | 'remediation' | 'wcag')} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="issues" className="flex items-center gap-1.5">
              <AlertCircle className="h-4 w-4" />
              Issues
              {(() => {
                const pendingCount = relatedIssues?.length || 0;
                const fixedCount = remediatedIssues?.filter(isFixedStatus).length || 0;
                const failedCount = remediatedIssues?.filter(isFailedStatus).length || 0;
                
                if (pendingCount === 0 && fixedCount === 0 && failedCount === 0) return null;
                
                return (
                  <span className="ml-1 flex gap-1">
                    {pendingCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800">
                        {pendingCount}
                      </span>
                    )}
                    {fixedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">
                        {fixedCount}
                      </span>
                    )}
                    {failedCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-orange-100 text-orange-800">
                        {failedCount}
                      </span>
                    )}
                  </span>
                );
              })()}
            </TabsTrigger>
            <TabsTrigger value="testing" className="flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4" />
              Testing Guide
            </TabsTrigger>
            <TabsTrigger value="remediation" className="flex items-center gap-1.5">
              <Wrench className="h-4 w-4" />
              Remediation
            </TabsTrigger>
            <TabsTrigger value="wcag" className="flex items-center gap-1.5">
              <Book className="h-4 w-4" />
              WCAG Docs
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="overview" className="space-y-4 mt-0">
              {criterion.naSuggestion?.suggestedStatus === 'not_applicable' && jobId && !naAccepted && (
                <NaSuggestionBanner
                  naSuggestion={criterion.naSuggestion as NaSuggestion}
                  criterionId={criterion.criterionId}
                  jobId={jobId}
                  onQuickAccept={handleQuickAcceptNa}
                  onAcceptSuccess={handleNaAcceptSuccess}
                />
              )}

              {naAccepted && (
                <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 rounded-r-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="text-green-800 font-medium">
                      Not Applicable status accepted and saved
                    </span>
                  </div>
                </div>
              )}

              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {criterion.status === 'pass' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                  Audit Evidence
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Status:</span>
                    <span className={cn(
                      'px-2 py-1 rounded text-xs font-medium',
                      criterion.status === 'pass' && 'bg-green-100 text-green-700',
                      criterion.status === 'fail' && 'bg-red-100 text-red-700',
                      criterion.status === 'not_applicable' && 'bg-gray-100 text-gray-700'
                    )}>
                      {criterion.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Confidence Score:</span>
                    <span className="font-medium">{criterion.confidenceScore}%</span>
                  </div>
                  {criterion.needsVerification && (
                    <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-sm text-orange-800">
                      This criterion requires human verification
                    </div>
                  )}
                </div>
              </div>

              {wcagDocs && (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">Intent</h3>
                    <p className="text-sm text-blue-800">{wcagDocs.intent}</p>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="font-semibold text-green-900 mb-2">Who Benefits</h3>
                    <ul className="space-y-1">
                      {wcagDocs.benefits.map((benefit, idx) => (
                        <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {wcagDocs.commonIssues.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <h3 className="font-semibold text-yellow-900 mb-2">Common Issues</h3>
                      <ul className="space-y-1">
                        {wcagDocs.commonIssues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-yellow-800 flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              {'automatedChecks' in criterion && criterion.automatedChecks && criterion.automatedChecks.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Automated Checks</h3>
                  <ul className="space-y-2">
                    {criterion.automatedChecks.map((check: CriterionCheck) => (
                      <li key={check.id} className="flex items-start gap-2 text-sm">
                        {check.passed ? (
                          <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                        )}
                        <span className={cn(check.passed ? 'text-gray-700' : 'text-red-700')}>
                          {check.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {relatedIssues && relatedIssues.length > 0 && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-4">
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Related Issues ({relatedIssues.length})
                  </h3>
                  <p className="text-sm text-red-800 mb-2">
                    See the Issues tab for detailed information.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="issues" className="space-y-4 mt-0">
              {/* Summary Banner - Only show if there are actual issues */}
              {(() => {
                const pendingCount = relatedIssues?.length || 0;
                const fixedCount = remediatedIssues?.filter(isFixedStatus).length || 0;
                const failedCount = remediatedIssues?.filter(isFailedStatus).length || 0;
                const totalIssueCount = pendingCount + fixedCount + failedCount;
                
                if (totalIssueCount === 0) return null;
                
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">EPUB Audit Issues</h3>
                    <p className="text-sm text-blue-800">
                      {pendingCount > 0 && fixedCount > 0 ? (
                        <>{pendingCount} pending, {fixedCount} fixed{failedCount > 0 ? `, ${failedCount} failed` : ''}</>
                      ) : pendingCount > 0 ? (
                        <>Found {pendingCount} issue{pendingCount !== 1 ? 's' : ''} that need attention</>
                      ) : fixedCount > 0 ? (
                        <>{fixedCount} issue{fixedCount !== 1 ? 's' : ''} fixed{failedCount > 0 ? `, ${failedCount} failed` : ''}</>
                      ) : failedCount > 0 ? (
                        <>{failedCount} issue{failedCount !== 1 ? 's' : ''} failed remediation</>
                      ) : null}
                    </p>
                  </div>
                );
              })()}

              {/* Pending Issues Section */}
              {relatedIssues && relatedIssues.length > 0 && (
                <>
                  <div className="border-l-4 border-orange-400 pl-4">
                    <h4 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Pending Issues ({relatedIssues.length})
                    </h4>
                  </div>
                  <div className="space-y-3">
                    {relatedIssues.map((issue) => (
                      <div key={issue.issueId} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-gray-600">{issue.ruleId}</span>
                              <span className={cn(
                                'px-2 py-0.5 rounded-full text-xs font-medium',
                                issue.impact === 'critical' && 'bg-red-100 text-red-800',
                                issue.impact === 'serious' && 'bg-orange-100 text-orange-800',
                                issue.impact === 'moderate' && 'bg-yellow-100 text-yellow-800',
                                issue.impact === 'minor' && 'bg-gray-100 text-gray-800'
                              )}>
                                {issue.impact}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 mt-2">{issue.message}</p>
                          </div>
                        </div>

                        <div className="mt-3 bg-white rounded p-2">
                          <p className="text-xs text-gray-600 font-medium">Location:</p>
                          <p className="text-xs text-gray-800 font-mono">{issue.filePath}</p>
                          {issue.location && (
                            <p className="text-xs text-gray-500 mt-1">
                              Line {issue.location.startLine}
                              {issue.location.endLine && issue.location.endLine !== issue.location.startLine &&
                                `-${issue.location.endLine}`}
                            </p>
                          )}
                        </div>

                        {issue.htmlSnippet && (
                          <div className="mt-3">
                            <p className="text-xs text-gray-600 font-medium mb-1">HTML:</p>
                            <pre className="bg-gray-900 text-gray-100 p-2 rounded text-xs overflow-x-auto">
                              <code>{issue.htmlSnippet}</code>
                            </pre>
                          </div>
                        )}

                        {issue.xpath && (
                          <div className="mt-2">
                            <p className="text-xs text-gray-600 font-medium">XPath:</p>
                            <code className="text-xs text-purple-700 bg-purple-50 px-2 py-1 rounded">
                              {issue.xpath}
                            </code>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Remediated Issues Section - Filter by status */}
              {(() => {
                if (!remediatedIssues || remediatedIssues.length === 0) return null;
                
                const fixedIssues = remediatedIssues.filter(isFixedStatus);
                const failedIssues = remediatedIssues.filter(isFailedStatus);
                const skippedIssues = remediatedIssues.filter(isSkippedStatus);

                const formatDate = (dateStr?: string) => {
                  if (!dateStr) return 'Date unknown';
                  const date = new Date(dateStr);
                  return isNaN(date.getTime()) ? 'Date unknown' : date.toLocaleString();
                };

                return (
                  <>
                    {/* Fixed Issues */}
                    {fixedIssues.length > 0 && (
                      <>
                        <div className="border-l-4 border-green-400 pl-4 mt-6">
                          <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                            <Check className="h-4 w-4" />
                            Fixed Issues ({fixedIssues.length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {fixedIssues.map((issue, idx) => (
                            <div key={`fixed-${issue.ruleId}-${idx}`} className="border border-green-200 rounded-lg p-4 bg-green-50">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-sm text-gray-600">{issue.ruleId}</span>
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
                                      <Check className="h-3 w-3" />
                                      Fixed
                                    </span>
                                    {issue.remediationInfo?.method && (
                                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {issue.remediationInfo.method}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-gray-700 mt-2">{issue.message}</p>
                                </div>
                              </div>

                              <div className="mt-3 bg-white rounded p-2">
                                <p className="text-xs text-gray-600 font-medium">Location:</p>
                                <p className="text-xs text-gray-800 font-mono">{issue.filePath}</p>
                              </div>

                              {issue.remediationInfo?.description && (
                                <div className="mt-3 bg-green-100 rounded p-2">
                                  <p className="text-xs text-green-800 font-medium mb-1">What was fixed:</p>
                                  <p className="text-xs text-green-900">{issue.remediationInfo.description}</p>
                                </div>
                              )}

                              <div className="mt-2 text-xs text-gray-500">
                                Fixed on {formatDate(issue.remediationInfo?.completedAt)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Failed Issues */}
                    {failedIssues.length > 0 && (
                      <>
                        <div className="border-l-4 border-red-400 pl-4 mt-6">
                          <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4" />
                            Failed to Fix ({failedIssues.length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {failedIssues.map((issue, idx) => (
                            <div key={`failed-${issue.ruleId}-${idx}`} className="border border-red-200 rounded-lg p-4 bg-red-50">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-gray-600">{issue.ruleId}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                  Failed
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">{issue.message}</p>
                              {issue.remediationInfo?.description && (
                                <p className="text-xs text-red-700 mt-2">{issue.remediationInfo.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Skipped Issues */}
                    {skippedIssues.length > 0 && (
                      <>
                        <div className="border-l-4 border-gray-400 pl-4 mt-6">
                          <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            Skipped ({skippedIssues.length})
                          </h4>
                        </div>
                        <div className="space-y-3">
                          {skippedIssues.map((issue, idx) => (
                            <div key={`skipped-${issue.ruleId}-${idx}`} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm text-gray-600">{issue.ruleId}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  Skipped
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mt-2">{issue.message}</p>
                              {issue.remediationInfo?.description && (
                                <p className="text-xs text-gray-600 mt-2">{issue.remediationInfo.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                );
              })()}

              {/* View Remediation Changes CTA */}
              {jobId && (hasRemediationData || (relatedIssues && relatedIssues.length > 0)) && (hasRemediationData ? (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">View Remediation Changes</h4>
                      <p className="text-sm text-blue-800 mb-3">
                        See the actual before/after code changes made during EPUB remediation for issues related to this criterion.
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/epub/compare/${jobId}?criterion=${criterion.criterionId}`)}
                        className="w-full sm:w-auto"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View All Remediation Changes
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-yellow-900 mb-1">Remediation Pending</h4>
                      <p className="text-sm text-yellow-800">
                        These issues have not been remediated yet. Complete the EPUB remediation workflow first to see before/after code changes.
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* No Issues State */}
              {(!relatedIssues || relatedIssues.length === 0) && (!remediatedIssues || remediatedIssues.length === 0) && (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg font-medium mb-2">No Issues Found</p>
                  <p className="text-sm">
                    No EPUB audit issues were mapped to this criterion.
                    This could mean the content passes this criterion.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="testing" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">How to Meet This Criterion</h3>
                      <a
                        href={wcagDocs.howToMeet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        Official Guide <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>

                    {wcagDocs.howToMeet.techniques.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">WCAG Techniques:</h4>
                        <ul className="space-y-2">
                          {wcagDocs.howToMeet.techniques.map((technique) => (
                            <li key={technique.id} className="text-sm flex items-start gap-2">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-mono flex-shrink-0">
                                {technique.id}
                              </span>
                              <span className="text-gray-700">{technique.title}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {wcagDocs.howToMeet.epubSpecific.length > 0 && (
                      <div className="bg-purple-50 border border-purple-200 rounded p-3">
                        <h4 className="text-sm font-medium text-purple-900 mb-2">EPUB-Specific Guidance:</h4>
                        <ul className="space-y-1">
                          {wcagDocs.howToMeet.epubSpecific.map((guidance, idx) => (
                            <li key={idx} className="text-sm text-purple-800 flex items-start gap-2">
                              <Book className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                              {guidance}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Testing Procedures</h3>

                    {wcagDocs.testingProcedure.automated.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Automated Testing:</h4>
                        <ul className="space-y-1">
                          {wcagDocs.testingProcedure.automated.map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-blue-500 mt-0.5 flex-shrink-0">•</span>
                              {step}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {wcagDocs.testingProcedure.manual.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Testing:</h4>
                        <ol className="space-y-1">
                          {wcagDocs.testingProcedure.manual.map((step, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <span className="text-gray-500 font-medium flex-shrink-0">{idx + 1}.</span>
                              {step}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {wcagDocs.testingProcedure.tools.length > 0 && (
                      <div className="bg-gray-50 rounded p-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Recommended Tools:</h4>
                        <div className="flex flex-wrap gap-2">
                          {wcagDocs.testingProcedure.tools.map((tool, idx) => (
                            <span key={idx} className="px-2 py-1 bg-white border rounded text-xs text-gray-700">
                              {tool}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {'manualChecks' in criterion && criterion.manualChecks && criterion.manualChecks.length > 0 && (
                    <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
                      <h3 className="font-semibold text-orange-900 mb-3">Manual Checks Needed</h3>
                      <ul className="space-y-2">
                        {criterion.manualChecks.map((check: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-orange-800">
                            <span className="text-orange-500 mt-0.5">•</span>
                            {check}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No testing guidance available for this criterion.
                </div>
              )}
            </TabsContent>

            <TabsContent value="remediation" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Code Example</h3>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-red-600">BEFORE (Incorrect)</span>
                        </div>
                        <pre className="bg-red-50 border border-red-200 rounded p-3 text-xs overflow-x-auto">
                          <code className="text-red-900">{wcagDocs.remediationGuidance.before}</code>
                        </pre>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-green-600">AFTER (Correct)</span>
                        </div>
                        <pre className="bg-green-50 border border-green-200 rounded p-3 text-xs overflow-x-auto">
                          <code className="text-green-900">{wcagDocs.remediationGuidance.after}</code>
                        </pre>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <p className="text-sm text-blue-900">
                          <span className="font-medium">Explanation:</span> {wcagDocs.remediationGuidance.explanation}
                        </p>
                      </div>
                    </div>
                  </div>

                  {wcagDocs.understanding.resources.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Additional Resources</h3>
                      <ul className="space-y-2">
                        {wcagDocs.understanding.resources.map((resource, idx) => (
                          <li key={idx}>
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-2"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {resource.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {wcagDocs.understanding.examples.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h3 className="font-semibold text-gray-900 mb-3">Examples</h3>
                      <div className="space-y-3">
                        {wcagDocs.understanding.examples.map((example, idx) => (
                          <div key={idx} className="bg-gray-50 rounded p-3">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{example.title}</h4>
                            <p className="text-sm text-gray-600">{example.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No remediation guidance available for this criterion.
                </div>
              )}
            </TabsContent>

            <TabsContent value="wcag" className="space-y-4 mt-0">
              {wcagDocs ? (
                <>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-3">Official W3C Documentation</h3>
                    <p className="text-sm text-blue-800 mb-3">
                      Click the links below to view the official WCAG documentation in a new tab.
                    </p>
                    <div className="space-y-3">
                      <a
                        href={wcagDocs.wcagUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 p-3 bg-white rounded border hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">Understanding {wcagDocs.number} - {wcagDocs.name}</div>
                          <div className="text-xs text-gray-500">Detailed explanation of the success criterion</div>
                        </div>
                      </a>
                      <a
                        href={wcagDocs.howToMeet.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 p-3 bg-white rounded border hover:border-blue-300 transition-colors"
                      >
                        <ExternalLink className="h-5 w-5 flex-shrink-0" />
                        <div>
                          <div className="font-medium">How to Meet {wcagDocs.number}</div>
                          <div className="text-xs text-gray-500">Sufficient techniques and common failures</div>
                        </div>
                      </a>
                    </div>
                  </div>

                  {/* Quick Reference Card */}
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Quick Reference</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Success Criterion:</span>
                        <span className="font-medium">{wcagDocs.number}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Level:</span>
                        <span className={cn(
                          'px-2 py-0.5 rounded text-xs font-medium',
                          wcagDocs.level === 'A' && 'bg-blue-100 text-blue-700',
                          wcagDocs.level === 'AA' && 'bg-purple-100 text-purple-700',
                          wcagDocs.level === 'AAA' && 'bg-indigo-100 text-indigo-700'
                        )}>
                          Level {wcagDocs.level}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Conformance:</span>
                        <span className="font-medium">WCAG 2.1</span>
                      </div>
                    </div>
                  </div>

                  {/* Why External Links */}
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <p className="text-xs text-gray-600">
                      <span className="font-medium">Note:</span> WCAG documentation opens in new tabs for security reasons.
                      The W3C prevents embedding their content in other websites to protect against clickjacking attacks.
                    </p>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No WCAG documentation available for this criterion.
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex justify-between items-center gap-2 pt-4 border-t mt-4">
          <div className="flex-1">
            {wcagDocs && (
              <span className="text-xs text-gray-500">
                Applicable to: {wcagDocs.applicableToEpub && 'EPUB'} {wcagDocs.applicableToEpub && wcagDocs.applicableToPdf && ' • '} {wcagDocs.applicableToPdf && 'PDF'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {mode === 'interactive' && criterion.needsVerification && onVerifyClick && (
              <Button
                variant="primary"
                onClick={() => {
                  onVerifyClick(criterion.criterionId);
                  onClose();
                }}
              >
                Verify This Criterion
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
