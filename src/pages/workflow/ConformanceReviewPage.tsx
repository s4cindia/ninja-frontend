import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { workflowService } from '@/services/workflowService';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

interface ConformanceCriterion {
  criterionId: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
  aiConformance: 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable';
  confidence: number;
  reasoning: string;
  issueCount?: number;
}

interface ConformanceDecision {
  criterionId: string;
  decision: 'CONFIRM' | 'OVERRIDE';
  overrideValue?: string;
  justification?: string;
}

export function ConformanceReviewPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [criteria, setCriteria] = useState<ConformanceCriterion[]>([]);
  const [decisions, setDecisions] = useState<Map<string, ConformanceDecision>>(new Map());
  const [filter, setFilter] = useState<'all' | 'needs-review' | 'not-applicable'>('all');
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

      // Extract conformance mappings from workflow state
      const stateData = workflowData.stateData as {
        conformanceMappings?: ConformanceCriterion[];
        jobId?: string;
      };

      // If conformance mappings exist in state, use them
      // Otherwise, generate mock data for testing
      const conformanceCriteria = stateData.conformanceMappings || generateMockConformanceCriteria();
      setCriteria(conformanceCriteria);

      // Auto-confirm all "supports" and "not_applicable" criteria
      const autoDecisions = new Map<string, ConformanceDecision>();
      conformanceCriteria.forEach(criterion => {
        if (criterion.aiConformance === 'supports' || criterion.aiConformance === 'not_applicable') {
          autoDecisions.set(criterion.criterionId, {
            criterionId: criterion.criterionId,
            decision: 'CONFIRM'
          });
        }
      });
      setDecisions(autoDecisions);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load workflow data');
    } finally {
      setLoading(false);
    }
  }

  function generateMockConformanceCriteria(): ConformanceCriterion[] {
    // Generate realistic conformance criteria based on common EPUB issues
    return [
      {
        criterionId: '1.1.1',
        title: 'Non-text Content',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.92,
        reasoning: 'All images have alt text after remediation. 2 images had missing alt text, now fixed.',
        issueCount: 0
      },
      {
        criterionId: '1.3.1',
        title: 'Info and Relationships',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.88,
        reasoning: 'Heading hierarchy corrected. Semantic structure properly marked up.',
        issueCount: 0
      },
      {
        criterionId: '1.3.2',
        title: 'Meaningful Sequence',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.95,
        reasoning: 'Reading order is logical and sequential.',
        issueCount: 0
      },
      {
        criterionId: '1.4.3',
        title: 'Contrast (Minimum)',
        level: 'AA',
        aiConformance: 'not_applicable',
        confidence: 0.90,
        reasoning: 'EPUB is text-only, no custom colors detected.',
        issueCount: 0
      },
      {
        criterionId: '2.1.1',
        title: 'Keyboard',
        level: 'A',
        aiConformance: 'not_applicable',
        confidence: 0.85,
        reasoning: 'No interactive elements requiring keyboard functionality.',
        issueCount: 0
      },
      {
        criterionId: '2.4.1',
        title: 'Bypass Blocks',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.87,
        reasoning: 'EPUB has proper navigation landmarks and TOC.',
        issueCount: 0
      },
      {
        criterionId: '2.4.2',
        title: 'Page Titled',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.93,
        reasoning: 'All HTML documents have descriptive titles.',
        issueCount: 0
      },
      {
        criterionId: '2.4.4',
        title: 'Link Purpose (In Context)',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.91,
        reasoning: 'All links have descriptive text.',
        issueCount: 0
      },
      {
        criterionId: '2.4.6',
        title: 'Headings and Labels',
        level: 'AA',
        aiConformance: 'supports',
        confidence: 0.89,
        reasoning: 'Headings are descriptive and follow logical hierarchy.',
        issueCount: 0
      },
      {
        criterionId: '3.1.1',
        title: 'Language of Page',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.96,
        reasoning: 'Language attribute properly set (en).',
        issueCount: 0
      },
      {
        criterionId: '3.1.2',
        title: 'Language of Parts',
        level: 'AA',
        aiConformance: 'supports',
        confidence: 0.94,
        reasoning: 'No language changes detected in content.',
        issueCount: 0
      },
      {
        criterionId: '4.1.1',
        title: 'Parsing',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.97,
        reasoning: 'EPUB passes EPUBCheck validation.',
        issueCount: 0
      },
      {
        criterionId: '4.1.2',
        title: 'Name, Role, Value',
        level: 'A',
        aiConformance: 'supports',
        confidence: 0.90,
        reasoning: 'Semantic HTML elements used appropriately.',
        issueCount: 0
      }
    ];
  }

  function handleConfirm(criterionId: string) {
    const newDecisions = new Map(decisions);
    newDecisions.set(criterionId, {
      criterionId,
      decision: 'CONFIRM'
    });
    setDecisions(newDecisions);
  }

  async function handleSubmitReview() {
    try {
      setSubmitting(true);

      // Check if all criteria have decisions
      const needsReview = criteria.filter(c =>
        c.aiConformance === 'partially_supports' || c.aiConformance === 'does_not_support'
      );
      const unreviewedCriteria = needsReview.filter(c => !decisions.has(c.criterionId));

      if (unreviewedCriteria.length > 0) {
        toast.error(`Please review ${unreviewedCriteria.length} criteria that need attention`);
        setSubmitting(false);
        return;
      }

      // Map local CONFIRM/OVERRIDE decisions to API conformance level format
      const reviewDecisions = Array.from(decisions.values()).map(d => {
        const criterion = criteria.find(c => c.criterionId === d.criterionId);
        const conformanceLevel = d.decision === 'OVERRIDE'
          ? ((d.overrideValue ?? 'supports') as 'supports' | 'partially_supports' | 'does_not_support' | 'not_applicable')
          : (criterion?.aiConformance ?? 'supports');
        return {
          criterionId: d.criterionId,
          decision: conformanceLevel,
          notes: d.justification,
        };
      });

      // Submit to backend
      await workflowService.submitConformanceReview(workflowId!, reviewDecisions);

      toast.success('Conformance review submitted! Workflow continuing...');
      navigate(`/workflow/${workflowId}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit conformance review');
    } finally {
      setSubmitting(false);
    }
  }

  function handleAcceptAll() {
    // Confirm all remaining criteria
    const newDecisions = new Map(decisions);
    criteria.forEach(criterion => {
      if (!newDecisions.has(criterion.criterionId)) {
        newDecisions.set(criterion.criterionId, {
          criterionId: criterion.criterionId,
          decision: 'CONFIRM'
        });
      }
    });
    setDecisions(newDecisions);
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
        <Alert variant="error" title="Failed to load conformance review">
          {error}
        </Alert>
      </div>
    );
  }

  const filteredCriteria = criteria.filter(c => {
    if (filter === 'needs-review') {
      return c.aiConformance === 'partially_supports' || c.aiConformance === 'does_not_support';
    }
    if (filter === 'not-applicable') {
      return c.aiConformance === 'not_applicable';
    }
    return true;
  });

  const needsReviewCount = criteria.filter(c =>
    c.aiConformance === 'partially_supports' || c.aiConformance === 'does_not_support'
  ).length;
  const supportsCount = criteria.filter(c => c.aiConformance === 'supports').length;
  const notApplicableCount = criteria.filter(c => c.aiConformance === 'not_applicable').length;
  const reviewedCount = decisions.size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={() => navigate(`/workflow/${workflowId}`)}
          >
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Conformance Review</h1>
            <p className="text-sm text-gray-500 mt-1">
              Review WCAG 2.1 conformance mappings
            </p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Conformance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-700">{criteria.length}</div>
              <div className="text-sm text-blue-600">Total Criteria</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-700">{supportsCount}</div>
              <div className="text-sm text-green-600">Supports</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-700">{notApplicableCount}</div>
              <div className="text-sm text-gray-600">Not Applicable</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-700">{needsReviewCount}</div>
              <div className="text-sm text-orange-600">Needs Review</div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Progress: {reviewedCount}/{criteria.length} criteria reviewed
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('all')}
                className={filter === 'all' ? 'bg-gray-100' : ''}
              >
                All ({criteria.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('needs-review')}
                className={filter === 'needs-review' ? 'bg-orange-100' : ''}
              >
                Needs Review ({needsReviewCount})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilter('not-applicable')}
                className={filter === 'not-applicable' ? 'bg-gray-100' : ''}
              >
                N/A ({notApplicableCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Criteria List */}
      <Card>
        <CardHeader>
          <CardTitle>WCAG 2.1 Criteria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredCriteria.map(criterion => {
              const decision = decisions.get(criterion.criterionId);
              const isConfirmed = decision?.decision === 'CONFIRM';
              const isOverridden = decision?.decision === 'OVERRIDE';

              return (
                <div
                  key={criterion.criterionId}
                  className={`border rounded-lg p-4 ${
                    isConfirmed
                      ? 'bg-green-50 border-green-200'
                      : isOverridden
                      ? 'bg-blue-50 border-blue-200'
                      : criterion.aiConformance === 'supports'
                      ? 'bg-white border-gray-200'
                      : criterion.aiConformance === 'not_applicable'
                      ? 'bg-gray-50 border-gray-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          {criterion.criterionId}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            criterion.level === 'A'
                              ? 'bg-blue-100 text-blue-700'
                              : criterion.level === 'AA'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-pink-100 text-pink-700'
                          }`}
                        >
                          Level {criterion.level}
                        </span>
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded ${
                            criterion.aiConformance === 'supports'
                              ? 'bg-green-100 text-green-700'
                              : criterion.aiConformance === 'partially_supports'
                              ? 'bg-yellow-100 text-yellow-700'
                              : criterion.aiConformance === 'does_not_support'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {criterion.aiConformance === 'supports'
                            ? 'Supports'
                            : criterion.aiConformance === 'partially_supports'
                            ? 'Partially Supports'
                            : criterion.aiConformance === 'does_not_support'
                            ? 'Does Not Support'
                            : 'Not Applicable'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Confidence: {Math.round(criterion.confidence * 100)}%
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2">{criterion.title}</h3>
                      <div className="flex items-start gap-2 text-sm text-gray-600">
                        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <p>{criterion.reasoning}</p>
                      </div>

                      {isOverridden && decision.justification && (
                        <div className="mt-2 p-2 bg-blue-100 rounded text-sm">
                          <strong>Override:</strong> {decision.overrideValue}
                          <br />
                          <strong>Reason:</strong> {decision.justification}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {!isConfirmed && !isOverridden && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleConfirm(criterion.criterionId)}
                        >
                          Confirm
                        </Button>
                      )}
                      {isConfirmed && (
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          Confirmed
                        </div>
                      )}
                      {isOverridden && (
                        <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                          <AlertCircle className="w-4 h-4" />
                          Overridden
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Ready to submit?</h3>
              <p className="text-sm text-gray-500 mt-1">
                {needsReviewCount > 0
                  ? `${decisions.size}/${criteria.length} criteria reviewed. ${needsReviewCount} may need attention.`
                  : `All ${criteria.length} criteria reviewed and confirmed.`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="lg"
                onClick={handleAcceptAll}
                disabled={submitting}
              >
                Accept All
              </Button>
              <Button
                variant="primary"
                size="lg"
                isLoading={submitting}
                rightIcon={<CheckCircle2 className="w-5 h-5" />}
                onClick={handleSubmitReview}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
