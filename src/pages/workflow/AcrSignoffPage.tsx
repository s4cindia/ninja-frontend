import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, CheckCircle2, FileText, Shield, AlertCircle } from 'lucide-react';
import { workflowService, type WorkflowStatus } from '@/services/workflowService';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';

export function AcrSignoffPage() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [attestationConfirmed, setAttestationConfirmed] = useState(false);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!workflowId) return;
    let cancelled = false;

    async function loadWorkflowData() {
      try {
        setLoading(true);
        const workflowData = await workflowService.getWorkflowStatus(workflowId!);
        if (cancelled) return;
        setWorkflow(workflowData);
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load workflow data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadWorkflowData();
    return () => { cancelled = true; };
  }, [workflowId]);

  async function handleSubmitSignoff() {
    if (!attestationConfirmed) {
      toast.error('Please confirm the attestation statement');
      return;
    }

    try {
      setSubmitting(true);

      await workflowService.submitACRSignoff(
        workflowId!,
        {
          text: ATTESTATION_TEXT,
          confirmed: true,
        },
        notes || undefined
      );

      toast.success('ACR signed off successfully! Workflow complete.');
      if (workflow?.batchId) {
        navigate(`/workflow/batch/${workflow.batchId}`);
      } else {
        navigate(`/workflow/${workflowId}`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit sign-off');
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
          onClick={() =>
              workflow?.batchId
                ? navigate(`/workflow/batch/${workflow.batchId}`)
                : navigate(`/workflow/${workflowId}`)
            }
        >
          {workflow?.batchId ? 'Back to Batch' : 'Back to Workflow'}
        </Button>
        <Alert variant="error" title="Failed to load ACR sign-off">
          {error}
        </Alert>
      </div>
    );
  }

  const stateData = workflow?.stateData as {
    jobId?: string;
    fileName?: string;
    acrGenerated?: boolean;
  };

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
            <h1 className="text-2xl font-semibold text-gray-900">ACR Sign-Off</h1>
            <p className="text-sm text-gray-500 mt-1">
              Final approval for Accessibility Conformance Report
            </p>
          </div>
        </div>
      </div>

      {/* ACR Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            ACR Generated
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-medium text-green-900">
                  Accessibility Conformance Report Ready
                </div>
                <div className="text-sm text-green-700 mt-1">
                  The ACR has been generated based on the validation results, remediation actions,
                  and WCAG conformance mappings from the previous workflow steps.
                </div>
              </div>
            </div>
          </div>

          {stateData?.fileName && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <FileText className="w-5 h-5 text-gray-500" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Document</div>
                <div className="text-xs text-gray-500">{stateData.fileName}</div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">✓</div>
              <div className="text-xs text-gray-600 mt-1">Validation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <div className="text-xs text-gray-600 mt-1">Remediation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">✓</div>
              <div className="text-xs text-gray-600 mt-1">Conformance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attestation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Attestation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-purple-900 leading-relaxed">
                {ATTESTATION_TEXT}
              </div>
            </div>
          </div>

          <label className="flex items-start gap-3 p-4 bg-white border-2 border-gray-200 rounded-lg cursor-pointer hover:border-purple-300 transition-colors">
            <input
              type="checkbox"
              checked={attestationConfirmed}
              onChange={(e) => setAttestationConfirmed(e.target.checked)}
              className="mt-1 h-5 w-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                I confirm this attestation
              </div>
              <div className="text-sm text-gray-500 mt-1">
                By checking this box, you certify that the ACR accurately reflects the
                accessibility status of the document.
              </div>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* Optional Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Notes (Optional)</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any additional context, caveats, or notes about this ACR..."
            className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-500 mt-2">
            These notes will be included in the workflow history.
          </p>
        </CardContent>
      </Card>

      {/* Submit */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-gray-900">Ready to finalize?</h3>
              <p className="text-sm text-gray-500 mt-1">
                {attestationConfirmed
                  ? 'You can now submit the final sign-off to complete the workflow.'
                  : 'Please confirm the attestation statement above to proceed.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="lg"
              isLoading={submitting}
              disabled={!attestationConfirmed}
              rightIcon={<CheckCircle2 className="w-5 h-5" />}
              onClick={handleSubmitSignoff}
            >
              Submit Sign-Off
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const ATTESTATION_TEXT = `I certify that I have reviewed the Accessibility Conformance Report (ACR) and confirm that it accurately represents the accessibility status of the document as determined through automated validation, manual review, remediation actions, and WCAG conformance mapping. I understand that this report will be used to communicate the document's accessibility conformance to stakeholders.`;
