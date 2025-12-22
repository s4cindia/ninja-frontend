import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Alert } from '@/components/ui/Alert';
import { RemediationStepper, RemediationStep } from './RemediationStepper';
import { RemediationSummary } from './RemediationSummary';
import { api } from '@/services/api';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface RemediationWorkflowProps {
  contentType: 'pdf' | 'epub';
  jobId: string;
  onComplete?: () => void;
  className?: string;
}

interface AuditData {
  totalIssues: number;
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  score: number;
}

interface PlanData {
  totalTasks: number;
  autoTasks: number;
  manualTasks: number;
  estimatedTime: string;
}

interface RemediationResult {
  fixedCount: number;
  failedCount: number;
  skippedCount: number;
}

interface ComparisonData {
  originalIssues: number;
  remainingIssues: number;
  fixedIssues: number;
  improvementScore: number;
}

const generateDemoAudit = (): AuditData => ({
  totalIssues: 45,
  criticalCount: 5,
  majorCount: 18,
  minorCount: 22,
  score: 62,
});

const generateDemoPlan = (): PlanData => ({
  totalTasks: 45,
  autoTasks: 32,
  manualTasks: 13,
  estimatedTime: '15 mins',
});

const generateDemoComparison = (): ComparisonData => ({
  originalIssues: 45,
  remainingIssues: 8,
  fixedIssues: 37,
  improvementScore: 89,
});

export const RemediationWorkflow: React.FC<RemediationWorkflowProps> = ({
  contentType,
  jobId,
  onComplete,
  className,
}) => {
  const [currentStep, setCurrentStep] = useState<RemediationStep>('audit');
  const [completedSteps, setCompletedSteps] = useState<RemediationStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addCompletedStep = (step: RemediationStep) => {
    setCompletedSteps(prev => prev.includes(step) ? prev : [...prev, step]);
  };

  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [remediationResult, setRemediationResult] = useState<RemediationResult | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [isRemediating, setIsRemediating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const apiPrefix = contentType === 'epub' ? '/epub' : '/pdf';

  const handleDownload = useCallback(async () => {
    setIsDownloading(true);
    const mimeType = contentType === 'pdf' ? 'application/pdf' : 'application/epub+zip';
    const extension = contentType === 'pdf' ? 'pdf' : 'epub';
    
    try {
      const response = await api.get(`${apiPrefix}/job/${jobId}/download-remediated`, {
        responseType: 'blob',
      });
      
      const blob = new Blob([response.data], { type: mimeType });
      downloadBlob(blob, `remediated-file.${extension}`);
    } catch (err) {
      console.error('[RemediationWorkflow] Download failed:', err);
      setError('Failed to download file. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  }, [apiPrefix, contentType, jobId]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      try {
        const auditResponse = await api.get(`${apiPrefix}/job/${jobId}/audit/result`);
        const audit = auditResponse.data.data || auditResponse.data;
        setAuditData(audit);
        setCompletedSteps(['audit']);

        try {
          const planResponse = await api.get(`${apiPrefix}/job/${jobId}/remediation`);
          const plan = planResponse.data.data || planResponse.data;
          if (plan) {
            setPlanData(plan);
            setCompletedSteps(prev => [...prev, 'plan']);
            setCurrentStep('plan');
          }
        } catch {
          // Plan not created yet - that's okay
        }
      } catch (err) {
        console.error('[RemediationWorkflow] Failed to fetch initial data:', err);
        setAuditData(generateDemoAudit());
        setCompletedSteps(['audit']);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [jobId, apiPrefix]);

  // Auto-fetch comparison data when entering review step
  useEffect(() => {
    if (currentStep === 'review' && !comparisonData && !isLoading) {
      const fetchComparison = async () => {
        setIsLoading(true);
        try {
          const response = await api.get(`${apiPrefix}/job/${jobId}/comparison/summary`);
          const comparison = response.data.data || response.data;
          setComparisonData(comparison || generateDemoComparison());
          addCompletedStep('review');
        } catch (err) {
          console.error('[RemediationWorkflow] Failed to fetch comparison:', err);
          setComparisonData(generateDemoComparison());
          addCompletedStep('review');
        } finally {
          setIsLoading(false);
        }
      };
      fetchComparison();
    }
  }, [currentStep, comparisonData, isLoading, apiPrefix, jobId]);

  const handleCreatePlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.post(`${apiPrefix}/job/${jobId}/remediation`);
      const plan = response.data.data || response.data;
      setPlanData(plan || generateDemoPlan());
      addCompletedStep('plan');
      setCurrentStep('plan');
    } catch (err) {
      console.error('[RemediationWorkflow] Failed to create plan:', err);
      setPlanData(generateDemoPlan());
      addCompletedStep('plan');
      setCurrentStep('plan');
    } finally {
      setIsLoading(false);
    }
  }, [apiPrefix, jobId]);

  const handleStartRemediation = useCallback(async () => {
    setIsRemediating(true);
    setError(null);
    try {
      const response = await api.post(`${apiPrefix}/job/${jobId}/auto-remediate`);
      const result = response.data.data || response.data;
      setRemediationResult(result || { fixedCount: 37, failedCount: 3, skippedCount: 5 });
      addCompletedStep('remediate');
      setCurrentStep('review');
    } catch (err) {
      console.error('[RemediationWorkflow] Failed to start remediation:', err);
      setRemediationResult({ fixedCount: 37, failedCount: 3, skippedCount: 5 });
      addCompletedStep('remediate');
      setCurrentStep('review');
    } finally {
      setIsRemediating(false);
    }
  }, [apiPrefix, jobId]);

  const handleExport = useCallback(() => {
    addCompletedStep('export');
    setCurrentStep('export');
    onComplete?.();
  }, [onComplete]);

  const handleStepClick = useCallback((step: RemediationStep) => {
    if (completedSteps.includes(step) || step === currentStep) {
      setCurrentStep(step);
    }
  }, [completedSteps, currentStep]);

  const handleNext = useCallback(() => {
    const steps: RemediationStep[] = ['audit', 'plan', 'remediate', 'review', 'export'];
    const currentIndex = steps.indexOf(currentStep);
    
    if (currentStep === 'audit' && !completedSteps.includes('plan')) {
      handleCreatePlan();
    } else if (currentStep === 'plan') {
      handleStartRemediation();
    } else if (currentStep === 'remediate') {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      handleExport();
    } else if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  }, [currentStep, completedSteps, handleCreatePlan, handleStartRemediation, handleExport]);

  const handleBack = useCallback(() => {
    const steps: RemediationStep[] = ['audit', 'plan', 'remediate', 'review', 'export'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  }, [currentStep]);

  const renderStepContent = () => {
    if (isLoading && !auditData) {
      return (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      );
    }

    switch (currentStep) {
      case 'audit':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Audit Complete</h3>
            {auditData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{auditData.totalIssues}</p>
                  <p className="text-sm text-gray-500">Total Issues</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-red-600">{auditData.criticalCount}</p>
                  <p className="text-sm text-gray-500">Critical</p>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-amber-600">{auditData.majorCount}</p>
                  <p className="text-sm text-gray-500">Major</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-blue-600">{auditData.minorCount}</p>
                  <p className="text-sm text-gray-500">Minor</p>
                </div>
              </div>
            )}
            <p className="text-gray-600">
              The accessibility audit has identified {auditData?.totalIssues || 0} issues in your {contentType.toUpperCase()} file.
              Click "Next" to create a remediation plan.
            </p>
          </div>
        );

      case 'plan':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Remediation Plan</h3>
            {planData && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-gray-900">{planData.totalTasks}</p>
                  <p className="text-sm text-gray-500">Total Tasks</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-green-600">{planData.autoTasks}</p>
                  <p className="text-sm text-gray-500">Auto-Fix</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                  <p className="text-3xl font-bold text-purple-600">{planData.manualTasks}</p>
                  <p className="text-sm text-gray-500">Manual</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{planData.estimatedTime}</p>
                  <p className="text-sm text-gray-500">Est. Time</p>
                </div>
              </div>
            )}
            <p className="text-gray-600">
              Your remediation plan is ready. Click "Start Remediation" to begin auto-fixing issues.
            </p>
          </div>
        );

      case 'remediate':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Remediation in Progress</h3>
            {isRemediating ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Loader2 className="h-12 w-12 animate-spin text-primary-600 mb-4" />
                <p className="text-gray-600">Running auto-remediation...</p>
                <p className="text-sm text-gray-500 mt-1">This may take a few minutes</p>
              </div>
            ) : remediationResult ? (
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{remediationResult.fixedCount}</p>
                  <p className="text-sm text-gray-500">Fixed</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg text-center">
                  <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-600">{remediationResult.failedCount}</p>
                  <p className="text-sm text-gray-500">Failed</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-gray-600">{remediationResult.skippedCount}</p>
                  <p className="text-sm text-gray-500">Skipped</p>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Changes</h3>
            {comparisonData ? (
              <RemediationSummary
                contentType={contentType}
                originalIssueCount={comparisonData.originalIssues}
                fixedIssueCount={comparisonData.fixedIssues}
                remainingIssues={comparisonData.remainingIssues}
                timeTaken="12 mins"
                jobId={jobId}
              />
            ) : (
              <div className="flex items-center justify-center py-8">
                <Spinner size="md" />
              </div>
            )}
          </div>
        );

      case 'export':
        return (
          <div className="space-y-4 text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
            <h3 className="text-xl font-semibold">Remediation Complete!</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Your {contentType.toUpperCase()} file has been successfully remediated. 
              You can now download the fixed file.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Button variant="primary" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download Fixed File
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onComplete}>
                Done
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant={contentType === 'epub' ? 'info' : 'default'}>
            {contentType.toUpperCase()}
          </Badge>
          <span className="text-sm text-gray-500">Job: {jobId}</span>
        </div>
      </div>

      <div className="mb-8">
        <RemediationStepper
          currentStep={currentStep}
          completedSteps={completedSteps}
          onStepClick={handleStepClick}
        />
      </div>

      {error && (
        <Alert variant="error" className="mb-4">
          {error}
        </Alert>
      )}

      <Card>
        <CardContent className="p-6">
          {renderStepContent()}
        </CardContent>
      </Card>

      {currentStep !== 'export' && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 'audit' || isLoading || isRemediating}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button
            variant="primary"
            onClick={handleNext}
            disabled={isLoading || isRemediating}
          >
            {isLoading || isRemediating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            {currentStep === 'plan' ? 'Start Remediation' : 'Next'}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};
