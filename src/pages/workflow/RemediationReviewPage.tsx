import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, FileText, AlertTriangle } from 'lucide-react';
import { workflowService, type WorkflowStatus } from '@/services/workflowService';
import { api } from '@/services/api';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

interface RemediationTask {
  id: string;
  issueCode: string;
  issueMessage: string;
  type: 'auto' | 'quickfix' | 'manual';
  status: string;
  severity: string;
  location?: string;
  wcagCriteria?: string[];
}

interface RemediationPlan {
  id: string;
  jobId: string;
  tasks: RemediationTask[];
  createdAt: string;
}

interface RemediationItem {
  id: string;
  issueCode: string;
  description: string;
  beforeValue?: string;
  afterValue?: string;
  status: 'fixed' | 'failed' | 'manual';
  type?: string;
  location?: string;
  wcagCriteria?: string[];
}

export function RemediationReviewPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [items, setItems] = useState<RemediationItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    loadWorkflowData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  async function loadWorkflowData() {
    try {
      setLoading(true);
      const workflowData = await workflowService.getWorkflowStatus(workflowId!);
      setWorkflow(workflowData);

      // Extract job ID from workflow state
      const stateData = workflowData.stateData as {
        jobId?: string;
        totalIssuesFixed?: number;
        totalIssuesFailed?: number;
        remediatedFileName?: string;
        remediatedFilePath?: string;
      };

      if (!stateData.jobId) {
        throw new Error('No job ID found in workflow state');
      }

      // Fetch the remediation plan to get all tasks (auto, quickfix, manual)
      const response = await api.get<{ data: RemediationPlan }>(`/epub/job/${stateData.jobId}/remediation`);
      const plan = response.data.data;

      // Convert tasks to display items
      const displayItems: RemediationItem[] = [];

      // Auto tasks that were processed
      const autoTasks = plan.tasks.filter(t => t.type === 'auto');
      autoTasks.forEach((task) => {
        displayItems.push({
          id: task.id,
          issueCode: task.issueCode,
          description: task.issueMessage,
          status: 'fixed',
          type: 'auto',
          location: task.location,
          wcagCriteria: task.wcagCriteria,
        });
      });

      // Manual and quickfix tasks that require attention
      const manualTasks = plan.tasks.filter(t => t.type === 'manual' || t.type === 'quickfix');
      manualTasks.forEach((task) => {
        displayItems.push({
          id: task.id,
          issueCode: task.issueCode,
          description: task.issueMessage,
          status: 'manual',
          type: task.type,
          location: task.location,
          wcagCriteria: task.wcagCriteria,
        });
      });

      setItems(displayItems);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load remediation results');
    } finally {
      setLoading(false);
    }
  }

  async function handleAcceptAll() {
    try {
      setSubmitting(true);

      // Submit remediation review acceptance to backend
      await workflowService.submitRemediationReview(workflowId!);

      toast.success('Remediation review accepted! Workflow continuing...');
      // Return to batch dashboard so the reviewer can process the next file
      if (workflow?.batchId) {
        navigate(`/workflow/batch/${workflow.batchId}`);
      } else {
        navigate(`/workflow/${workflowId}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          onClick={() => navigate(`/workflow/${workflowId}`)}
        >
          Back to Workflow
        </Button>
        <Alert variant="error" title="Failed to load remediation review">
          {error}
        </Alert>
      </div>
    );
  }

  const stateData = workflow?.stateData as {
    totalIssuesFixed?: number;
    totalIssuesFailed?: number;
    remediatedFileName?: string;
  };

  const fixedCount = items.filter(i => i.status === 'fixed').length;
  const manualCount = items.filter(i => i.status === 'manual').length;
  const totalCount = items.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() =>
              workflow?.batchId
                ? navigate(`/workflow/batch/${workflow.batchId}`)
                : navigate(`/workflow/${workflowId}`)
            }
          >
            {workflow?.batchId ? 'Back to Batch' : 'Back'}
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Remediation Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review the automated accessibility fixes
            </p>
          </div>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Auto-Remediation Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{totalCount}</div>
              <div className="text-sm text-blue-600">Total Issues</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{fixedCount}</div>
              <div className="text-sm text-green-600">Auto-Fixed</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-700">{manualCount}</div>
              <div className="text-sm text-orange-600">Manual Required</div>
            </div>
          </div>

          {stateData?.remediatedFileName && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Remediated File
                </div>
                <div className="text-xs text-gray-500">
                  {stateData.remediatedFileName}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remediation Items */}
      {items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Remediation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    item.status === 'fixed'
                      ? 'border-green-200 bg-green-50'
                      : 'border-orange-200 bg-orange-50'
                  }`}
                >
                  {item.status === 'fixed' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        {item.issueCode}
                      </span>
                      {item.type && (
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            item.type === 'auto'
                              ? 'bg-green-100 text-green-700'
                              : item.type === 'quickfix'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {item.type === 'auto'
                            ? 'Auto-Fixed'
                            : item.type === 'quickfix'
                            ? 'Quick Fix Required'
                            : 'Manual Fix Required'}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {item.description}
                    </div>
                    {item.location && (
                      <div className="text-xs text-gray-500">
                        Location: {item.location}
                      </div>
                    )}
                    {item.wcagCriteria && item.wcagCriteria.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        WCAG: {item.wcagCriteria.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Ready to continue?</h3>
              <p className="text-sm text-gray-500 mt-1">
                {manualCount > 0
                  ? `${fixedCount} issue${fixedCount !== 1 ? 's' : ''} automatically fixed. ${manualCount} issue${manualCount !== 1 ? 's' : ''} require manual attention and will be addressed in later phases.`
                  : `All ${fixedCount} issue${fixedCount !== 1 ? 's have' : ' has'} been automatically fixed.`}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              isLoading={submitting}
              rightIcon={<CheckCircle2 className="w-5 h-5" />}
              onClick={handleAcceptAll}
            >
              Accept & Continue
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
