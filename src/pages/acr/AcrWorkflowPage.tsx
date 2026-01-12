import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api, CriterionConfidence } from '@/services/api';
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
  Loader2,
  X,
  File,
  RotateCcw,
  BookOpen
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
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

type DocumentSource = 'upload' | 'existing' | null;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface VerificationData {
  [itemId: string]: {
    status: string;
    method: string;
    notes: string;
    verifiedAt: string;
  };
}

interface WorkflowState {
  currentStep: number;
  selectedEdition: AcrEdition | null;
  documentSource: DocumentSource;
  uploadedFile: UploadedFile | null;
  jobId: string | null;
  acrId: string | null;
  verificationComplete: boolean;
  isFinalized: boolean;
  verifications: VerificationData;
  fileName: string | null;
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
    documentSource: null,
    uploadedFile: null,
    jobId: jobId || null,
    acrId: jobId ? `acr-${jobId}` : null,
    verificationComplete: false,
    isFinalized: false,
    verifications: {},
    fileName: null,
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

interface AuditJob {
  id: string;
  input?: { fileName?: string };
  output?: { fileName?: string; accessibilityScore?: number };
  createdAt: string;
}

export function AcrWorkflowPage() {
  const { jobId: urlJobId } = useParams<{ jobId?: string }>();
  const [searchParams] = useSearchParams();
  const jobIdFromQuery = searchParams.get('jobId');
  const fileNameFromQuery = searchParams.get('fileName');
  const navigate = useNavigate();
  
  const effectiveJobId = urlJobId || jobIdFromQuery;
  
  const [state, setState] = useState<WorkflowState>(() => loadWorkflowState(effectiveJobId ?? undefined));
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [isLoading] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<AuditJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<CriterionConfidence[]>([]);

  const [showCriteriaModal, setShowCriteriaModal] = useState(false);
  const [criteriaData, setCriteriaData] = useState<{
    edition: { name: string; description: string; standard: string };
    criteriaCount: { total: number; A: number; AA: number; AAA: number };
    criteriaByLevel: {
      A: Array<{ id: string; number: string; name: string; description: string; wcagUrl?: string }>;
      AA: Array<{ id: string; number: string; name: string; description: string; wcagUrl?: string }>;
      AAA: Array<{ id: string; number: string; name: string; description: string; wcagUrl?: string }>;
      EU: Array<{ id: string; number: string; name: string; description: string }>;
    };
  } | null>(null);
  const [isLoadingCriteria, setIsLoadingCriteria] = useState(false);
  const [criteriaError, setCriteriaError] = useState<string | null>(null);

  const handleCriteriaLoaded = useCallback((criteria: CriterionConfidence[]) => {
    setAnalysisResults(criteria);
  }, []);

  const openCriteriaModal = useCallback(async (editionCode: string) => {
    setShowCriteriaModal(true);
    setIsLoadingCriteria(true);
    setCriteriaError(null);

    try {
      const response = await api.get(`/acr/editions/${editionCode}/criteria`);
      setCriteriaData(response.data.data);
    } catch (error) {
      console.error('[AcrWorkflow] Failed to fetch criteria:', error);
      setCriteriaError('Failed to load criteria list. Please try again.');
    } finally {
      setIsLoadingCriteria(false);
    }
  }, []);

  const closeCriteriaModal = useCallback(() => {
    setShowCriteriaModal(false);
    setCriteriaData(null);
    setCriteriaError(null);
  }, []);

  const criteriaModalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (showCriteriaModal) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      
      const timer = setTimeout(() => {
        const closeButton = criteriaModalRef.current?.querySelector('[aria-label="Close criteria modal"]') as HTMLElement;
        closeButton?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          closeCriteriaModal();
        }
        
        if (e.key === 'Tab' && criteriaModalRef.current) {
          const focusableElements = criteriaModalRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      if (previousFocusRef.current && previousFocusRef.current.isConnected) {
        previousFocusRef.current.focus();
      }
    }
  }, [showCriteriaModal, closeCriteriaModal]);

  useEffect(() => {
    if (effectiveJobId && effectiveJobId !== state.jobId) {
      const loadedState = loadWorkflowState(effectiveJobId);
      setState({
        ...loadedState,
        documentSource: 'existing',
        jobId: effectiveJobId,
        acrId: `acr-${effectiveJobId}`,
        fileName: fileNameFromQuery ? decodeURIComponent(fileNameFromQuery) : loadedState.fileName,
      });
    }
  }, [effectiveJobId, state.jobId, fileNameFromQuery]);

  useEffect(() => {
    if (fileNameFromQuery) {
      const decodedFileName = decodeURIComponent(fileNameFromQuery);
      if (decodedFileName !== state.fileName) {
        setState(prev => ({ ...prev, fileName: decodedFileName }));
      }
    }
  }, [fileNameFromQuery, state.fileName]);

  useEffect(() => {
    const fetchFileName = async () => {
      if (state.jobId && !state.fileName) {
        try {
          const response = await api.get(`/epub/job/${state.jobId}`);
          const jobData = response.data?.data || response.data;
          const name = jobData.input?.fileName ||
                       jobData.output?.fileName ||
                       jobData.fileName ||
                       'Untitled Document';
          setState(prev => ({ ...prev, fileName: name }));
        } catch (err) {
          console.error('[AcrWorkflow] Failed to fetch fileName:', err);
          setState(prev => ({ ...prev, fileName: 'Untitled Document' }));
        }
      }
    };
    fetchFileName();
  }, [state.jobId, state.fileName]);

  useEffect(() => {
    const fetchJobs = async () => {
      setIsLoadingJobs(true);
      setJobsError(null);
      try {
        const response = await api.get('/jobs');
        const jobs = response.data.data || response.data;
        const jobsWithAudit = Array.isArray(jobs) 
          ? jobs.filter((job: AuditJob) => 
              job.output?.accessibilityScore !== undefined
            )
          : [];
        setAvailableJobs(jobsWithAudit);
      } catch (error) {
        console.warn('[ACR] Failed to fetch jobs:', error);
        setJobsError('Unable to load existing jobs. You can still upload a new document.');
        setAvailableJobs([]);
      } finally {
        setIsLoadingJobs(false);
      }
    };
    fetchJobs();
  }, []);

  useEffect(() => {
    if (state.jobId) {
      saveWorkflowState(state);
    }
  }, [state]);

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

  const handleVerificationComplete = () => {
    updateState({ verificationComplete: true });
  };

  const handleFinalize = () => {
    updateState({ isFinalized: true, currentStep: 6 });
  };

  const handleRestore = (version: number) => {
    console.log('Restoring to version:', version);
  };

  const handleResetWorkflow = () => {
    localStorage.removeItem(`${STORAGE_KEY}-${state.jobId || 'new'}`);
    setState({
      currentStep: 1,
      selectedEdition: null,
      documentSource: null,
      uploadedFile: null,
      jobId: null,
      acrId: null,
      verificationComplete: false,
      isFinalized: false,
      verifications: {},
      fileName: null,
    });
  };

  const handleVerificationUpdate = (itemId: string, status: string, method: string, notes: string) => {
    updateState({
      verifications: {
        ...state.verifications,
        [itemId]: {
          status,
          method,
          notes,
          verifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        },
      },
    });
  };


  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      const newJobId = `upload-${Date.now()}`;
      updateState({ 
        documentSource: 'upload',
        uploadedFile,
        jobId: newJobId,
        acrId: `acr-${newJobId}`,
      });
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      const uploadedFile: UploadedFile = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      const newJobId = `upload-${Date.now()}`;
      updateState({ 
        documentSource: 'upload',
        uploadedFile,
        jobId: newJobId,
        acrId: `acr-${newJobId}`,
      });
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleClearFile = () => {
    updateState({ 
      documentSource: null,
      uploadedFile: null,
      jobId: null,
      acrId: null,
    });
  };

  const handleSelectExistingJob = (jobId: string) => {
    updateState({ 
      documentSource: 'existing',
      uploadedFile: null,
      jobId, 
      acrId: `acr-${jobId}`,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
              onViewCriteria={openCriteriaModal}
            />
            {state.selectedEdition && (
              <Alert variant="success">
                Selected: {state.selectedEdition.name}
              </Alert>
            )}
          </div>
        );

      case 2: {
        const getJobDisplayName = (job: AuditJob) => {
          return job.input?.fileName || job.output?.fileName || 'Untitled Document';
        };

        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Document Source</h2>
              <p className="text-gray-600">
                Upload a document or select an existing audited job.
              </p>
            </div>

            {effectiveJobId && (
              <Alert variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Document pre-selected from EPUB Audit:
                  <Badge variant="info">{effectiveJobId.slice(0, 12)}...</Badge>
                </div>
              </Alert>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={cn(
                'border rounded-lg p-6 transition-all',
                state.documentSource === 'upload' && 'ring-2 ring-primary-500 border-primary-500'
              )}>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="h-5 w-5 text-gray-500" />
                  Upload New Document
                </h3>

                {!state.uploadedFile ? (
                  <div
                    className={cn(
                      'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                      'hover:border-primary-400 hover:bg-primary-50'
                    )}
                    onDrop={handleFileDrop}
                    onDragOver={handleDragOver}
                  >
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-gray-600 mb-3">
                      Drag and drop your file here
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      Supports EPUB, PDF, and HTML files
                    </p>
                    <label className="cursor-pointer inline-block">
                      <input
                        type="file"
                        className="hidden"
                        accept=".epub,.pdf,.html,.htm"
                        onChange={handleFileUpload}
                      />
                      <span className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors">
                        Browse Files
                      </span>
                    </label>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 bg-primary-50">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <File className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-gray-900 truncate" title={state.uploadedFile.name}>
                            {state.uploadedFile.name}
                          </p>
                          <p className="text-sm text-gray-500">{formatFileSize(state.uploadedFile.size)}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={handleClearFile} className="flex-shrink-0">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className={cn(
                'border rounded-lg p-6 transition-all',
                state.documentSource === 'existing' && 'ring-2 ring-primary-500 border-primary-500'
              )}>
                <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-gray-500" />
                  Select Audited Document
                </h3>

                {isLoadingJobs ? (
                  <div className="text-center py-8 text-gray-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading available jobs...
                  </div>
                ) : jobsError ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-amber-600">{jobsError}</p>
                  </div>
                ) : availableJobs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-amber-600">
                      No audited documents found.
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Please audit a document first in EPUB Accessibility.
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                    {availableJobs.map((job) => (
                      <div
                        key={job.id}
                        className={cn(
                          'p-3 cursor-pointer transition-colors',
                          'hover:bg-gray-50',
                          state.jobId === job.id && 'bg-primary-50'
                        )}
                        onClick={() => handleSelectExistingJob(job.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm truncate" title={getJobDisplayName(job)}>
                                {getJobDisplayName(job)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(job.createdAt).toLocaleDateString()}
                                {job.output?.accessibilityScore !== undefined && 
                                  ` - Score: ${job.output.accessibilityScore}%`}
                              </p>
                            </div>
                          </div>
                          {state.jobId === job.id && (
                            <CheckCircle className="h-5 w-5 text-primary-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {state.jobId && !effectiveJobId && (
              <Alert variant="success">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {state.documentSource === 'upload' ? 'Document uploaded' : 'Job selected'}: 
                  <Badge variant="info">
                    {state.uploadedFile?.name || availableJobs.find(j => j.id === state.jobId)?.input?.fileName || state.jobId}
                  </Badge>
                </div>
              </Alert>
            )}
          </div>
        );
      }

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analysis Results</h2>
              <p className="text-gray-600">
                Review the automated accessibility analysis and confidence scores.
              </p>
            </div>
            <ConfidenceDashboard 
              jobId={state.jobId || 'demo'} 
              onCriteriaLoaded={handleCriteriaLoaded}
            />
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
              savedVerifications={state.verifications}
              onVerificationUpdate={handleVerificationUpdate}
              criteriaFromAnalysis={analysisResults}
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
      <Breadcrumbs items={[{ label: 'ACR Workflow' }]} />
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">ACR Generation Workflow</h1>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetWorkflow}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Start New
            </Button>
            <Badge variant="info">
              Step {state.currentStep} of {WORKFLOW_STEPS.length}
            </Badge>
          </div>
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

      {state.fileName && (
        <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <span className="text-sm font-medium text-gray-600">Title:</span>
            <span className="text-sm font-semibold text-gray-900 truncate" title={state.fileName}>
              {state.fileName.length > 60 ? `${state.fileName.substring(0, 57)}...` : state.fileName}
            </span>
          </div>
        </div>
      )}

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

      {showCriteriaModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="criteria-modal-title"
        >
          <div 
            ref={criteriaModalRef}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden m-4"
          >
            <div className="flex items-center justify-between p-6 border-b bg-gray-50">
              <div>
                <h2 id="criteria-modal-title" className="text-2xl font-bold text-gray-900">
                  {criteriaData?.edition.name || 'Edition Criteria'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {criteriaData?.edition.description}
                </p>
                {criteriaData && (
                  <div className="flex gap-3 mt-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                      {criteriaData.edition.standard}
                    </span>
                    <span className="text-xs px-2 py-1 bg-gray-100 text-gray-800 rounded">
                      {criteriaData.criteriaCount.total} total criteria
                    </span>
                  </div>
                )}
              </div>
              <button
                onClick={closeCriteriaModal}
                className="p-2 hover:bg-gray-200 rounded-lg transition"
                aria-label="Close criteria modal"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
              {isLoadingCriteria && (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin h-12 w-12 text-primary-600" />
                  <span className="ml-3 text-gray-600">Loading criteria...</span>
                </div>
              )}

              {criteriaError && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                  {criteriaError}
                </div>
              )}

              {criteriaData && !isLoadingCriteria && (
                <div className="space-y-6">
                  {criteriaData.criteriaByLevel.A.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white py-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded">
                          Level A
                        </span>
                        <span className="text-sm text-gray-600">
                          ({criteriaData.criteriaCount.A} criteria)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {criteriaData.criteriaByLevel.A.map((criterion) => (
                          <div
                            key={criterion.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="font-mono text-sm font-semibold text-blue-600 min-w-[60px]">
                              {criterion.number}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {criterion.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {criterion.description}
                              </div>
                              {criterion.wcagUrl && (
                                <a
                                  href={criterion.wcagUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Learn more →
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {criteriaData.criteriaByLevel.AA.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white py-2">
                        <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-semibold rounded">
                          Level AA
                        </span>
                        <span className="text-sm text-gray-600">
                          ({criteriaData.criteriaCount.AA} criteria)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {criteriaData.criteriaByLevel.AA.map((criterion) => (
                          <div
                            key={criterion.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="font-mono text-sm font-semibold text-green-600 min-w-[60px]">
                              {criterion.number}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {criterion.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {criterion.description}
                              </div>
                              {criterion.wcagUrl && (
                                <a
                                  href={criterion.wcagUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Learn more →
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {criteriaData.criteriaByLevel.AAA.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white py-2">
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-semibold rounded">
                          Level AAA
                        </span>
                        <span className="text-sm text-gray-600">
                          ({criteriaData.criteriaCount.AAA} criteria)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {criteriaData.criteriaByLevel.AAA.map((criterion) => (
                          <div
                            key={criterion.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="font-mono text-sm font-semibold text-purple-600 min-w-[60px]">
                              {criterion.number}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {criterion.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {criterion.description}
                              </div>
                              {criterion.wcagUrl && (
                                <a
                                  href={criterion.wcagUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                >
                                  Learn more →
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {criteriaData.criteriaByLevel.EU.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 mb-3 sticky top-0 bg-white py-2">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold rounded">
                          EU Specific
                        </span>
                        <span className="text-sm text-gray-600">
                          ({criteriaData.criteriaByLevel.EU.length} criteria)
                        </span>
                      </div>
                      <div className="space-y-2">
                        {criteriaData.criteriaByLevel.EU.map((criterion) => (
                          <div
                            key={criterion.id}
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                          >
                            <span className="font-mono text-sm font-semibold text-yellow-600 min-w-[60px]">
                              {criterion.number}
                            </span>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 mb-1">
                                {criterion.name}
                              </div>
                              <div className="text-xs text-gray-600">
                                {criterion.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-gray-50">
              <button
                onClick={closeCriteriaModal}
                className="w-full py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AcrWorkflowPage;
