import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Upload,
  Brain,
  UserCheck,
  Edit3,
  Download,
  Loader2
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { EditionSelector } from '@/components/acr/EditionSelector';
import { ConfidenceDashboard } from '@/components/acr/ConfidenceDashboard';
import { VerificationQueue } from '@/components/acr/VerificationQueue';
import { AcrEditor } from '@/components/acr/AcrEditor';
import { ExportDialog } from '@/components/acr/ExportDialog';
import { VersionHistory } from '@/components/acr/VersionHistory';
import type { AcrEdition } from '@/types/acr.types';

interface WorkflowStep {
  id: number;
  name: string;
  description: string;
  icon: typeof FileText;
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 1, name: 'Edition Selection', description: 'Choose VPAT edition', icon: FileText },
  { id: 2, name: 'Document Upload', description: 'Upload or select job', icon: Upload },
  { id: 3, name: 'AI Analysis', description: 'Review automated results', icon: Brain },
  { id: 4, name: 'Human Verification', description: 'Verify flagged criteria', icon: UserCheck },
  { id: 5, name: 'Review & Edit', description: 'Edit and finalize', icon: Edit3 },
  { id: 6, name: 'Export', description: 'Download ACR', icon: Download },
];

interface WorkflowState {
  currentStep: number;
  selectedEdition: AcrEdition | null;
  jobId: string | null;
  acrId: string | null;
  verificationComplete: boolean;
  isFinalized: boolean;
}

const STORAGE_KEY = 'acr-workflow-state';

function loadWorkflowState(jobId?: string): WorkflowState {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}-${jobId || 'new'}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load workflow state:', e);
  }
  return {
    currentStep: 1,
    selectedEdition: null,
    jobId: jobId || null,
    acrId: jobId ? `acr-${jobId}` : null,
    verificationComplete: false,
    isFinalized: false,
  };
}

function saveWorkflowState(state: WorkflowState) {
  try {
    localStorage.setItem(`${STORAGE_KEY}-${state.jobId || 'new'}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save workflow state:', e);
  }
}

function StepIndicator({ 
  step, 
  currentStep, 
  isComplete,
  onClick 
}: { 
  step: WorkflowStep; 
  currentStep: number;
  isComplete: boolean;
  onClick: () => void;
}) {
  const Icon = step.icon;
  const isCurrent = step.id === currentStep;
  const isPast = step.id < currentStep || isComplete;
  const canClick = isPast || step.id <= currentStep;

  return (
    <button
      onClick={onClick}
      disabled={!canClick}
      className={cn(
        'flex flex-col items-center gap-2 transition-colors',
        canClick ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isCurrent && 'bg-primary-600 text-white',
          isPast && !isCurrent && 'bg-green-500 text-white',
          !isCurrent && !isPast && 'bg-gray-200 text-gray-500'
        )}
      >
        {isPast && !isCurrent ? (
          <CheckCircle className="h-5 w-5" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
      </div>
      <div className="text-center">
        <div className={cn(
          'text-xs font-medium',
          isCurrent ? 'text-primary-600' : isPast ? 'text-green-600' : 'text-gray-500'
        )}>
          {step.name}
        </div>
      </div>
    </button>
  );
}

function ProgressBar({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const progress = ((currentStep - 1) / (totalSteps - 1)) * 100;
  
  return (
    <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="absolute top-0 left-0 h-full bg-primary-600 transition-all duration-300"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

export function AcrWorkflowPage() {
  const { jobId: urlJobId } = useParams<{ jobId?: string }>();
  const navigate = useNavigate();
  
  const [state, setState] = useState<WorkflowState>(() => loadWorkflowState(urlJobId));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isLoading] = useState(false);

  useEffect(() => {
    saveWorkflowState(state);
  }, [state]);

  useEffect(() => {
    if (urlJobId && urlJobId !== state.jobId) {
      setState(loadWorkflowState(urlJobId));
    }
  }, [urlJobId]);

  const updateState = (updates: Partial<WorkflowState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    if (step >= 1 && step <= WORKFLOW_STEPS.length) {
      updateState({ currentStep: step });
    }
  };

  const handleNext = () => {
    if (state.currentStep < WORKFLOW_STEPS.length) {
      goToStep(state.currentStep + 1);
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) {
      goToStep(state.currentStep - 1);
    }
  };

  const handleEditionSelect = (edition: AcrEdition) => {
    updateState({ selectedEdition: edition });
  };

  const handleJobSelect = (jobId: string) => {
    updateState({ 
      jobId, 
      acrId: `acr-${jobId}`,
    });
  };

  const handleVerificationComplete = () => {
    updateState({ verificationComplete: true });
  };

  const handleFinalize = () => {
    updateState({ isFinalized: true });
    handleNext();
  };

  const handleRestore = (version: number) => {
    console.log('Restoring to version:', version);
  };

  const canProceed = (): boolean => {
    switch (state.currentStep) {
      case 1:
        return state.selectedEdition !== null;
      case 2:
        return state.jobId !== null;
      case 3:
        return true;
      case 4:
        return state.verificationComplete;
      case 5:
        return state.isFinalized;
      case 6:
        return true;
      default:
        return false;
    }
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Select VPAT Edition</h2>
              <p className="text-gray-600">
                Choose the accessibility standard edition for your ACR document.
              </p>
            </div>
            <EditionSelector
              selectedEdition={state.selectedEdition}
              onSelect={handleEditionSelect}
            />
            {state.selectedEdition && (
              <Alert variant="success">
                Selected: {state.selectedEdition.name}
              </Alert>
            )}
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Source</h2>
              <p className="text-gray-600">
                Upload a document or select an existing validation job.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div 
                className={cn(
                  'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                  'hover:border-primary-400 hover:bg-primary-50'
                )}
                onClick={() => handleJobSelect(`job-${Date.now()}`)}
              >
                <Upload className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-1">Upload New Document</h3>
                <p className="text-sm text-gray-500">Upload EPUB, PDF, or HTML files</p>
              </div>

              <div 
                className={cn(
                  'border-2 rounded-lg p-8 text-center cursor-pointer transition-colors',
                  'hover:border-primary-400 hover:bg-primary-50',
                  state.jobId && 'border-primary-500 bg-primary-50'
                )}
                onClick={() => handleJobSelect('demo-job-123')}
              >
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="font-medium text-gray-900 mb-1">Select Existing Job</h3>
                <p className="text-sm text-gray-500">Use a completed validation job</p>
              </div>
            </div>

            {state.jobId && (
              <Alert variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Job Selected: <Badge variant="info">{state.jobId}</Badge>
                </div>
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis Results</h2>
              <p className="text-gray-600">
                Review the automated accessibility analysis and confidence scores.
              </p>
            </div>
            <ConfidenceDashboard jobId={state.jobId || 'demo'} />
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Human Verification</h2>
              <p className="text-gray-600">
                Verify flagged criteria that require human review.
              </p>
            </div>
            <VerificationQueue 
              jobId={state.jobId || 'demo'} 
              onComplete={handleVerificationComplete}
            />
            {state.verificationComplete && (
              <Alert variant="success">
                All verification tasks completed. You can proceed to review.
              </Alert>
            )}
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Review & Edit ACR</h2>
                <p className="text-gray-600">
                  Review all criteria, edit remarks, and finalize the document.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                {showVersionHistory ? 'Hide History' : 'Version History'}
              </Button>
            </div>
            
            {showVersionHistory ? (
              <div className="bg-white border rounded-lg p-4">
                <VersionHistory 
                  acrId={state.acrId || 'demo'} 
                  onRestore={handleRestore}
                />
              </div>
            ) : (
              <AcrEditor 
                jobId={state.jobId || 'demo'}
                onFinalized={handleFinalize}
              />
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Export ACR Document</h2>
              <p className="text-gray-600">
                Download your completed ACR in your preferred format.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => setIsExportOpen(true)}
              >
                <Download className="h-10 w-10 mx-auto text-primary-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Export Document</h3>
                <p className="text-sm text-gray-500">Word, PDF, or HTML format</p>
              </div>

              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => setShowVersionHistory(true)}
              >
                <FileText className="h-10 w-10 mx-auto text-blue-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Version History</h3>
                <p className="text-sm text-gray-500">View document history</p>
              </div>

              <div 
                className="border rounded-lg p-6 text-center cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition-colors"
                onClick={() => navigate('/dashboard')}
              >
                <CheckCircle className="h-10 w-10 mx-auto text-green-600 mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">Complete</h3>
                <p className="text-sm text-gray-500">Return to dashboard</p>
              </div>
            </div>

            {showVersionHistory && (
              <div className="bg-white border rounded-lg p-4">
                <div className="flex justify-end mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setShowVersionHistory(false)}
                  >
                    Close History
                  </Button>
                </div>
                <VersionHistory 
                  acrId={state.acrId || 'demo'} 
                  onRestore={handleRestore}
                />
              </div>
            )}

            <Alert variant="success">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Workflow Complete!</span>
                <span>Your ACR document is ready for export.</span>
              </div>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">ACR Generation Workflow</h1>
          <Badge variant="info">
            Step {state.currentStep} of {WORKFLOW_STEPS.length}
          </Badge>
        </div>
        <p className="text-gray-600">
          Complete each step to generate your Accessibility Conformance Report.
        </p>
      </div>

      <div className="mb-8">
        <ProgressBar currentStep={state.currentStep} totalSteps={WORKFLOW_STEPS.length} />
      </div>

      <div className="mb-8 hidden md:flex justify-between items-start">
        {WORKFLOW_STEPS.map((step, idx) => (
          <div key={step.id} className="flex items-center">
            <StepIndicator
              step={step}
              currentStep={state.currentStep}
              isComplete={step.id < state.currentStep}
              onClick={() => step.id <= state.currentStep && goToStep(step.id)}
            />
            {idx < WORKFLOW_STEPS.length - 1 && (
              <div className={cn(
                'flex-1 h-0.5 mx-2 min-w-[40px]',
                step.id < state.currentStep ? 'bg-green-500' : 'bg-gray-200'
              )} />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden mb-6">
        <div className="flex items-center justify-center gap-2">
          {WORKFLOW_STEPS.map((step) => (
            <div
              key={step.id}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-colors',
                step.id === state.currentStep && 'bg-primary-600',
                step.id < state.currentStep && 'bg-green-500',
                step.id > state.currentStep && 'bg-gray-300'
              )}
            />
          ))}
        </div>
        <div className="text-center mt-2">
          <span className="font-medium text-gray-900">
            {WORKFLOW_STEPS[state.currentStep - 1].name}
          </span>
          <span className="text-gray-500 text-sm ml-2">
            ({WORKFLOW_STEPS[state.currentStep - 1].description})
          </span>
        </div>
      </div>

      <div className="bg-white rounded-lg border p-6 min-h-[400px]">
        {renderStepContent()}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={state.currentStep === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        <div className="flex items-center gap-3">
          {state.currentStep === WORKFLOW_STEPS.length ? (
            <Button onClick={() => navigate('/dashboard')}>
              Finish
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <ExportDialog
        acrId={state.acrId || 'demo'}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />
    </div>
  );
}

export default AcrWorkflowPage;
