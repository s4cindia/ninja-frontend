import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ChevronLeft, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';
import { workflowService, type WorkflowStatus } from '@/services/workflowService';
import { jobsService } from '@/services/jobs.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/services/api';

interface AuditIssue {
  id: string;
  code: string;
  message: string;
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  location?: string;
  source: string;
}

interface ReviewDecision {
  itemId: string;
  decision: 'ACCEPT' | 'REJECT' | 'MODIFY';
  justification?: string;
}

const SEVERITY_CONFIG = {
  critical: {
    label: 'Critical',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: XCircle,
  },
  serious: {
    label: 'Serious',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: AlertTriangle,
  },
  moderate: {
    label: 'Moderate',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    icon: AlertTriangle,
  },
  minor: {
    label: 'Minor',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Info,
  },
};

export function AIReviewPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [issues, setIssues] = useState<AuditIssue[]>([]);
  const [decisions, setDecisions] = useState<Map<string, ReviewDecision>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);

        // Fetch workflow
        const workflowData = await workflowService.getWorkflowStatus(workflowId!);
        if (cancelled) return;
        setWorkflow(workflowData);

        // Get jobId from workflow state
        const stateData = workflowData.stateData as { jobId?: string } | undefined;
        if (!stateData?.jobId) {
          throw new Error('Job ID not found in workflow state');
        }

        // Fetch job to get audit results
        const job = await jobsService.getJob(stateData.jobId);
        if (cancelled) return;

        // Extract issues from job output
        const output = job.output as { combinedIssues?: unknown[]; issues?: unknown[] } | undefined;
        const rawIssues = output?.combinedIssues || output?.issues || [];

        // Map issues to our format
        const mappedIssues: AuditIssue[] = rawIssues.map((issue: unknown, idx) => {
          const i = issue as Record<string, unknown>;
          return {
            id: (i.id as string) || `issue-${idx}`,
            code: (i.code as string) || (i.errorCode as string) || 'UNKNOWN',
            message: (i.message as string) || (i.description as string) || 'No description',
            severity: ((i.severity as AuditIssue['severity']) || (i.impact as AuditIssue['severity']) || 'moderate'),
            location: (i.location as string) || (i.file as string) || (i.xpath as string),
            source: (i.source as string) || 'audit',
          };
        });

        setIssues(mappedIssues);

        // Initialize all decisions as ACCEPT by default
        const initialDecisions = new Map<string, ReviewDecision>();
        mappedIssues.forEach(issue => {
          initialDecisions.set(issue.id, {
            itemId: issue.id,
            decision: 'ACCEPT',
            justification: '',
          });
        });
        setDecisions(initialDecisions);

        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('[AIReviewPage] Failed to load data:', err);
        setError(getErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, [workflowId]);

  const handleDecisionChange = (issueId: string, decision: 'ACCEPT' | 'REJECT' | 'MODIFY') => {
    setDecisions(prev => {
      const updated = new Map(prev);
      const current = updated.get(issueId);
      if (current) {
        updated.set(issueId, { ...current, decision });
      }
      return updated;
    });
  };

  const handleJustificationChange = (issueId: string, justification: string) => {
    setDecisions(prev => {
      const updated = new Map(prev);
      const current = updated.get(issueId);
      if (current) {
        updated.set(issueId, { ...current, justification });
      }
      return updated;
    });
  };

  const handleAcceptAll = () => {
    setDecisions(prev => {
      const updated = new Map(prev);
      updated.forEach((value, key) => {
        updated.set(key, { ...value, decision: 'ACCEPT' });
      });
      return updated;
    });
    toast.success('All issues accepted');
  };

  const handleRejectAll = () => {
    setDecisions(prev => {
      const updated = new Map(prev);
      updated.forEach((value, key) => {
        updated.set(key, { ...value, decision: 'REJECT' });
      });
      return updated;
    });
    toast.success('All issues rejected');
  };

  const handleSubmit = async () => {
    if (!workflowId) return;

    try {
      setSubmitting(true);

      // Validate MODIFY decisions require justification
      const modifyWithoutJustification = Array.from(decisions.values()).filter(
        d => d.decision === 'MODIFY' && !d.justification?.trim()
      );
      if (modifyWithoutJustification.length > 0) {
        toast.error(`${modifyWithoutJustification.length} "Modify" decision${modifyWithoutJustification.length !== 1 ? 's' : ''} require a justification.`);
        setSubmitting(false);
        return;
      }

      const decisionsArray = Array.from(decisions.values()).map(d => ({
        itemId: d.itemId,
        decision: d.decision,
        justification: d.justification || undefined,
      }));

      await workflowService.submitAIReview(workflowId, decisionsArray);

      toast.success('AI Review submitted successfully!');

      // Navigate back to workflow page
      navigate(`/workflow/${workflowId}`);
    } catch (err) {
      console.error('[AIReviewPage] Failed to submit review:', err);
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="error" title="Failed to load AI Review">
          {error}
        </Alert>
        <Button
          variant="outline"
          className="mt-4"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => navigate(`/workflow/${workflowId}`)}
        >
          Back to Workflow
        </Button>
      </div>
    );
  }

  if (!workflow) {
    return null;
  }

  const acceptedCount = Array.from(decisions.values()).filter(d => d.decision === 'ACCEPT').length;
  const rejectedCount = Array.from(decisions.values()).filter(d => d.decision === 'REJECT').length;
  const modifiedCount = Array.from(decisions.values()).filter(d => d.decision === 'MODIFY').length;

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ChevronLeft className="w-4 h-4" />}
          onClick={() => navigate(`/workflow/${workflowId}`)}
          className="mb-4"
        >
          Back to Workflow
        </Button>

        <h1 className="text-3xl font-bold text-gray-900">AI Review</h1>
        <p className="text-gray-600 mt-2">
          Review and validate AI-detected accessibility issues
        </p>
      </div>

      {/* Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Review Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Total Issues</p>
              <p className="text-2xl font-bold text-gray-900">{issues.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{acceptedCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Modified</p>
              <p className="text-2xl font-bold text-blue-600">{modifiedCount}</p>
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAcceptAll}
              disabled={submitting}
            >
              Accept All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRejectAll}
              disabled={submitting}
            >
              Reject All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <div className="space-y-4 mb-6">
        {issues.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
                <p className="text-lg font-medium">No issues found</p>
                <p className="text-sm">This document passed all accessibility checks!</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          issues.map((issue, index) => {
            const decision = decisions.get(issue.id);
            const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.moderate;
            const Icon = config.icon;

            return (
              <Card
                key={issue.id}
                className={`border-l-4 ${config.borderColor} ${
                  decision?.decision === 'ACCEPT' ? 'bg-green-50' :
                  decision?.decision === 'REJECT' ? 'bg-red-50' :
                  ''
                }`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Issue Number & Icon */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                    </div>

                    {/* Issue Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500">
                          #{index + 1}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                          {issue.code}
                        </span>
                      </div>

                      <p className="text-sm font-medium text-gray-900 mb-2">
                        {issue.message}
                      </p>

                      {issue.location && (
                        <p className="text-xs text-gray-500 mb-3">
                          Location: {issue.location}
                        </p>
                      )}

                      {/* Decision Buttons */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Button
                          size="sm"
                          variant={decision?.decision === 'ACCEPT' ? 'primary' : 'outline'}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                          onClick={() => handleDecisionChange(issue.id, 'ACCEPT')}
                          disabled={submitting}
                        >
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant={decision?.decision === 'REJECT' ? 'danger' : 'outline'}
                          leftIcon={<XCircle className="w-4 h-4" />}
                          onClick={() => handleDecisionChange(issue.id, 'REJECT')}
                          disabled={submitting}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant={decision?.decision === 'MODIFY' ? 'secondary' : 'outline'}
                          leftIcon={<AlertTriangle className="w-4 h-4" />}
                          onClick={() => handleDecisionChange(issue.id, 'MODIFY')}
                          disabled={submitting}
                        >
                          Modify
                        </Button>
                      </div>

                      {/* Justification Input (for REJECT/MODIFY) */}
                      {decision && (decision.decision === 'REJECT' || decision.decision === 'MODIFY') && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Justification {decision.decision === 'REJECT' ? '(recommended)' : '(required)'}
                          </label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                            rows={2}
                            placeholder="Explain your decision..."
                            value={decision.justification || ''}
                            onChange={(e) => handleJustificationChange(issue.id, e.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Submit Button */}
      <div className="sticky bottom-0 bg-white border-t border-gray-200 py-4 mt-8">
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/workflow/${workflowId}`)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={issues.length === 0}
          >
            Submit Review ({issues.length} issue{issues.length !== 1 ? 's' : ''})
          </Button>
        </div>
      </div>
    </div>
  );
}
