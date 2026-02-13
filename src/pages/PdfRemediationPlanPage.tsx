/**
 * PDF Remediation Plan Page
 *
 * Displays remediation tasks grouped by fix type with guidance and actions
 */

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Loader2,
  ArrowLeft,
  Sparkles,
  Zap,
  Wrench,
  Info,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useRemediationPlan } from '@/hooks/usePdfRemediation';
import { pdfRemediationService } from '@/services/pdf-remediation.service';
import { QuickFixModal } from '@/components/pdf/QuickFixModal';
// import { cn } from '@/utils/cn'; // Unused for now

export const PdfRemediationPlanPage: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { data: plan, isLoading, error, refetch } = useRemediationPlan(jobId);

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['auto', 'quick', 'manual'])
  );
  const [isAutoFixing, setIsAutoFixing] = useState(false);
  const [autoFixResult, setAutoFixResult] = useState<{
    success: boolean;
    fileUrl?: string;
    completedTasks: number;
  } | null>(null);
  const [quickFixModalState, setQuickFixModalState] = useState<{
    isOpen: boolean;
    task: {
      id: string;
      issueId: string;
      issueCode: string;
      description: string;
    } | null;
  }>({
    isOpen: false,
    task: null,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleAutoFix = async () => {
    if (!jobId) return;

    // Clear previous result to prevent stale success banner
    setAutoFixResult(null);

    setIsAutoFixing(true);
    const toastId = toast.loading('Running auto-remediation...');

    try {
      const result = await pdfRemediationService.executeAutoRemediation(jobId);

      console.log('[Auto-fix] Result:', result);

      if (result.completedTasks > 0) {
        toast.success(
          `Successfully fixed ${result.completedTasks} issue${result.completedTasks === 1 ? '' : 's'}!`,
          { id: toastId }
        );

        setAutoFixResult({
          success: true,
          fileUrl: result.remediatedFileUrl,
          completedTasks: result.completedTasks,
        });

        // Refetch the plan to update counts
        refetch();
      } else if (result.completedTasks === 0 && result.skippedTasks > 0) {
        toast(
          `Skipped ${result.skippedTasks} task${result.skippedTasks === 1 ? '' : 's'} (no handler available). PDF was processed successfully.`,
          {
            id: toastId,
            icon: '⚠️',
            duration: 6000,
          }
        );
        // Refetch the plan to update task statuses
        refetch();
      } else if (result.completedTasks === 0) {
        toast('No auto-fixable issues were found', {
          id: toastId,
          icon: 'ℹ️',
        });
      } else {
        toast.error(result.error || 'Auto-remediation failed', { id: toastId });
      }
    } catch (err) {
      console.error('Auto-fix error:', err);
      const error = err as {
        response?: {
          data?: {
            error?: { message?: string; code?: string }
          }
        };
        message?: string;
      };
      console.error('Error response:', error.response?.data);

      // Extract error message from backend response
      const errorData = error.response?.data?.error;
      const message = errorData?.message || error.message || 'Failed to run auto-remediation';
      const errorCode = errorData?.code;

      toast.error(`${message}${errorCode ? ` (${errorCode})` : ''}`, { id: toastId });
    } finally {
      setIsAutoFixing(false);
    }
  };

  const handleDownloadRemediatedPDF = () => {
    if (autoFixResult?.fileUrl) {
      const newWindow = window.open(autoFixResult.fileUrl, '_blank', 'noopener,noreferrer');
      // Set opener to null for older browsers to prevent tabnabbing
      if (newWindow) {
        newWindow.opener = null;
      }
    }
  };

  /**
   * Determine which field the quick-fix modal should show based on issue code
   * Returns null if the issue is not supported by the quick-fix API
   */
  const getFixField = (issueCode: string): 'language' | 'title' | 'metadata' | 'creator' | null => {
    // Normalize to uppercase for consistent matching
    const code = issueCode.toUpperCase();

    // Language issues
    if (code.includes('LANGUAGE') || code === 'MATTERHORN-11-001') {
      return 'language';
    }

    // Title issues
    if (code.includes('TITLE') || code === 'WCAG-2.4.2') {
      return 'title';
    }

    // Metadata issues
    if (code.includes('METADATA') || code.includes('MARKED') || code === 'MATTERHORN-07-001') {
      return 'metadata';
    }

    // Creator issues
    if (code.includes('CREATOR') || code.includes('PRODUCER')) {
      return 'creator';
    }

    // Unsupported issue type - should not show Quick Fix button
    console.warn(`Quick-fix not supported for issue code: ${issueCode}`);
    return null;
  };

  const handleOpenQuickFixModal = (task: typeof quickFixTasks[0]) => {
    setQuickFixModalState({
      isOpen: true,
      task: {
        id: task.id,
        issueId: task.issueId,
        issueCode: task.issueCode,
        description: task.description,
      },
    });
  };

  const handleCloseQuickFixModal = () => {
    setQuickFixModalState({
      isOpen: false,
      task: null,
    });
  };

  const handleQuickFixSuccess = (remediatedFileUrl: string) => {
    console.log('Quick fix applied, remediated file:', remediatedFileUrl);
    // Refetch the plan to update task statuses
    refetch();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-12 w-12 animate-spin text-primary-600" />
              <span className="text-gray-600 text-lg">Loading remediation plan...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Breadcrumbs
          items={[
            { label: 'PDF Accessibility', path: '/pdf' },
            { label: 'Audit Results', path: `/pdf/audit/${jobId}` },
            { label: 'Remediation Plan' },
          ]}
        />
        <Alert variant="error" className="mt-6">
          Failed to load remediation plan. {error instanceof Error ? error.message : 'Unknown error'}
        </Alert>
        <Button variant="primary" onClick={() => navigate(`/pdf/audit/${jobId}`)} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Audit Results
        </Button>
      </div>
    );
  }

  if (!plan) {
    return null;
  }

  const autoFixableTasks = plan.tasks.filter(t => t.type === 'AUTO_FIXABLE');
  const quickFixTasks = plan.tasks.filter(t => t.type === 'QUICK_FIX');
  const manualTasks = plan.tasks.filter(t => t.type === 'MANUAL');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Breadcrumbs
        items={[
          { label: 'PDF Accessibility', path: '/pdf' },
          { label: 'Audit Results', path: `/pdf/audit/${jobId}` },
          { label: 'Remediation Plan' },
        ]}
      />

      <div className="mt-6 space-y-6">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>PDF Remediation Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">File:</p>
                <p className="font-medium text-gray-900">{plan.fileName}</p>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Total Issues</p>
                  <p className="text-2xl font-bold text-gray-900">{plan.totalIssues}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-900 mb-1">Auto-fixable</p>
                  <p className="text-2xl font-bold text-green-600">
                    {plan.autoFixableCount}
                    {(plan as typeof plan & { completedAutoFixCount?: number }).completedAutoFixCount! > 0 && (
                      <span className="text-sm text-green-700 ml-2">
                        ({(plan as typeof plan & { completedAutoFixCount?: number }).completedAutoFixCount} fixed)
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-900 mb-1">Quick-fix</p>
                  <p className="text-2xl font-bold text-blue-600">{plan.quickFixCount}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-900 mb-1">Manual</p>
                  <p className="text-2xl font-bold text-orange-600">{plan.manualFixCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Auto-fixable Section */}
        <Card className="border-2 border-green-200">
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('auto')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-green-600" />
                <div>
                  <CardTitle className="text-green-900">
                    Auto-fixable Issues ({plan.autoFixableCount})
                  </CardTitle>
                  <p className="text-sm text-green-700 mt-1">
                    Can be fixed automatically without user input
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={plan.autoFixableCount === 0 || isAutoFixing}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAutoFix();
                  }}
                >
                  {isAutoFixing ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Fixing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Fix Automatically
                    </>
                  )}
                </Button>
                {expandedSections.has('auto') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedSections.has('auto') && (
            <CardContent>
              {/* Success alert with download */}
              {autoFixResult?.success && (
                <Alert variant="success" className="mb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium">Auto-remediation completed!</p>
                      <p className="text-sm mt-1">
                        Successfully fixed {autoFixResult.completedTasks} issue{autoFixResult.completedTasks === 1 ? '' : 's'}.
                        Your remediated PDF is ready for download.
                      </p>
                    </div>
                    {autoFixResult.fileUrl && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleDownloadRemediatedPDF}
                        className="ml-4"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download PDF
                      </Button>
                    )}
                  </div>
                </Alert>
              )}

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-green-900">
                    <p className="font-medium mb-2">What are auto-fixable issues?</p>
                    <p className="mb-2">
                      These are metadata-related issues that don't affect content and can be fixed automatically:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Missing document language:</strong> Adds language declaration (e.g., "en" for English)</li>
                      <li><strong>Missing document title:</strong> Extracts title from first heading or filename</li>
                      <li><strong>Missing metadata:</strong> Adds required accessibility metadata fields</li>
                      <li><strong>Empty heading tags:</strong> Removes or fixes empty structural elements</li>
                    </ul>
                    <p className="mt-3 text-xs text-green-800">
                      💡 These fixes are safe and reversible. A backup will be created before modifications.
                    </p>
                  </div>
                </div>
              </div>

              {autoFixableTasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Issues to be fixed:</p>
                  {autoFixableTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded">
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{task.issueCode}</p>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <Badge variant="success" size="sm">Auto</Badge>
                    </div>
                  ))}
                  {autoFixableTasks.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + {autoFixableTasks.length - 10} more issues
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No auto-fixable issues found</p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Quick-fix Section */}
        <Card className="border-2 border-blue-200">
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('quick')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Zap className="h-6 w-6 text-blue-600" />
                <div>
                  <CardTitle className="text-blue-900">
                    Quick-fix Issues ({plan.quickFixCount})
                  </CardTitle>
                  <p className="text-sm text-blue-700 mt-1">
                    Require user input through guided workflow
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {(() => {
                  // Compute the first fixable pending task
                  const firstFixable = quickFixTasks.find(t =>
                    t.status === 'PENDING' && getFixField(t.issueCode) !== null
                  );

                  return (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={!firstFixable || plan.quickFixCount === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (firstFixable) {
                          handleOpenQuickFixModal(firstFixable);
                        }
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Start Quick Fix
                    </Button>
                  );
                })()}
                {expandedSections.has('quick') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedSections.has('quick') && (
            <CardContent>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium mb-2">What are quick-fix issues?</p>
                    <p className="mb-2">
                      These issues require content decisions but can be fixed through our guided interface:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Images without alt text:</strong> You'll provide descriptive text for each image</li>
                      <li><strong>Tables without headers:</strong> You'll identify which cells are headers</li>
                      <li><strong>Tables without summary:</strong> You'll provide a brief description of the table</li>
                      <li><strong>Links without text:</strong> You'll provide descriptive link text</li>
                      <li><strong>Form fields without labels:</strong> You'll provide labels for form controls</li>
                    </ul>
                    <p className="mt-3 text-xs text-blue-800">
                      💡 The workflow guides you through each issue with visual context and suggestions.
                    </p>
                  </div>
                </div>
              </div>

              {quickFixTasks.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700 mb-3">Individual tasks:</p>
                  {quickFixTasks.slice(0, 10).map((task) => (
                    <div key={task.id} className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded">
                      <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{task.issueCode}</p>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="info" size="sm">Quick Fix</Badge>
                        {task.status === 'PENDING' && (() => {
                          const fixField = getFixField(task.issueCode);

                          // Only render button if we have a supported fix field
                          if (!fixField) {
                            return (
                              <span className="text-xs text-gray-500 italic">
                                Quick-fix not available for this issue type
                              </span>
                            );
                          }

                          return (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleOpenQuickFixModal(task)}
                            >
                              <Zap className="h-3 w-3 mr-1" />
                              Fix
                            </Button>
                          );
                        })()}
                        {task.status === 'COMPLETED' && (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {quickFixTasks.length > 10 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + {quickFixTasks.length - 10} more tasks
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No quick-fix issues found</p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Manual Section */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="cursor-pointer" onClick={() => toggleSection('manual')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wrench className="h-6 w-6 text-orange-600" />
                <div>
                  <CardTitle className="text-orange-900">
                    Manual Issues ({plan.manualFixCount})
                  </CardTitle>
                  <p className="text-sm text-orange-700 mt-1">
                    Require manual intervention in PDF editor
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {expandedSections.has('manual') ? (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
          {expandedSections.has('manual') && (
            <CardContent>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-orange-900">
                    <p className="font-medium mb-2">What are manual issues?</p>
                    <p className="mb-2">
                      These are complex issues that require using a PDF editor like Adobe Acrobat Pro:
                    </p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li><strong>Untagged PDFs:</strong> Entire document needs to be tagged using Acrobat's auto-tag feature</li>
                      <li><strong>Reading order problems:</strong> Requires reordering content tags in the Tags panel</li>
                      <li><strong>Heading hierarchy issues:</strong> Need to adjust heading levels throughout document</li>
                      <li><strong>Complex table structure:</strong> May need to rebuild table structure with proper rows/columns</li>
                      <li><strong>Color contrast failures:</strong> Requires changing text or background colors</li>
                      <li><strong>List structure issues:</strong> Need to properly tag lists in the Tags panel</li>
                    </ul>
                    <p className="mt-3 text-xs text-orange-800">
                      💡 We provide detailed guidance for each issue type. Consider using Adobe Acrobat Pro or PAC 2024 for remediation.
                    </p>
                  </div>
                </div>
              </div>

              {manualTasks.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700 mb-3">
                    Issues grouped by type:
                  </p>

                  {/* Group by issue code */}
                  {Object.entries(
                    manualTasks.reduce((acc, task) => {
                      const code = task.issueCode;
                      if (!acc[code]) acc[code] = [];
                      acc[code].push(task);
                      return acc;
                    }, {} as Record<string, typeof manualTasks>)
                  ).map(([code, tasks]) => (
                    <div key={code} className="border border-gray-200 rounded-lg p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Wrench className="h-4 w-4 text-orange-600" />
                          <p className="font-medium text-gray-900">{code}</p>
                          <Badge variant="warning" size="sm">{tasks.length} issues</Badge>
                        </div>
                        <Badge variant="error" size="sm">Manual</Badge>
                      </div>
                      <p className="text-sm text-gray-600 ml-6">{tasks[0].description}</p>
                    </div>
                  )).slice(0, 5)}

                  {Object.keys(manualTasks.reduce((acc, task) => {
                    acc[task.issueCode] = true;
                    return acc;
                  }, {} as Record<string, boolean>)).length > 5 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      + more issue types
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-4">No manual issues found</p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button variant="outline" onClick={() => navigate(`/pdf/audit/${jobId}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Audit Results
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Export plan as PDF
                alert('Export feature coming soon');
              }}
            >
              Export Plan
            </Button>
            <Button
              variant="primary"
              disabled={plan.autoFixableCount === 0 && plan.quickFixCount === 0}
              onClick={() => {
                // TODO: Start remediation workflow
                alert('Remediation workflow will be implemented in next phase');
              }}
            >
              Start Remediation
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Fix Modal */}
      {quickFixModalState.task && (() => {
        const fixField = getFixField(quickFixModalState.task.issueCode);

        // Only render modal if the issue has a supported fix field
        if (!fixField) {
          return null;
        }

        return (
          <QuickFixModal
            isOpen={quickFixModalState.isOpen}
            onClose={handleCloseQuickFixModal}
            jobId={jobId!}
            issueId={quickFixModalState.task.issueId}
            issueCode={quickFixModalState.task.issueCode}
            issueDescription={quickFixModalState.task.description}
            fixField={fixField}
            onSuccess={handleQuickFixSuccess}
          />
        );
      })()}
    </div>
  );
};

export default PdfRemediationPlanPage;
